import { getDashboardPathForUser, getQueueRoleForUser, requireUser } from "@/lib/auth";
import { getEmailIdFormById } from "@/lib/email-id-store";
import {
  getEmailFormStatusBadgeClass,
  getEmailFormStatusText,
} from "@/lib/email-id-status";
import {
  getCurrentEmailWorkflowStage,
  getSortedWorkflowStages,
  roleCanApproveStage,
  roleGroupToLabel,
  stageRequiresIssuanceFields,
} from "@/lib/email-id-workflow";
import { getWorkflow } from "@/lib/workflow-engine";
import { getRoleLabel } from "@/lib/roles";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ForwardingAuthorityPanel,
  ITAdminPanel,
} from "./approval-panels";

import { PrintButton } from "@/components/ui/print-button";

const SECTION_LABELS: Record<string, string> = {
  ACADEMICS: "Academics",
  ESTABLISHMENT: "Establishment",
  RESEARCH_AND_DEVELOPMENT: "Research & Development",
};

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}

export default async function EmailIdDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "email-id",
  });
  const activeRole = queueRole.activeRole;

  if (!activeRole) {
    notFound();
  }

  const { id } = await params;
  const { embed } = await searchParams;
  const isEmbedMode = embed === "1" || embed === "true";
  const form = await getEmailIdFormById(id);
  const dashboardHref = await getDashboardPathForUser(user.id, user.role);

  if (!form) notFound();

  const workflow = await getWorkflow("email-id");
  if (!workflow) {
    throw new Error("Email workflow blueprint not found in database.");
  }

  const sortedStages = getSortedWorkflowStages(workflow);
  const currentStage = getCurrentEmailWorkflowStage(form, workflow);
  const currentStageDef =
    currentStage === null ? null : sortedStages.find((stage) => stage.stage === currentStage) ?? null;
  const canActOnCurrentStage =
    currentStageDef !== null &&
    (activeRole === "SYSTEM_ADMIN" || roleCanApproveStage(currentStageDef, activeRole ?? null));
  const showIssuancePanel =
    canActOnCurrentStage &&
    currentStage !== null &&
    stageRequiresIssuanceFields(workflow, currentStage);
  const showForwardingPanel = canActOnCurrentStage && !showIssuancePanel;
  const approvalByStage = new Map(form.approvals.map((approval) => [approval.stage, approval]));

  return (
    <div className="app-canvas bg-[linear-gradient(135deg,#0b1324_0%,#0f172a_35%,#0b1720_70%,#0b1120_100%)]">
      {isEmbedMode ? (
        <style>{`.print-hidden{display:none!important;}.app-content{padding-top:0!important;}.app-canvas{background:#ffffff!important;}.app-grid,.app-aurora{display:none!important;}`}</style>
      ) : null}
      <div className="app-grid" />
      <div className="app-aurora app-aurora-a" />
      <div className="app-aurora app-aurora-b" />
      <div className="app-aurora app-aurora-c" />
      <div className="app-content page-enter px-4 py-16">
        <div className="mx-auto max-w-4xl space-y-7">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Link prefetch={false} href={dashboardHref} className="back-link text-gray-800">
              Email ID Requests
            </Link>
            <span className="text-gray-400">/</span>
            <span className="font-semibold text-white">
              {form.initials} {form.firstName} {form.lastName}
            </span>
          </div>

          <div className="section-glass rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Email ID Request
                </p>
                <h1 className="electric-title text-3xl font-black leading-tight">
                  {form.initials} {form.firstName} {form.lastName}
                </h1>
                <p className="mt-2 text-sm font-medium text-gray-600">
                  Ref: {form.id} · Submitted {new Date(form.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!isEmbedMode ? <PrintButton /> : null}
                <span
                  className={`pill-badge bg-white/80 text-gray-900 ${getEmailFormStatusBadgeClass(form.status)}`}
                >
                  {getEmailFormStatusText({ status: form.status, approvals: form.approvals })}
                </span>
              </div>
            </div>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-800">
              Personal Details
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Gender" value={form.gender} />
              <Field label="Org / Roll ID" value={form.orgId} />
              <Field label="Permanent Address" value={form.permanentAddress} />
            </dl>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-800">
              Employment Details
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Nature of Engagement" value={form.natureOfEngagement} />
              <Field label="Role" value={form.role} />
              <Field label="Department" value={form.department} />
              {form.projectName && <Field label="Project Name" value={form.projectName} />}
              {form.joiningDate && (
                <Field label="Joining Date" value={new Date(form.joiningDate).toLocaleDateString("en-IN")} />
              )}
              {form.anticipatedEndDate && (
                <Field
                  label="Anticipated End Date"
                  value={new Date(form.anticipatedEndDate).toLocaleDateString("en-IN")}
                />
              )}
              {form.reportingOfficerName && <Field label="Reporting Officer" value={form.reportingOfficerName} />}
              {form.reportingOfficerEmail && <Field label="Reporting Officer Email" value={form.reportingOfficerEmail} />}
            </dl>

            <h2 className="mb-4 mt-6 text-sm font-semibold uppercase tracking-wider text-gray-800">
              Alternate Contact
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile" value={form.mobileNo} />
              <Field label="Alternate Email" value={form.alternateEmail} />
            </dl>
          </div>

          {form.approvals.length > 0 && (
            <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-800">
                Approvals
              </h2>
              <div className="space-y-4">
                {sortedStages.map((stage) => {
                  const approval = approvalByStage.get(stage.stage);
                  if (!approval) {
                    return null;
                  }

                  return (
                    <div
                      key={stage.stage}
                      className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm shadow-sm"
                    >
                      <p className="font-semibold text-amber-900">
                        Stage {stage.stage} — {roleGroupToLabel(stage.role, getRoleLabel, stage.mode === "AND" ? "AND" : "OR")}
                      </p>
                      <p className="mt-1 text-slate-800">
                        By {approval.approverName}
                        {approval.forwardingSection ? ` (${SECTION_LABELS[approval.forwardingSection]})` : ""}
                        {" "}on {new Date(approval.createdAt).toLocaleString("en-IN")}
                      </p>
                      {approval.assignedEmailId ? (
                        <dl className="mt-2 grid gap-2 text-slate-800 sm:grid-cols-2">
                          <div>
                            <span className="font-medium">Assigned Email: </span>
                            <span className="font-mono text-indigo-800">{approval.assignedEmailId}</span>
                          </div>
                          <div>
                            <span className="font-medium">Created by: </span>
                            {approval.idCreatedBy}
                          </div>
                        </dl>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showForwardingPanel && (
            <ForwardingAuthorityPanel
              formId={form.id}
              stageNumber={currentStage ?? 1}
              stageLabel={
                currentStageDef
                  ? roleGroupToLabel(
                      currentStageDef.role,
                      getRoleLabel,
                      currentStageDef.mode === "AND" ? "AND" : "OR"
                    )
                  : "Review"
              }
              fixedSection={activeRole === "FORWARDING_AUTHORITY_ACADEMICS"
                ? "ACADEMICS"
                : activeRole === "ESTABLISHMENT"
                  ? "ESTABLISHMENT"
                  : activeRole === "FORWARDING_AUTHORITY_R_AND_D"
                    ? "RESEARCH_AND_DEVELOPMENT"
                    : undefined}
            />
          )}
          {showIssuancePanel && (
            <ITAdminPanel
              formId={form.id}
              stageNumber={currentStage ?? sortedStages.length}
              stageLabel={
                currentStageDef
                  ? roleGroupToLabel(
                      currentStageDef.role,
                      getRoleLabel,
                      currentStageDef.mode === "AND" ? "AND" : "OR"
                    )
                  : "Final Issuance"
              }
            />
          )}

          {form.status === "ISSUED" && (
            <div className="section-glass rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-4 text-sm font-semibold text-emerald-900 shadow-lg">
              ✅ This request has been fully processed and the email ID has been issued.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
