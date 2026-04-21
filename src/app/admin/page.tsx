import { approveAllStudentRoleRequests, assignRole } from "@/app/actions/auth";
import { isInstituteEmail, requireRole, toDisplayRole } from "@/lib/auth";
import Link from "next/link";
import { getEmailFormStatusText } from "@/lib/email-id-status";
import {
  listEmailIdForms,
  type EmailFormWithApprovals,
} from "@/lib/email-id-store";
import {
  listVehicleStickerFormsForAdmin,
} from "@/lib/vehicle-sticker-store";
import { getVehicleStickerStatusText } from "@/lib/vehicle-sticker-status";
import {
  listIdentityCardCompletedForms,
  listIdentityCardFormsForStage,
} from "@/lib/identity-card-store";
import { getIdentityCardStatusText } from "@/lib/identity-card-status";
import { listGuestHouseFormsForAdmin } from "@/lib/guest-house-store";
import { getGuestHouseStatusLabel } from "@/lib/guest-house-status";
import { listHostelUndertakingFormsForAdmin } from "@/lib/hostel-undertaking-store";
import { getHostelUndertakingStatusText } from "@/lib/hostel-undertaking-status";
import { listDelegationRequestsForAdmin } from "@/lib/delegation-store";
import {
  type AppRole,
} from "@/lib/mock-db";
import { isStudentRoleRequestUser, listUsers } from "@/lib/user-store";
import { listWorkflows } from "@/lib/workflow-engine";
import { getCurrentEmailWorkflowStage } from "@/lib/email-id-workflow";
import { listCustomRoles } from "@/lib/custom-role-store";
import { BUILT_IN_ROLE_OPTIONS, getRoleLabel } from "@/lib/roles";
import { type AdminTabKey, AdminTabsClient } from "./admin-tabs-client";
import { UsersClient } from "./users-client";
import { ApprovalLogsClient } from "./approval-logs-client";
import { DelegationRequestsClient } from "./delegation-requests-client";
import { QueueTabsClient } from "./queue-tabs-client";

const ADMIN_TAB_KEYS: readonly AdminTabKey[] = [
  "role-requests",
  "delegation-requests",
  "users",
  "email-queue",
  "vehicle-queue",
  "id-card-queue",
  "guest-house-queue",
  "undertaking-queue",
  "approval-logs",
];

function isAdminTabKeyOnServer(value: string): value is AdminTabKey {
  return ADMIN_TAB_KEYS.includes(value as AdminTabKey);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    roleSearch?: string;
    userSearch?: string;
    emailQueueSearch?: string;
    vehicleQueueSearch?: string;
    idCardQueueSearch?: string;
    guestHouseQueueSearch?: string;
    undertakingQueueSearch?: string;
    approvalLogsSearch?: string;
  }>;
}) {
  const params = await searchParams;
  const { tab } = params;
  const activeTab: AdminTabKey = tab && isAdminTabKeyOnServer(tab) ? tab : "role-requests";

  const roleSearchQuery = (params.roleSearch ?? "").trim().toLowerCase();
  const approvalLogsSearchQuery = (params.approvalLogsSearch ?? "").trim().toLowerCase();



  const containsSearch = (query: string, ...values: Array<string | null | undefined>) => {
    if (!query) {
      return true;
    }
    return values.some((value) => value?.toLowerCase().includes(query));
  };

  const currentUser = await requireRole(["SYSTEM_ADMIN"]);
  const [
    users,
    emailFormsRaw,
    vehicleForms,
    identityStage1,
    identityStage2,
    identityStage3,
    identityCompleted,
    guestHouseForms,
    undertakingForms,
    workflows,
    delegationRequests,
    customRoles,
  ] = await Promise.all([
    listUsers(),
    listEmailIdForms({ includeApprovals: true }),
    listVehicleStickerFormsForAdmin(),
    listIdentityCardFormsForStage(1),
    listIdentityCardFormsForStage(2),
    listIdentityCardFormsForStage(3),
    listIdentityCardCompletedForms(),
    listGuestHouseFormsForAdmin(),
    listHostelUndertakingFormsForAdmin(),
    listWorkflows(),
    listDelegationRequestsForAdmin(),
    listCustomRoles(),
  ]);
  const emailForms = emailFormsRaw as EmailFormWithApprovals[];

  const customRoleLabels = Object.fromEntries(
    customRoles.map((role) => [role.roleCode.toUpperCase(), role.displayName])
  );
  const assignableRoleOptions = Array.from(
    new Set<AppRole>([
      ...BUILT_IN_ROLE_OPTIONS,
      ...customRoles.map((role) => role.roleCode as AppRole),
    ])
  );

  const pendingUsers = users.filter((u) => !u.role && isInstituteEmail(u.email));
  const studentPendingUsers = pendingUsers.filter((user) => isStudentRoleRequestUser(user));
  const stakeholderPendingUsers = pendingUsers.filter((user) => !isStudentRoleRequestUser(user));

  const filteredPendingUsers = pendingUsers.filter((user) =>
    containsSearch(roleSearchQuery, user.email, user.fullName ?? "", toDisplayRole(user.role))
  );
  const filteredStudentPendingUsers = studentPendingUsers.filter((user) =>
    containsSearch(roleSearchQuery, user.email, user.fullName ?? "", "student")
  );

  const emailWorkflow = workflows.find((workflow) => workflow.id === "email-id") ?? null;
  const emailFirstStage = emailWorkflow
    ? Math.min(...emailWorkflow.stages.map((stage) => stage.stage))
    : 1;

  const emailInProgressForms = emailForms.filter(
    (form) => form.status !== "ISSUED" && form.status !== "REJECTED"
  );

  const emailCurrentStageByFormId = new Map(
    emailInProgressForms.map((form) => {
      if (!emailWorkflow) {
        return [form.id, emailFirstStage] as const;
      }

      const currentStage = getCurrentEmailWorkflowStage(form, emailWorkflow);
      return [form.id, currentStage ?? emailFirstStage] as const;
    })
  );

  const emailPendingForms = emailInProgressForms.filter(
    (form) => (emailCurrentStageByFormId.get(form.id) ?? emailFirstStage) === emailFirstStage
  );
  const emailOngoingForms = emailInProgressForms.filter(
    (form) => (emailCurrentStageByFormId.get(form.id) ?? emailFirstStage) !== emailFirstStage
  );
  const emailCompletedForms = emailForms.filter((f) => f.status === "ISSUED" || f.status === "REJECTED");

  const hasDecidedApproval = (approvals: Array<{ decision: string }> | undefined) =>
    (approvals ?? []).some((approval) => approval.decision !== "pending");

  const vehiclePendingForms = vehicleForms.filter(
    (f) =>
      f.overallStatus !== "approved" &&
      f.overallStatus !== "rejected" &&
      !hasDecidedApproval(f.approvals)
  );
  const vehicleOngoingForms = vehicleForms.filter(
    (f) =>
      f.overallStatus !== "approved" &&
      f.overallStatus !== "rejected" &&
      hasDecidedApproval(f.approvals)
  );
  const vehicleCompletedForms = vehicleForms.filter(
    (f) => f.overallStatus === "approved" || f.overallStatus === "rejected"
  );

  const identityInProcess = [...identityStage1, ...identityStage2, ...identityStage3];
  const identityPendingForms = identityInProcess.filter((f) => !hasDecidedApproval(f.approvals));
  const identityOngoingForms = identityInProcess.filter((f) => hasDecidedApproval(f.approvals));

  const guestHousePendingForms = guestHouseForms.filter(
    (f) =>
      f.overallStatus !== "approved" &&
      f.overallStatus !== "rejected" &&
      !hasDecidedApproval(f.approvals)
  );
  const guestHouseOngoingForms = guestHouseForms.filter(
    (f) =>
      f.overallStatus !== "approved" &&
      f.overallStatus !== "rejected" &&
      hasDecidedApproval(f.approvals)
  );
  const guestHouseCompleted = guestHouseForms.filter(
    (f) => f.overallStatus === "approved" || f.overallStatus === "rejected"
  );

  const undertakingPendingForms = undertakingForms.filter(
    (f) =>
      f.overallStatus !== "approved" &&
      f.overallStatus !== "rejected" &&
      !hasDecidedApproval(f.approvals)
  );
  const undertakingOngoingForms = undertakingForms.filter(
    (f) =>
      f.overallStatus !== "approved" &&
      f.overallStatus !== "rejected" &&
      hasDecidedApproval(f.approvals)
  );
  const undertakingCompleted = undertakingForms.filter(
    (f) => f.overallStatus === "approved" || f.overallStatus === "rejected"
  );

  const totalPendingForms =
    emailPendingForms.length + emailOngoingForms.length +
    vehiclePendingForms.length + vehicleOngoingForms.length +
    identityInProcess.length +
    guestHousePendingForms.length + guestHouseOngoingForms.length +
    undertakingPendingForms.length + undertakingOngoingForms.length;
  const emailPendingCount = emailPendingForms.length + emailOngoingForms.length;
  const vehiclePendingCount = vehiclePendingForms.length + vehicleOngoingForms.length;
  const idPendingCount = identityInProcess.length;
  const guestHousePendingCount = guestHousePendingForms.length + guestHouseOngoingForms.length;
  const undertakingPendingCount = undertakingPendingForms.length + undertakingOngoingForms.length;

  const toRoleLabel = (roleCode: string) => getRoleLabel(roleCode, customRoleLabels);

  const toRoleGroupLabel = (group: string) =>
    group
      .split(",")
      .map((roleCode) => toRoleLabel(roleCode.trim()))
      .join(" / ");

  const getDynamicStageLabel = (workflowId: string, currentStage: number, defaultText: string) => {
    if (defaultText.toLowerCase().includes("completed") || defaultText.toLowerCase().includes("rejected")) return defaultText;
    const wf = workflows.find((w) => w.id === workflowId);
    if (!wf) return defaultText;
    const stageDef = wf.stages.find((s) => s.stage === currentStage);
    if (stageDef && stageDef.role !== "NEW_ROLE") {
      return `Pending with ${toRoleGroupLabel(stageDef.role)}`;
    }
    return defaultText;
  };

  const emailPendingRows = emailPendingForms.map((form) => ({
    id: form.id,
    writtenBy: form.submittedByEmail,
    stage: getDynamicStageLabel(
      "email-id",
      emailCurrentStageByFormId.get(form.id) ?? emailFirstStage,
      getEmailFormStatusText({ status: form.status, approvals: form.approvals })
    ),
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals.map((approval) => approval.approverName).join(", "),
  }));
  const emailOngoingRows = emailOngoingForms.map((form) => ({
    id: form.id,
    writtenBy: form.submittedByEmail,
    stage: getDynamicStageLabel(
      "email-id",
      emailCurrentStageByFormId.get(form.id) ?? emailFirstStage,
      getEmailFormStatusText({ status: form.status, approvals: form.approvals })
    ),
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals.map((approval) => approval.approverName).join(", "),
  }));
  const emailCompletedRows = emailCompletedForms.map((form) => ({
    id: form.id,
    writtenBy: form.submittedByEmail,
    stage: form.status === "ISSUED" ? "Completed - Email issued" : "Rejected",
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals.map((approval) => approval.approverName).join(", "),
  }));

  const guestHousePendingRows = guestHousePendingForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getDynamicStageLabel("guest-house", form.currentStage, getGuestHouseStatusLabel(form.overallStatus)),
    approvedBy: "-",
  }));
  const guestHouseOngoingRows = guestHouseOngoingForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getDynamicStageLabel("guest-house", form.currentStage, getGuestHouseStatusLabel(form.overallStatus)),
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals
            .filter((approval) => approval.decision === "approved")
            .map((approval) => approval.recommendationText ?? "-")
            .join(", "),
  }));
  const guestHouseCompletedRows = guestHouseCompleted.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getGuestHouseStatusLabel(form.overallStatus),
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals
            .filter((approval) => approval.decision === "approved")
            .map((approval) => approval.recommendationText ?? "-")
            .join(", "),
  }));

  const undertakingPendingRows = undertakingPendingForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getDynamicStageLabel("hostel-undertaking", form.currentStage, getHostelUndertakingStatusText(form)),
    approvedBy: "-",
  }));
  const undertakingOngoingRows = undertakingOngoingForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getDynamicStageLabel("hostel-undertaking", form.currentStage, getHostelUndertakingStatusText(form)),
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals
            .filter((approval) => approval.decision === "approved")
            .map((approval) => approval.recommendationText ?? "-")
            .join(", "),
  }));
  const undertakingCompletedRows = undertakingCompleted.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getHostelUndertakingStatusText(form),
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals
            .filter((approval) => approval.decision === "approved")
            .map((approval) => approval.recommendationText ?? "-")
            .join(", "),
  }));

  const vehiclePendingRows = vehiclePendingForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getDynamicStageLabel("vehicle-sticker", form.currentStage, getVehicleStickerStatusText(form)),
    approvedBy: "-",
  }));
  const vehicleOngoingRows = vehicleOngoingForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getDynamicStageLabel("vehicle-sticker", form.currentStage, getVehicleStickerStatusText(form)),
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals
            .filter((approval) => approval.decision === "approved")
            .map((approval) => approval.recommendationText ?? "-")
            .join(", "),
  }));
  const vehicleCompletedRows = vehicleCompletedForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getVehicleStickerStatusText(form),
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals
            .filter((approval) => approval.decision === "approved")
            .map((approval) => approval.recommendationText ?? "-")
            .join(", "),
  }));

  const identityPendingRows = identityPendingForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getDynamicStageLabel("identity-card", form.currentStage, getIdentityCardStatusText(form)),
    approvedBy: "-",
  }));
  const identityOngoingRows = identityOngoingForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getDynamicStageLabel("identity-card", form.currentStage, getIdentityCardStatusText(form)),
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals
            .filter((approval) => approval.decision === "approved")
            .map((approval) => approval.recommendationText ?? "-")
            .join(", "),
  }));
  const identityCompletedRows = identityCompleted.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: "Completed - ID card ready",
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals
            .filter((approval) => approval.decision === "approved")
            .map((approval) => approval.recommendationText ?? "-")
            .join(", "),
  }));

  const approvalLogs = [
    ...emailForms.flatMap((form) =>
      form.approvals.map((approval) => {
        const decision = approval.approverName.toLowerCase().includes("rejected")
          ? "Rejected"
          : approval.assignedEmailId
            ? "Issued"
            : "Forwarded";
        const stageLabel = approval.forwardingSection
          ? `${approval.forwardingSection.replaceAll("_", " ")} (Stage ${approval.stage})`
          : `Stage ${approval.stage}`;
        const note = approval.assignedEmailId
          ? `Assigned email: ${approval.assignedEmailId}`
          : "-";

        return {
          id: `email-${approval.id}`,
          formType: "Email ID",
          reference: form.id,
          applicant: form.submittedByEmail,
          stage: stageLabel,
          decision,
          actor: approval.approverName,
          note,
          decidedAt: approval.createdAt,
        };
      })
    ),
    ...vehicleForms.flatMap((form) =>
      form.approvals
        .filter((approval) => approval.decision !== "pending")
        .map((approval) => ({
          id: `vehicle-${form.submissionId}-${approval.stageNumber}`,
          formType: "Vehicle Sticker",
          reference: form.submissionId,
          applicant: form.submittedByEmail,
          stage: approval.stageName,
          decision: approval.decision,
          actor: approval.recommendationText ?? "-",
          note: approval.recommendationText ?? "-",
          decidedAt: approval.decidedAt,
        }))
    ),
    ...identityInProcess
      .concat(identityCompleted)
      .flatMap((form) =>
        form.approvals
          .filter((approval) => approval.decision !== "pending")
          .map((approval) => ({
            id: `identity-${form.submissionId}-${approval.stageNumber}`,
            formType: "Identity Card",
            reference: form.submissionId,
            applicant: form.submittedByEmail,
            stage: approval.stageName,
            decision: approval.decision,
            actor: approval.recommendationText ?? "-",
            note: approval.recommendationText ?? "-",
            decidedAt: approval.decidedAt,
          }))
      ),
    ...guestHouseForms.flatMap((form) =>
      form.approvals
        .filter((approval) => approval.decision !== "pending")
        .map((approval) => ({
          id: `guest-${form.submissionId}-${approval.stageNumber}`,
          formType: "Guest House",
          reference: form.submissionId,
          applicant: form.submittedByEmail,
          stage: approval.stageName,
          decision: approval.decision,
          actor: approval.recommendationText ?? "-",
          note: approval.recommendationText ?? "-",
          decidedAt: approval.decidedAt,
        }))
    ),
  ]
    .filter((log) =>
      containsSearch(
        approvalLogsSearchQuery,
        log.formType,
        log.reference,
        log.applicant,
        log.stage,
        log.decision,
        log.actor,
        log.note,
        log.decidedAt ? log.decidedAt.toISOString() : ""
      )
    )
    .sort((a, b) => {
      const left = a.decidedAt ? a.decidedAt.getTime() : 0;
      const right = b.decidedAt ? b.decidedAt.getTime() : 0;
      return right - left;
    });

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <main className="mx-auto max-w-7xl space-y-6">
        <section>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-5xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
              <p className="mt-2 text-2xl text-slate-500">
                Approve user role requests and monitor pending workflows
              </p>
              <p className="mt-2 text-sm text-slate-500">Signed in as {currentUser.email}</p>
            </div>
            <Link prefetch={false}
              href="/admin/workflows"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
              Workflow Visualizer
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pending Role Requests" value={pendingUsers.length} accent="text-amber-600" />
          <StatCard label="All Pending Forms" value={totalPendingForms} accent="text-amber-600" />
          <StatCard label="Email Forms" value={emailPendingCount} accent="text-slate-900" />
          <StatCard label="Vehicle Forms" value={vehiclePendingCount} accent="text-slate-900" />
          <StatCard label="Identity Forms" value={idPendingCount} accent="text-slate-900" />
          <StatCard label="Guest House" value={guestHousePendingCount} accent="text-slate-900" />
          <StatCard label="Undertaking" value={undertakingPendingCount} accent="text-slate-900" />
        </section>

        <AdminTabsClient 
          initialTab={activeTab}
          sections={{
            "role-requests": (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-3xl font-semibold text-slate-900">User Role Requests</h2>
                  <p className="text-sm text-slate-500">
                    Pending role requests: <span className="font-semibold text-slate-800">{filteredPendingUsers.length}</span>
                  </p>
                </div>

                <div className="mb-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Bulk student approval</p>
                    <p className="mt-1 text-xs text-emerald-800">
                      Pending student requests: <span className="font-semibold">{filteredStudentPendingUsers.length}</span>
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      This assigns Student role to all pending requests tagged as student during signup.
                    </p>
                  </div>
                  <form action={approveAllStudentRoleRequests} className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-medium text-emerald-900">
                      <input
                        name="approveAllStudentRequests"
                        type="checkbox"
                        className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Approve all student requests
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Apply
                    </button>
                  </form>
                </div>

                <form action="/admin" method="get" className="mb-4 flex items-center gap-2">
                  <input type="hidden" name="tab" value="role-requests" />
                  <input
                    name="roleSearch"
                    defaultValue={params.roleSearch ?? ""}
                    className="input max-w-65"
                    placeholder="Search role requests"
                  />
                  <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                    Search
                  </button>
                </form>

                <div className="space-y-3">
                  {filteredPendingUsers.length === 0 ? (
                    <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      No pending role requests.
                    </p>
                  ) : (
                    filteredPendingUsers.map((user) => {
                      const showStudentBadge = isStudentRoleRequestUser(user);

                      return (
                      <div
                        key={user.id}
                        className={`rounded-xl px-4 py-4 ${
                          showStudentBadge
                            ? "border border-emerald-100 bg-emerald-50/40"
                            : "border border-slate-100 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xl font-semibold text-slate-900">{user.email}</p>
                          {showStudentBadge ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                              Student
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Requested: {new Date(user.createdAt).toLocaleString("en-IN")}
                        </p>
                        <div className="mt-3">
                          <form action={assignRole} className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="userId" value={user.id} />
                            <select
                              name="role"
                              defaultValue=""
                              className="input max-w-65"
                              required
                            >
                              <option value="" disabled>
                                Select role
                              </option>
                              {assignableRoleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {toRoleLabel(role)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                    })
                  )}
                </div>
              </section>
            ),
            "users": (
              <UsersClient
                initialUsers={users}
                customRoleLabels={customRoleLabels}
              />
            ),
            "delegation-requests": (
              <DelegationRequestsClient requests={delegationRequests} users={users} />
            ),
            "email-queue": (
              <QueueTabsClient
                title="Email Queue"
                pendingRows={emailPendingRows}
                ongoingRows={emailOngoingRows}
                completedRows={emailCompletedRows}
                defaultSearchQuery={params.emailQueueSearch ?? ""}
              />
            ),
            "guest-house-queue": (
              <QueueTabsClient
                title="Guest House Queue"
                pendingRows={guestHousePendingRows}
                ongoingRows={guestHouseOngoingRows}
                completedRows={guestHouseCompletedRows}
                defaultSearchQuery={params.guestHouseQueueSearch ?? ""}
              />
            ),
            "vehicle-queue": (
              <QueueTabsClient
                title="Vehicle Queue"
                pendingRows={vehiclePendingRows}
                ongoingRows={vehicleOngoingRows}
                completedRows={vehicleCompletedRows}
                defaultSearchQuery={params.vehicleQueueSearch ?? ""}
              />
            ),
            "id-card-queue": (
              <QueueTabsClient
                title="ID Card Queue"
                pendingRows={identityPendingRows}
                ongoingRows={identityOngoingRows}
                completedRows={identityCompletedRows}
                defaultSearchQuery={params.idCardQueueSearch ?? ""}
              />
            ),
            "approval-logs": (
              <ApprovalLogsClient initialLogs={approvalLogs} />
            ),
            "undertaking-queue": (
              <QueueTabsClient
                title="Undertaking Queue"
                pendingRows={undertakingPendingRows}
                ongoingRows={undertakingOngoingRows}
                completedRows={undertakingCompletedRows}
                defaultSearchQuery={params.undertakingQueueSearch ?? ""}
              />
            )
          }}
        />
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-3 text-5xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
