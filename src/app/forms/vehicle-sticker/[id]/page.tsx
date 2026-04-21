import { requireUser, toDisplayRole } from "@/lib/auth";
import { getWorkflow, getWorkflowStageRoleCodes } from "@/lib/workflow-engine";
import { uploadMissingVehicleStickerAttachments } from "@/app/actions/vehicle-sticker";
import {
  getVehicleStickerFormById,
  listVehicleStickerAttachmentsBySubmissionId,
  type VehicleStickerAttachmentRecord,
} from "@/lib/vehicle-sticker-store";
import {
  getVehicleStickerStatusBadgeClass,
  getVehicleStickerStatusText,
} from "@/lib/vehicle-sticker-status";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/ui/print-button";

export default async function VehicleStickerStatusPage({
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
  const form = await getVehicleStickerFormById(id);

  if (!form) notFound();

  const canReviewAny =
    user.role === "SUPERVISOR" ||
    user.role === "HOD" ||
    user.role === "STUDENT_AFFAIRS_HOSTEL_MGMT" ||
    user.role === "SECURITY_OFFICE" ||
    user.role === "SYSTEM_ADMIN";

  if (!canReviewAny && form.submittedByEmail.toLowerCase() !== user.email.toLowerCase()) {
    redirect("/");
  }

  const attachments = await listVehicleStickerAttachmentsBySubmissionId(id);
  const isOwner = form.submittedByEmail.toLowerCase() === user.email.toLowerCase();

  const workflow = await getWorkflow("vehicle-sticker");
  const stageFlow = workflow?.stages.map((stage) => ({
    stage: stage.stage,
    label: toDisplayRole(stage.role as any),
  })) ?? [];
  const securityStageNumbers =
    workflow?.stages
      .filter((stage) => getWorkflowStageRoleCodes(stage).includes("SECURITY_OFFICE"))
      .map((stage) => stage.stage) ?? [];

  const attachmentLabel: Record<VehicleStickerAttachmentRecord["documentType"], string> = {
    passport_photo: "Applicant Photo",
    vehicle_rc: "Vehicle RC",
    driving_license: "Driving License",
    college_id: "College ID",
  };

  const hasIssuanceDetails =
    form.overallStatus === "approved" &&
    Boolean(form.issuedStickerNo) &&
    Boolean(form.securityIssueDate) &&
    Boolean(form.stickerValidUpto);

  const eligibleDays =
    form.securityIssueDate && form.stickerValidUpto
      ? Math.max(
          1,
          Math.floor(
            (new Date(form.stickerValidUpto).setHours(0, 0, 0, 0) -
              new Date(form.securityIssueDate).setHours(0, 0, 0, 0)) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      {isEmbedMode ? (
        <style>{`.print-hidden{display:none!important;}.app-content{padding-top:0!important;}`}</style>
      ) : null}
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">IIT Ropar — Vehicle Sticker</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Application Status</h1>
            <p className="mt-1 text-sm text-slate-500">Reference ID: {form.submissionId}</p>
          </div>
          {!isEmbedMode ? <PrintButton /> : null}
        </div>

        <div className={`rounded-xl px-5 py-4 ${getVehicleStickerStatusBadgeClass(form)}`}>
          <p className="font-semibold">{getVehicleStickerStatusText(form)}</p>
        </div>

        {hasIssuanceDetails && eligibleDays !== null ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-800">Sticker Issued</h2>
            <dl className="mt-3 grid gap-3 text-sm text-emerald-900 sm:grid-cols-2">
              <div>
                <dt className="text-emerald-700">Sticker Number</dt>
                <dd className="font-semibold">{form.issuedStickerNo}</dd>
              </div>
              <div>
                <dt className="text-emerald-700">Eligible Days</dt>
                <dd className="font-semibold">{eligibleDays} days</dd>
              </div>
              <div>
                <dt className="text-emerald-700">Issue Date</dt>
                <dd className="font-semibold">{new Date(form.securityIssueDate!).toLocaleDateString("en-IN")}</dd>
              </div>
              <div>
                <dt className="text-emerald-700">Valid Upto</dt>
                <dd className="font-semibold">{new Date(form.stickerValidUpto!).toLocaleDateString("en-IN")}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Stage Flow</h2>
          <ol className="space-y-3">
            {stageFlow.map((stage) => {
              const stageApproval = form.approvals.find((approval) => approval.stageNumber === stage.stage);
              const isComplete = form.currentStage > stage.stage || stageApproval?.decision === "approved" || form.overallStatus === "approved";
              const isCurrent = form.currentStage === stage.stage && form.overallStatus !== "approved";

              return (
                <li key={stage.stage} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-800">Stage {stage.stage} - {stage.label}</p>
                  <p className="mt-1 text-slate-600">
                    {isComplete ? "Completed" : isCurrent ? "Current stage" : "Pending"}
                  </p>
                  {stageApproval?.recommendationText && (
                    <p className="mt-1 text-slate-500">Remark: {stageApproval.recommendationText}</p>
                  )}
                  {securityStageNumbers.includes(stage.stage) &&
                  (form.issuedStickerNo || form.stickerValidUpto || form.securityIssueDate) ? (
                    <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                      {form.issuedStickerNo ? (
                        <p>
                          Sticker Number: <span className="font-semibold">{form.issuedStickerNo}</span>
                        </p>
                      ) : null}
                      {form.stickerValidUpto ? (
                        <p>
                          Valid Upto:{" "}
                          <span className="font-semibold">
                            {new Date(form.stickerValidUpto).toLocaleDateString("en-IN")}
                          </span>
                        </p>
                      ) : null}
                      {form.securityIssueDate ? (
                        <p>
                          Issue Date:{" "}
                          <span className="font-semibold">
                            {new Date(form.securityIssueDate).toLocaleDateString("en-IN")}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Attachments</h2>
          {attachments.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">No attachments found for this submission.</p>
              {isOwner && (
                <form action={uploadMissingVehicleStickerAttachments} className="grid gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2">
                  <input type="hidden" name="submissionId" value={form.submissionId} />
                  <div>
                    <label className="label">Applicant Photo</label>
                    <input name="applicantPhoto" type="file" accept="image/*" required className="input" />
                  </div>
                  <div>
                    <label className="label">Vehicle RC</label>
                    <input name="vehicleRc" type="file" accept="image/*,.pdf" required className="input" />
                  </div>
                  <div>
                    <label className="label">Driving License (DL)</label>
                    <input name="drivingLicenseDoc" type="file" accept="image/*,.pdf" required className="input" />
                  </div>
                  <div>
                    <label className="label">College ID</label>
                    <input name="collegeIdDoc" type="file" accept="image/*,.pdf" required className="input" />
                  </div>
                  <button
                    type="submit"
                    className="sm:col-span-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                  >
                    Upload Missing Attachments
                  </button>
                </form>
              )}
            </div>
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Applicant Details</h2>
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{form.applicantName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Designation</dt>
              <dd className="font-medium text-slate-900">{form.designation}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Department</dt>
              <dd className="font-medium text-slate-900">{form.department}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Entry / Employee No</dt>
              <dd className="font-medium text-slate-900">{form.entryOrEmpNo ?? "-"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Address</dt>
              <dd className="font-medium text-slate-900">{form.address}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-900">{form.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{form.emailContact ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Driving License No</dt>
              <dd className="font-medium text-slate-900">{form.drivingLicenseNo}</dd>
            </div>
            <div>
              <dt className="text-slate-500">DL Valid Upto</dt>
              <dd className="font-medium text-slate-900">{new Date(form.dlValidUpto).toLocaleDateString("en-IN")}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Vehicle Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">S. No.</th>
                  <th className="px-4 py-2">Registration No</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Make/Model</th>
                  <th className="px-4 py-2">Colour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.vehicleDetails.map((detail) => (
                  <tr key={detail.serialNo}>
                    <td className="px-4 py-2">{detail.serialNo}</td>
                    <td className="px-4 py-2">{detail.registrationNo}</td>
                    <td className="px-4 py-2">{detail.vehicleType}</td>
                    <td className="px-4 py-2">{detail.makeModel}</td>
                    <td className="px-4 py-2">{detail.colour}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
