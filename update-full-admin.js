const fs = require('fs');

const pageContent = `import { assignRole } from "@/app/actions/auth";
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
import {
  type AppRole,
} from "@/lib/mock-db";
import { listUsers } from "@/lib/user-store";

const ROLE_OPTIONS: AppRole[] = [
  "STUDENT",
  "INTERN",
  "EMPLOYEE",
  "HOSTEL_WARDEN",
  "SUPERVISOR",
  "SECTION_HEAD",
  "HOD",
  "REGISTRAR",
  "DEAN_FAA",
  "DIRECTOR",
  "DEPUTY_DEAN",
  "STUDENT_AFFAIRS_HOSTEL_MGMT",
  "SECURITY_OFFICE",
  "FORWARDING_AUTHORITY_ACADEMICS",
  "ESTABLISHMENT",
  "FORWARDING_AUTHORITY_R_AND_D",
  "GUEST_HOUSE_INCHARGE",
  "GUEST_HOUSE_COMMITTEE_CHAIR",
  "IT_ADMIN",
  "SYSTEM_ADMIN",
];

const ADMIN_TABS = [
  { key: "role-requests", label: "Role Requests" },
  { key: "users", label: "Users" },
  { key: "email-queue", label: "Email Queue" },
  { key: "vehicle-queue", label: "Vehicle Queue" },
  { key: "id-card-queue", label: "ID Card Queue" },
  { key: "guest-house-queue", label: "Guest House Queue" },
  { key: "undertaking-queue", label: "Undertaking Queue" },
  { key: "approval-logs", label: "Approval Logs" },
] as const;

type AdminTabKey = (typeof ADMIN_TABS)[number]["key"];

function isAdminTabKey(value: string): value is AdminTabKey {
  return ADMIN_TABS.some((tab) => tab.key === value);
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
    approvalLogsSearch?: string;
  }>;
}) {
  const params = await searchParams;
  const { tab } = params;
  const activeTab: AdminTabKey = tab && isAdminTabKey(tab) ? tab : "role-requests";

  const roleSearchQuery = (params.roleSearch ?? "").trim().toLowerCase();
  const userSearchQuery = (params.userSearch ?? "").trim().toLowerCase();
  const emailQueueSearchQuery = (params.emailQueueSearch ?? "").trim().toLowerCase();
  const vehicleQueueSearchQuery = (params.vehicleQueueSearch ?? "").trim().toLowerCase();
  const idCardQueueSearchQuery = (params.idCardQueueSearch ?? "").trim().toLowerCase();
  const guestHouseQueueSearchQuery = (params.guestHouseQueueSearch ?? "").trim().toLowerCase();
  const approvalLogsSearchQuery = (params.approvalLogsSearch ?? "").trim().toLowerCase();

  const buildTabHref = (tabKey: AdminTabKey) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && value.length > 0) {
        next.set(key, value);
      }
    }
    next.set("tab", tabKey);
    return \`/admin?\${next.toString()}\`;
  };

  const containsSearch = (query: string, ...values: Array<string | null | undefined>) => {
    if (!query) {
      return true;
    }
    return values.some((value) => value?.toLowerCase().includes(query));
  };

  const currentUser = await requireRole(["SYSTEM_ADMIN"]);
  const users = await listUsers();
  const emailForms = (await listEmailIdForms({
    includeApprovals: true,
  })) as EmailFormWithApprovals[];
  const vehicleForms = await listVehicleStickerFormsForAdmin();
  const identityStage1 = await listIdentityCardFormsForStage(1);
  const identityStage2 = await listIdentityCardFormsForStage(2);
  const identityStage3 = await listIdentityCardFormsForStage(3);
  const identityCompleted = await listIdentityCardCompletedForms();
  const guestHouseForms = await listGuestHouseFormsForAdmin();

  const pendingUsers = users.filter((u) => !u.role && isInstituteEmail(u.email));
  const filteredPendingUsers = pendingUsers.filter((user) =>
    containsSearch(roleSearchQuery, user.email, user.fullName ?? "", toDisplayRole(user.role))
  );
  const filteredUsers = users.filter((user) =>
    containsSearch(userSearchQuery, user.email, user.fullName ?? "", toDisplayRole(user.role))
  );

  const emailPendingForms = emailForms.filter((f) => f.status === "PENDING");
  const emailOngoingForms = emailForms.filter((f) => f.status === "FORWARDED");
  const emailCompletedForms = emailForms.filter((f) => f.status === "ISSUED" || f.status === "REJECTED");

  const vehiclePendingForms = vehicleForms.filter(
    (f) => f.overallStatus !== "approved" && f.overallStatus !== "rejected" && f.approvals.length === 0
  );
  const vehicleOngoingForms = vehicleForms.filter(
    (f) => f.overallStatus !== "approved" && f.overallStatus !== "rejected" && f.approvals.length > 0
  );
  const vehicleCompletedForms = vehicleForms.filter(
    (f) => f.overallStatus === "approved" || f.overallStatus === "rejected"
  );

  const identityInProcess = [...identityStage1, ...identityStage2, ...identityStage3];
  const identityPendingForms = identityInProcess.filter((f) => (f.approvals?.length ?? 0) === 0);
  const identityOngoingForms = identityInProcess.filter((f) => (f.approvals?.length ?? 0) > 0);

  const guestHousePendingForms = guestHouseForms.filter(
    (f) => f.overallStatus !== "approved" && f.overallStatus !== "rejected" && f.approvals.length === 0
  );
  const guestHouseOngoingForms = guestHouseForms.filter(
    (f) => f.overallStatus !== "approved" && f.overallStatus !== "rejected" && f.approvals.length > 0
  );
  const guestHouseCompleted = guestHouseForms.filter(
    (f) => f.overallStatus === "approved" || f.overallStatus === "rejected"
  );

  const totalPendingForms =
    emailPendingForms.length + emailOngoingForms.length +
    vehiclePendingForms.length + vehicleOngoingForms.length +
    identityInProcess.length +
    guestHousePendingForms.length + guestHouseOngoingForms.length;
  const emailPendingCount = emailPendingForms.length + emailOngoingForms.length;
  const vehiclePendingCount = vehiclePendingForms.length + vehicleOngoingForms.length;
  const idPendingCount = identityInProcess.length;
  const guestHousePendingCount = guestHousePendingForms.length + guestHouseOngoingForms.length;
  const undertakingPendingCount = 0;

  const emailPendingRows = emailPendingForms.map((form) => ({
    id: form.id,
    writtenBy: form.submittedByEmail,
    stage: getEmailFormStatusText({ status: form.status, approvals: form.approvals }),
    approvedBy:
      form.approvals.length === 0
        ? "-"
        : form.approvals.map((approval) => approval.approverName).join(", "),
  }));
  const emailOngoingRows = emailOngoingForms.map((form) => ({
    id: form.id,
    writtenBy: form.submittedByEmail,
    stage: getEmailFormStatusText({ status: form.status, approvals: form.approvals }),
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
    stage: getGuestHouseStatusLabel(form.overallStatus),
    approvedBy: "-",
  }));
  const guestHouseOngoingRows = guestHouseOngoingForms.map((form) => ({
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

  const vehiclePendingRows = vehiclePendingForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getVehicleStickerStatusText(form),
    approvedBy: "-",
  }));
  const vehicleOngoingRows = vehicleOngoingForms.map((form) => ({
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
    stage: getIdentityCardStatusText(form),
    approvedBy: "-",
  }));
  const identityOngoingRows = identityOngoingForms.map((form) => ({
    id: form.submissionId,
    writtenBy: form.submittedByEmail,
    stage: getIdentityCardStatusText(form),
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

  const filterQueueRows = (
    rows: Array<{ id: string; writtenBy: string; stage: string; approvedBy: string }>,
    query: string
  ) => rows.filter((row) => containsSearch(query, row.id, row.writtenBy, row.stage, row.approvedBy));

  const filteredEmailPendingRows = filterQueueRows(emailPendingRows, emailQueueSearchQuery);
  const filteredEmailOngoingRows = filterQueueRows(emailOngoingRows, emailQueueSearchQuery);
  const filteredEmailCompletedRows = filterQueueRows(emailCompletedRows, emailQueueSearchQuery);

  const filteredVehiclePendingRows = filterQueueRows(vehiclePendingRows, vehicleQueueSearchQuery);
  const filteredVehicleOngoingRows = filterQueueRows(vehicleOngoingRows, vehicleQueueSearchQuery);
  const filteredVehicleCompletedRows = filterQueueRows(vehicleCompletedRows, vehicleQueueSearchQuery);

  const filteredIdentityPendingRows = filterQueueRows(identityPendingRows, idCardQueueSearchQuery);
  const filteredIdentityOngoingRows = filterQueueRows(identityOngoingRows, idCardQueueSearchQuery);
  const filteredIdentityCompletedRows = filterQueueRows(identityCompletedRows, idCardQueueSearchQuery);

  const filteredGuestHousePendingRows = filterQueueRows(guestHousePendingRows, guestHouseQueueSearchQuery);
  const filteredGuestHouseOngoingRows = filterQueueRows(guestHouseOngoingRows, guestHouseQueueSearchQuery);
  const filteredGuestHouseCompletedRows = filterQueueRows(guestHouseCompletedRows, guestHouseQueueSearchQuery);

  const approvalLogs = [
    ...emailForms.flatMap((form) =>
      form.approvals.map((approval) => {
        const decision = approval.approverName.toLowerCase().includes("rejected")
          ? "Rejected"
          : approval.assignedEmailId
            ? "Issued"
            : "Forwarded";
        const stageLabel = approval.forwardingSection
          ? \`\${approval.forwardingSection.replaceAll("_", " ")} (Stage \${approval.stage})\`
          : \`Stage \${approval.stage}\`;
        const note = approval.assignedEmailId
          ? \`Assigned email: \${approval.assignedEmailId}\`
          : "-";

        return {
          id: \`email-\${approval.id}\`,
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
          id: \`vehicle-\${form.submissionId}-\${approval.stageNumber}\`,
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
            id: \`identity-\${form.submissionId}-\${approval.stageNumber}\`,
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
          id: \`guest-\${form.submissionId}-\${approval.stageNumber}\`,
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
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-2 text-2xl text-slate-500">
            Approve user role requests and monitor pending workflows
          </p>
          <p className="mt-2 text-sm text-slate-500">Signed in as {currentUser.email}</p>
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

        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex min-w-[980px] gap-3">
            {ADMIN_TABS.map((tab) => (
              <Link prefetch={false}
                key={tab.key}
                href={buildTabHref(tab.key)}
                className={
                  activeTab === tab.key
                    ? "rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white"
                    : "rounded-xl px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                }
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </section>

        {activeTab === "role-requests" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-semibold text-slate-900">User Role Requests</h2>
              <p className="text-sm text-slate-500">
                Pending role requests: <span className="font-semibold text-slate-800">{filteredPendingUsers.length}</span>
              </p>
            </div>

            <form action="/admin" method="get" className="mb-4 flex items-center gap-2">
              <input type="hidden" name="tab" value="role-requests" />
              <input
                name="roleSearch"
                defaultValue={params.roleSearch ?? ""}
                className="input max-w-[260px]"
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
                filteredPendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <p className="text-xl font-semibold text-slate-900">{user.email}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Requested: {new Date(user.createdAt).toLocaleString("en-IN")}
                    </p>
                    <div className="mt-3">
                      <form action={assignRole} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="role"
                          defaultValue=""
                          className="input max-w-[260px]"
                          required
                        >
                          <option value="" disabled>
                            Select role
                          </option>
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {toDisplayRole(role)}
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
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "users" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-semibold text-slate-900">Users</h2>
              <p className="text-sm text-slate-500">Total users: <span className="font-semibold text-slate-800">{filteredUsers.length}</span></p>
            </div>

            <form action="/admin" method="get" className="mb-4 flex items-center gap-2">
              <input type="hidden" name="tab" value="users" />
              <input
                name="userSearch"
                defaultValue={params.userSearch ?? ""}
                className="input max-w-[260px]"
                placeholder="Search users"
              />
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                Search
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-3 font-medium text-slate-900">{user.email}</td>
                      <td className="px-5 py-3 text-slate-700">{user.fullName ?? "-"}</td>
                      <td className="px-5 py-3 text-slate-700">{toDisplayRole(user.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "email-queue" && (
          <QueueTabs
            title="Email Queue"
            pendingRows={filteredEmailPendingRows}
            ongoingRows={filteredEmailOngoingRows}
            completedRows={filteredEmailCompletedRows}
            searchQuery={params.emailQueueSearch ?? ""}
            searchParamName="emailQueueSearch"
          />
        )}

        {activeTab === "guest-house-queue" && (
          <QueueTabs
            title="Guest House Queue"
            pendingRows={filteredGuestHousePendingRows}
            ongoingRows={filteredGuestHouseOngoingRows}
            completedRows={filteredGuestHouseCompletedRows}
            searchQuery={params.guestHouseQueueSearch ?? ""}
            searchParamName="guestHouseQueueSearch"
          />
        )}

        {activeTab === "vehicle-queue" && (
          <QueueTabs
            title="Vehicle Queue"
            pendingRows={filteredVehiclePendingRows}
            ongoingRows={filteredVehicleOngoingRows}
            completedRows={filteredVehicleCompletedRows}
            searchQuery={params.vehicleQueueSearch ?? ""}
            searchParamName="vehicleQueueSearch"
          />
        )}

        {activeTab === "id-card-queue" && (
          <QueueTabs
            title="ID Card Queue"
            pendingRows={filteredIdentityPendingRows}
            ongoingRows={filteredIdentityOngoingRows}
            completedRows={filteredIdentityCompletedRows}
            searchQuery={params.idCardQueueSearch ?? ""}
            searchParamName="idCardQueueSearch"
          />
        )}

        {activeTab === "approval-logs" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-semibold text-slate-900">Approval Logs</h2>
              <p className="text-sm text-slate-500">
                Total logs: <span className="font-semibold text-slate-800">{approvalLogs.length}</span>
              </p>
            </div>

            <form action="/admin" method="get" className="mb-4 flex items-center gap-2">
              <input type="hidden" name="tab" value="approval-logs" />
              <input
                name="approvalLogsSearch"
                defaultValue={params.approvalLogsSearch ?? ""}
                className="input max-w-[320px]"
                placeholder="Search approval logs"
              />
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                Search
              </button>
            </form>

            {approvalLogs.length === 0 ? (
              <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No approval logs found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1160px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Form</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3">Applicant</th>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3">Decision</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvalLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {log.decidedAt ? new Date(log.decidedAt).toLocaleString("en-IN") : "-"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{log.formType}</td>
                        <td className="px-4 py-3 text-slate-700">{log.reference}</td>
                        <td className="px-4 py-3 text-slate-700">{log.applicant}</td>
                        <td className="px-4 py-3 text-slate-700">{log.stage}</td>
                        <td className="px-4 py-3 text-slate-700 capitalize">{log.decision}</td>
                        <td className="px-4 py-3 text-slate-700">{log.actor}</td>
                        <td className="px-4 py-3 text-slate-700">{log.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab !== "role-requests" &&
          activeTab !== "users" &&
          activeTab !== "email-queue" &&
          activeTab !== "vehicle-queue" &&
          activeTab !== "id-card-queue" &&
          activeTab !== "guest-house-queue" &&
          activeTab !== "approval-logs" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">{ADMIN_TABS.find((tab) => tab.key === activeTab)?.label}</h2>
              <p className="mt-2 text-sm text-slate-500">This section UI is ready. Queue data wiring for this tab will be added next.</p>
            </section>
          )}
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
      <p className={\`mt-3 text-5xl font-bold \${accent}\`}>{value}</p>
    </div>
  );
}

function QueueTabs({
  title,
  pendingRows,
  ongoingRows,
  completedRows,
  searchQuery,
  searchParamName,
}: {
  title: string;
  pendingRows: Array<{ id: string; writtenBy: string; stage: string; approvedBy: string }>;
  ongoingRows: Array<{ id: string; writtenBy: string; stage: string; approvedBy: string }>;
  completedRows: Array<{ id: string; writtenBy: string; stage: string; approvedBy: string }>;
  searchQuery: string;
  searchParamName: "emailQueueSearch" | "vehicleQueueSearch" | "idCardQueueSearch" | "guestHouseQueueSearch";
}) {
  const tabs: Array<{ key: "pending" | "ongoing" | "completed"; label: string; rows: typeof pendingRows }> = [
    { key: "pending", label: \`Pending (\${pendingRows.length})\`, rows: pendingRows },
    { key: "ongoing", label: \`Ongoing (\${ongoingRows.length})\`, rows: ongoingRows },
    { key: "completed", label: \`Completed (\${completedRows.length})\`, rows: completedRows },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Queue</p>
          <p className="text-xl font-semibold text-slate-900">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action="/admin" method="get" className="flex items-center gap-2">
            <input type="hidden" name="tab" value={
              title === "Email Queue"
                ? "email-queue"
                : title === "Vehicle Queue"
                  ? "vehicle-queue"
                  : title === "ID Card Queue"
                    ? "id-card-queue"
                    : "guest-house-queue"
            } />
            <input
              name={searchParamName}
              defaultValue={searchQuery}
              className="input max-w-[260px]"
              placeholder={\`Search \${title.toLowerCase()}\`}
            />
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black">
              Search
            </button>
          </form>
          {tabs.map((tab) => (
            <span
              key={tab.key}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {tab.label}
            </span>
          ))}
        </div>
      </div>

      {tabs.map((tab, index) => (
        <div key={tab.key} className={index === 0 ? "" : "border-t border-slate-100"}>
          {tab.rows.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">No items in this state.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Written By</th>
                    <th className="px-5 py-3">Stage</th>
                    <th className="px-5 py-3">Approved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tab.rows.map((row) => (
                    <tr key={\`\${tab.key}-\${row.id}\`}>
                      <td className="px-5 py-3 font-medium text-slate-800">{row.id}</td>
                      <td className="px-5 py-3 text-slate-700">{row.writtenBy}</td>
                      <td className="px-5 py-3 text-slate-700">{row.stage}</td>
                      <td className="px-5 py-3 text-slate-700">{row.approvedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
\`;

fs.writeFileSync('src/app/admin/page.tsx', pageContent.replace(/\\\\/g, '\\\\'));
console.log('Restoration complete');
