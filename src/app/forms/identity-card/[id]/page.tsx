import { requireUser } from "@/lib/auth";
import {
  getIdentityCardFormById,
  listIdentityCardAttachmentsBySubmissionId,
  type IdentityCardAttachmentRecord,
} from "@/lib/identity-card-store";
import {
  getIdentityCardStatusBadgeClass,
  getIdentityCardStatusText,
} from "@/lib/identity-card-status";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/ui/print-button";

export default async function IdentityCardStatusPage({
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

  const form = await getIdentityCardFormById(id);
  if (!form) {
    notFound();
  }

  const canReviewAny =
    user.role === "HOD" ||
    user.role === "SECTION_HEAD" ||
    user.role === "ESTABLISHMENT" ||
    user.role === "REGISTRAR" ||
    user.role === "DEAN_FAA" ||
    user.role === "SYSTEM_ADMIN";

  if (!canReviewAny && form.submittedByEmail.toLowerCase() !== user.email.toLowerCase()) {
    redirect("/");
  }

  const attachments = await listIdentityCardAttachmentsBySubmissionId(id);

  const attachmentLabel: Record<IdentityCardAttachmentRecord["documentType"], string> = {
    passport_photo: "Passport Photo",
    previous_id_card: "Previous ID Card",
    deposit_slip: "Deposit Slip",
    fir_copy: "FIR Copy",
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      {isEmbedMode ? (
        <style>{`.print-hidden{display:none!important;}.app-content{padding-top:0!important;}`}</style>
      ) : null}
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">IIT Ropar - Identity Card</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Application Status</h1>
            <p className="mt-1 text-sm text-slate-500">Reference ID: {form.submissionId}</p>
          </div>
          {!isEmbedMode ? <PrintButton /> : null}
        </div>

        <div className={`rounded-xl px-5 py-4 ${getIdentityCardStatusBadgeClass(form)}`}>
          <p className="font-semibold">{getIdentityCardStatusText(form)}</p>
        </div>

        {form.overallStatus === "approved" ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
            Your identity card request is fully approved. ID card is ready.
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Stage Flow</h2>
          <ol className="space-y-3">
            {form.approvals.map((approval) => {
              const isComplete = approval.decision === "approved";
              const isRejected = approval.decision === "rejected";
              return (
                <li key={approval.stageNumber} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-800">Stage {approval.stageNumber} - {approval.stageName}</p>
                  <p className="mt-1 text-slate-600">
                    {isRejected ? "Rejected" : isComplete ? "Completed" : "Pending"}
                  </p>
                  {approval.recommendationText ? (
                    <p className="mt-1 text-slate-500">Remark: {approval.recommendationText}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Applicant Snapshot</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{form.nameInCapitals}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Employee / Entry Code</dt>
              <dd className="font-medium text-slate-900">{form.employeeCodeSnapshot ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Department</dt>
              <dd className="font-medium text-slate-900">{form.departmentSnapshot ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Card Type</dt>
              <dd className="font-medium capitalize text-slate-900">{form.cardType}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Attachments</h2>
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500">No attachments found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {attachments.map((attachment) => {
                const isImage = (attachment.mimeType ?? "").startsWith("image/");
                return (
                  <div key={attachment.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">{attachmentLabel[attachment.documentType]}</p>
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachment.filePath}
                        alt={attachmentLabel[attachment.documentType]}
                        className="mt-3 h-44 w-full rounded-lg border border-slate-200 object-cover"
                      />
                    ) : (
                      <p className="mt-3 text-xs text-slate-500">Preview not available for this file type.</p>
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
      </div>
    </div>
  );
}
