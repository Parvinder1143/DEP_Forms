import { requireUser } from "@/lib/auth";
import { getEmailIdFormById } from "@/lib/email-id-store";
import {
  getEmailFormStatusBadgeClass,
  getEmailFormStatusText,
  getForwardingSectionLabel,
} from "@/lib/email-id-status";
import {
  getCurrentEmailWorkflowStage,
  getSortedWorkflowStages,
  roleGroupToLabel,
} from "@/lib/email-id-workflow";
import { getWorkflow } from "@/lib/workflow-engine";
import { getRoleLabel } from "@/lib/roles";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/ui/print-button";

export default async function EmailIdStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { embed } = await searchParams;
  const isEmbedMode = embed === "1" || embed === "true";
  const form = await getEmailIdFormById(id);

  if (!form) notFound();

  const canReviewAny =
    user.role === "FORWARDING_AUTHORITY_ACADEMICS" ||
    user.role === "ESTABLISHMENT" ||
    user.role === "FORWARDING_AUTHORITY_R_AND_D" ||
    user.role === "IT_ADMIN" ||
    user.role === "SYSTEM_ADMIN";
  if (!canReviewAny && form.submittedById !== user.id) {
    redirect("/");
  }

  const workflow = await getWorkflow("email-id");
  if (!workflow) {
    throw new Error("Email workflow blueprint not found in database.");
  }

  const sortedStages = getSortedWorkflowStages(workflow);
  const currentStage = getCurrentEmailWorkflowStage(form, workflow);
  const approvalByStage = new Map(form.approvals.map((approval) => [approval.stage, approval]));
  const currentStageDef =
    currentStage === null ? null : sortedStages.find((stage) => stage.stage === currentStage) ?? null;
  const statusDescription =
    form.status === "ISSUED"
      ? "Your IIT Ropar email ID has been created successfully. See details below."
      : form.status === "REJECTED"
        ? "Your request has been rejected. Please check the remarks in the approval timeline."
        : currentStageDef
          ? `Your request is awaiting review by ${roleGroupToLabel(
              currentStageDef.role,
              getRoleLabel,
              currentStageDef.mode === "AND" ? "AND" : "OR"
            )}.`
          : "Your request is being processed.";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      {isEmbedMode ? (
        <style>{`.print-hidden{display:none!important;}.app-content{padding-top:0!important;}`}</style>
      ) : null}
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              IIT Ropar — Email ID Request
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Application Status
            </h1>
            <p className="mt-1 text-sm text-slate-500">Reference ID: {form.id}</p>
          </div>
          {!isEmbedMode ? <PrintButton /> : null}
        </div>

        {/* Status Banner */}
        <div className={`rounded-xl px-5 py-4 ${getEmailFormStatusBadgeClass(form.status)}`}>
          <p className="font-semibold">
            {getEmailFormStatusText({ status: form.status, approvals: form.approvals })}
          </p>
          <p className="mt-0.5 text-sm">{statusDescription}</p>
        </div>

        {/* Stage Tracker */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-700">
            Approval Progress
          </h2>
          <ol className="relative border-l border-slate-200 space-y-8 ml-3">
            {/* Stage 0: Submitted */}
            <li className="ml-6">
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-white text-white text-xs font-bold">
                ✓
              </span>
              <p className="font-medium text-slate-900">Form Submitted</p>
              <p className="text-sm text-slate-500">
                {new Date(form.createdAt).toLocaleString("en-IN")}
              </p>
            </li>

            {sortedStages.map((stage, index) => {
              const approval = approvalByStage.get(stage.stage);
              const isCurrent = currentStage === stage.stage;
              const done = Boolean(approval);

              return (
                <li key={stage.stage} className="ml-6">
                  <span
                    className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white text-xs font-bold ${
                      done
                        ? "bg-indigo-600 text-white"
                        : isCurrent
                          ? "bg-amber-500 text-white"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {done ? "✓" : index + 2}
                  </span>
                  <p className="font-medium text-slate-900">
                    Stage {stage.stage} - {roleGroupToLabel(
                      stage.role,
                      getRoleLabel,
                      stage.mode === "AND" ? "AND" : "OR"
                    )}
                  </p>
                  {approval ? (
                    <div className="mt-1 text-sm text-slate-600 space-y-1">
                      <p>
                        Approved by {approval.approverName}
                        {approval.forwardingSection
                          ? ` (${getForwardingSectionLabel(approval.forwardingSection)})`
                          : ""}{" "}
                        on {new Date(approval.createdAt).toLocaleString("en-IN")}
                      </p>
                      {approval.assignedEmailId ? (
                        <p>
                          <span className="font-medium">Assigned Email:</span>{" "}
                          <span className="font-mono text-indigo-700">{approval.assignedEmailId}</span>
                        </p>
                      ) : null}
                    </div>
                  ) : isCurrent ? (
                    <p className="text-sm text-slate-500">Awaiting approval at this stage</p>
                  ) : (
                    <p className="text-sm text-slate-400">Pending previous stage completion</p>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Submitted Data Summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
            Submitted Details
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">
                {form.initials} {form.firstName} {form.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Gender</dt>
              <dd className="font-medium text-slate-900">{form.gender}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Permanent Address</dt>
              <dd className="font-medium text-slate-900">
                {form.permanentAddress}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Org / Roll ID</dt>
              <dd className="font-medium text-slate-900">{form.orgId}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Nature of Engagement</dt>
              <dd className="font-medium text-slate-900">
                {form.natureOfEngagement}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="font-medium text-slate-900">{form.role}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Department</dt>
              <dd className="font-medium text-slate-900">{form.department}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Mobile</dt>
              <dd className="font-medium text-slate-900">{form.mobileNo}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Alternate Email</dt>
              <dd className="font-medium text-slate-900">
                {form.alternateEmail}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
