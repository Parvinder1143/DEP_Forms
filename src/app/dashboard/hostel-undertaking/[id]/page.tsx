import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboardPathForUser, getQueueRoleForUser, requireUser } from "@/lib/auth";
import { getWorkflow, getStagesForRole } from "@/lib/workflow-engine";
import { getHostelUndertakingFormById } from "@/lib/hostel-undertaking-store";
import {
  getHostelUndertakingStatusBadgeClass,
  getHostelUndertakingStatusText,
} from "@/lib/hostel-undertaking-status";
import { DynamicHostelStageApprovalPanel, HostelWardenApprovalPanel } from "./approval-panel";

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

export default async function HostelUndertakingDetailPage({
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
    queueKey: "hostel-undertaking",
  });
  const activeRole = queueRole.activeRole;

  if (!activeRole) {
    notFound();
  }
  const { id } = await params;
  const { embed } = await searchParams;
  const isEmbedMode = embed === "1" || embed === "true";

  const form = await getHostelUndertakingFormById(id);
  if (!form) {
    notFound();
  }

  const workflow = await getWorkflow("hostel-undertaking");
  const validStages = workflow ? getStagesForRole(workflow, activeRole) : [];
  const canActOnCurrentStage = activeRole === "SYSTEM_ADMIN" || validStages.includes(form.currentStage);

  const dashboardHref = await getDashboardPathForUser(user.id, user.role);
  const canReview =
    form.currentStage === 1 &&
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    canActOnCurrentStage;
  const canReviewDynamicStage =
    form.currentStage !== 1 &&
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    canActOnCurrentStage;

  const photoAttachment = form.attachments.find((item) => item.documentType === "passport_photo") ?? null;
  const parentDoc = form.attachments.find((item) => item.documentType === "supporting_document") ?? null;

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
              Hostel Undertaking Requests
            </Link>
            <span className="text-gray-400">/</span>
            <span className="font-semibold text-white">{form.studentName}</span>
          </div>

          <div className="section-glass rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Hostel Undertaking</p>
                <h1 className="electric-title text-3xl font-black leading-tight">{form.studentName}</h1>
                <p className="mt-2 text-sm font-medium text-gray-600">
                  Ref: {form.submissionId} · Submitted {new Date(form.createdAt).toLocaleDateString("en-IN")}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Current Stage: {form.currentStage}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!isEmbedMode ? <PrintButton /> : null}
                <span className={`pill-badge bg-white/80 text-gray-900 ${getHostelUndertakingStatusBadgeClass(form)}`}>
                  {getHostelUndertakingStatusText(form)}
                </span>
              </div>
            </div>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-800">Student Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Entry Number" value={form.entryNumber} />
              <Field label="Course" value={form.courseName} />
              <Field label="Department" value={form.department} />
              <Field label="Hostel Room" value={form.hostelRoomNo} />
              <Field label="Email" value={form.emailAddress} />
              <Field label="Date of Joining" value={new Date(form.dateOfJoining).toLocaleDateString("en-IN")} />
              <Field label="Blood Group" value={form.bloodGroup} />
              <Field label="Category" value={form.category} />
              <Field label="Emergency Contact" value={form.emergencyContactNo} />
              <Field label="Declaration Date" value={form.declarationDate ? new Date(form.declarationDate).toLocaleDateString("en-IN") : "-"} />
            </dl>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-800">Fee Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="HEF Amount" value={form.hefAmount !== null ? String(form.hefAmount) : "-"} />
              <Field label="Mess Security" value={form.messSecurity !== null ? String(form.messSecurity) : "-"} />
              <Field label="Mess Admission Fee" value={form.messAdmissionFee !== null ? String(form.messAdmissionFee) : "-"} />
              <Field label="Mess Charges" value={form.messCharges !== null ? String(form.messCharges) : "-"} />
            </dl>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-800">Guardian Details</h2>
            <div className="space-y-4">
              {form.guardians.length === 0 ? (
                <p className="text-sm text-slate-600">No guardian details recorded.</p>
              ) : (
                form.guardians.map((guardian) => (
                  <div key={guardian.id} className="rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-sm font-semibold text-slate-900">
                      {guardian.guardianType === "parent" ? "Parent / Guardian" : "Local Guardian"}
                    </p>
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <Field label="Relationship" value={guardian.relationship} />
                      <Field label="Office Mobile" value={guardian.officeMobile} />
                      <Field label="Office Telephone" value={guardian.officeTelephone} />
                      <Field label="Office Email" value={guardian.officeEmail} />
                      <Field label="Residence Mobile" value={guardian.residenceMobile} />
                      <Field label="Residence Telephone" value={guardian.residenceTelephone} />
                      <Field label="Residence Email" value={guardian.residenceEmail} />
                      <Field label="Office Address 1" value={guardian.officeAddressLine1} />
                      <Field label="Office Address 2" value={guardian.officeAddressLine2} />
                      <Field label="Residence Address 1" value={guardian.residenceAddressLine1} />
                      <Field label="Residence Address 2" value={guardian.residenceAddressLine2} />
                    </dl>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-800">Attachments</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">Passport Photo</p>
                {photoAttachment ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoAttachment.filePath}
                    alt="Passport"
                    className="mt-3 h-44 w-full rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <p className="mt-3 text-xs text-slate-600">Not uploaded.</p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">Parent Signature</p>
                {parentDoc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={parentDoc.filePath}
                    alt="Parent signature"
                    className="mt-3 h-44 w-full rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <p className="mt-3 text-xs text-slate-600">Not uploaded.</p>
                )}
              </div>
            </div>
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

          {canReview ? <HostelWardenApprovalPanel submissionId={form.submissionId} /> : null}
          {canReviewDynamicStage ? (
            <DynamicHostelStageApprovalPanel submissionId={form.submissionId} stageNumber={form.currentStage} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
