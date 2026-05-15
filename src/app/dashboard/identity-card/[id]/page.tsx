import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboardPathForUser, getQueueRoleForUser, requireUser } from "@/lib/auth";
import { getWorkflow, getStagesForRole } from "@/lib/workflow-engine";
import {
  getIdentityCardFormById,
  listIdentityCardAttachmentsBySubmissionId,
  type IdentityCardAttachmentRecord,
} from "@/lib/identity-card-store";
import {
  getIdentityCardStatusBadgeClass,
  getIdentityCardStatusText,
} from "@/lib/identity-card-status";
import {
  DynamicStagePanel,
  EstablishmentPanel,
  HodSectionHeadPanel,
  RegistrarDeanPanel,
} from "./approval-panels";

import { PrintButton } from "@/components/ui/print-button";

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value ?? "-"}</dd>
    </div>
  );
}

export default async function IdentityCardDetailPage({
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
    queueKey: "identity-card",
  });
  const activeRole = queueRole.activeRole;

  if (!activeRole) {
    notFound();
  }

  const { id } = await params;
  const { embed } = await searchParams;
  const isEmbedMode = embed === "1" || embed === "true";
  const form = await getIdentityCardFormById(id);
  if (!form) {
    notFound();
  }

  const attachments = await listIdentityCardAttachmentsBySubmissionId(id);
  const workflow = await getWorkflow("identity-card");
  const validStages = workflow ? getStagesForRole(workflow, activeRole) : [];
  const canActOnCurrentStage = activeRole === "SYSTEM_ADMIN" || validStages.includes(form.currentStage);

  const dashboardHref = await getDashboardPathForUser(user.id, user.role);

  const canApproveStage1 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 1 &&
    canActOnCurrentStage;

  const canApproveStage2 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 2 &&
    canActOnCurrentStage;

  const canApproveStage3 =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    form.currentStage === 3 &&
    canActOnCurrentStage;

  const canApproveDynamicStage =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    canActOnCurrentStage &&
    ![1, 2, 3].includes(form.currentStage);

  const attachmentLabel: Record<IdentityCardAttachmentRecord["documentType"], string> = {
    passport_photo: "Passport Photo",
    previous_id_card: "Previous ID Card",
    deposit_slip: "Deposit Slip",
    fir_copy: "FIR Copy",
  };

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
              Identity Card Requests
            </Link>
            <span className="text-gray-400">/</span>
            <span className="font-semibold text-white">{form.nameInCapitals}</span>
          </div>

          <div className="section-glass rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Identity Card</p>
                <h1 className="electric-title text-3xl font-black leading-tight">{form.nameInCapitals}</h1>
                <p className="mt-2 text-sm font-medium text-gray-600">
                  Ref: {form.submissionId} · Submitted {new Date(form.createdAt).toLocaleDateString("en-IN")}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Current Stage: {form.currentStage}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!isEmbedMode ? <PrintButton /> : null}
                <span className={`pill-badge bg-white/80 text-gray-900 ${getIdentityCardStatusBadgeClass(form)}`}>
                  {getIdentityCardStatusText(form)}
                </span>
              </div>
            </div>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-800">Applicant Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Employee / Entry Code" value={form.employeeCodeSnapshot} />
              <Field label="Designation" value={form.designationSnapshot} />
              <Field label="Employment Type" value={form.employmentType} />
              <Field
                label="Contract Upto"
                value={form.contractUpto ? new Date(form.contractUpto).toLocaleDateString("en-IN") : "-"}
              />
              <Field label="Department" value={form.departmentSnapshot} />
              <Field label="Father / Husband Name" value={form.fathersHusbandName} />
              <Field label="Date of Birth" value={new Date(form.dateOfBirth).toLocaleDateString("en-IN")} />
              <Field label="Date of Joining" value={new Date(form.dateOfJoining).toLocaleDateString("en-IN")} />
              <Field label="Blood Group" value={form.bloodGroup} />
              <Field label="Office Phone" value={form.officePhone} />
              <Field label="Mobile" value={form.mobileNumber} />
              <Field label="Email" value={form.emailId} />
              <Field label="Address Line 1" value={form.presentAddress} />
              <Field label="Address Line 2" value={form.presentAddressLine2} />
              <Field label="Card Type" value={form.cardType} />
              <Field label="Previous Card Validity" value={form.previousCardValidity} />
              <Field label="Reason" value={form.reasonForRenewal} />
            </dl>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-800">Approval Progress</h2>
            <div className="space-y-3">
              {form.approvals.map((approval) => (
                <div
                  key={approval.stageNumber}
                  className="rounded-xl border border-slate-200/70 bg-white/80 p-4 text-sm shadow-sm backdrop-blur"
                >
                  <p className="font-semibold text-slate-900">
                    Stage {approval.stageNumber} - {approval.stageName}
                  </p>
                  <p className="mt-1 text-slate-700">Decision: {approval.decision}</p>
                  <p className="mt-1 text-slate-700">Recommendation: {approval.recommendationText ?? "-"}</p>
                  <p className="mt-1 text-slate-700">
                    Decided At: {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString("en-IN") : "Pending"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-800">Attachments</h2>
            {attachments.length === 0 ? (
              <p className="text-sm text-slate-600">No attachments found.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {attachments.map((attachment) => {
                  const isImage = (attachment.mimeType ?? "").startsWith("image/");
                  return (
                    <div key={attachment.id} className="rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                      <p className="text-sm font-semibold text-slate-900">{attachmentLabel[attachment.documentType]}</p>
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={attachment.filePath}
                          alt={attachmentLabel[attachment.documentType]}
                          className="mt-3 h-44 w-full rounded-lg border border-slate-200 object-cover"
                        />
                      ) : (
                        <p className="mt-3 text-xs text-slate-600">Preview not available for this file type.</p>
                      )}
                      <a
                        href={attachment.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-xs font-semibold text-indigo-700 hover:underline"
                      >
                        Open file
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {canApproveStage1 ? <HodSectionHeadPanel submissionId={form.submissionId} /> : null}
          {canApproveStage2 ? <EstablishmentPanel submissionId={form.submissionId} /> : null}
          {canApproveStage3 ? <RegistrarDeanPanel submissionId={form.submissionId} /> : null}
          {canApproveDynamicStage ? (
            <DynamicStagePanel submissionId={form.submissionId} stageNumber={form.currentStage} />
          ) : null}

          {form.overallStatus === "approved" ? (
            <div className="section-glass rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-4 text-sm font-semibold text-emerald-900 shadow-lg">
              This request has been fully processed. ID card is ready.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
