import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboardPathForUser, getQueueRoleForUser, requireUser } from "@/lib/auth";
import { getStagesForRole, getWorkflow, getWorkflowStageRoleCodes } from "@/lib/workflow-engine";
import {
  getVehicleStickerFormById,
  listVehicleStickerAttachmentsBySubmissionId,
  type VehicleStickerAttachmentRecord,
} from "@/lib/vehicle-sticker-store";
import {
  getVehicleStickerStatusBadgeClass,
  getVehicleStickerStatusText,
} from "@/lib/vehicle-sticker-status";
import {
  DynamicVehicleStagePanel,
  HodPanel,
  SecurityOfficePanel,
  StudentAffairsHostelPanel,
  SupervisorPanel,
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

function StageLabel({ stage }: { stage: number }) {
  if (stage === 1) return <span>Supervisor Recommendation</span>;
  if (stage === 2) return <span>HoD Recommendation</span>;
  if (stage === 3) return <span>Student Affairs</span>;
  if (stage === 4) return <span>Security Office Issuance</span>;
  return <span>Stage {stage}</span>;
}

export default async function VehicleStickerDetailPage({
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
    queueKey: "vehicle-sticker",
  });
  const activeRole = queueRole.activeRole;

  if (!activeRole) {
    notFound();
  }

  const { id } = await params;
  const { embed } = await searchParams;
  const isEmbedMode = embed === "1" || embed === "true";
  const form = await getVehicleStickerFormById(id);
  if (!form) notFound();
  const attachments = await listVehicleStickerAttachmentsBySubmissionId(id);
  const workflow = await getWorkflow("vehicle-sticker");
  const validStages = workflow ? getStagesForRole(workflow, activeRole) : [];

  const dashboardHref = await getDashboardPathForUser(user.id, user.role);
  const canActOnCurrentStage = activeRole === "SYSTEM_ADMIN" || validStages.includes(form.currentStage);

  const currentStageDefinition = workflow?.stages.find((stage) => stage.stage === form.currentStage);
  const currentStageRoleCodes = currentStageDefinition
    ? getWorkflowStageRoleCodes(currentStageDefinition)
    : [];
  const currentStageIsOpen =
    form.overallStatus !== "approved" &&
    form.overallStatus !== "rejected" &&
    canActOnCurrentStage;

  const canApproveSupervisor =
    currentStageIsOpen && currentStageRoleCodes.includes("SUPERVISOR");
  const canApproveHod =
    currentStageIsOpen &&
    (currentStageRoleCodes.includes("HOD") || currentStageRoleCodes.includes("SECTION_HEAD"));
  const canApproveStudentAffairs =
    currentStageIsOpen && currentStageRoleCodes.includes("STUDENT_AFFAIRS_HOSTEL_MGMT");
  const canApproveSecurity =
    currentStageIsOpen && currentStageRoleCodes.includes("SECURITY_OFFICE");
  const canApproveDynamicStage =
    currentStageIsOpen &&
    !canApproveSupervisor &&
    !canApproveHod &&
    !canApproveStudentAffairs &&
    !canApproveSecurity;

  const attachmentLabel: Record<VehicleStickerAttachmentRecord["documentType"], string> = {
    passport_photo: "Applicant Photo",
    vehicle_rc: "Vehicle RC",
    driving_license: "Driving License",
    college_id: "College ID",
  };

  const visibleApprovals = form.approvals.filter(
    (approval) => approval.decision !== "pending" || approval.stageNumber === form.currentStage
  );
  const securityStageNumbers =
    workflow?.stages
      .filter((stage) => getWorkflowStageRoleCodes(stage).includes("SECURITY_OFFICE"))
      .map((stage) => stage.stage) ?? [];

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
              Vehicle Sticker Requests
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-white font-semibold">{form.applicantName}</span>
          </div>

          <div className="section-glass rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Vehicle Sticker</p>
                <h1 className="electric-title text-3xl font-black leading-tight">{form.applicantName}</h1>
                <p className="mt-2 text-sm font-medium text-gray-600">
                  Ref: {form.submissionId} · Submitted {new Date(form.createdAt).toLocaleDateString("en-IN")}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Current Stage: <StageLabel stage={form.currentStage} />
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!isEmbedMode ? <PrintButton /> : null}
                <span className={`pill-badge bg-white/80 text-gray-900 ${getVehicleStickerStatusBadgeClass(form)}`}>
                  {getVehicleStickerStatusText(form)}
                </span>
              </div>
            </div>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-800">Applicant Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Designation" value={form.designation} />
              <Field label="Department" value={form.department} />
              <Field label="Entry / Employee No" value={form.entryOrEmpNo} />
              <Field label="Phone" value={form.phone} />
              <Field label="Email" value={form.emailContact} />
              <Field label="Driving License No" value={form.drivingLicenseNo} />
              <Field label="DL Valid Upto" value={new Date(form.dlValidUpto).toLocaleDateString("en-IN")} />
              <Field label="Address" value={form.address} />
            </dl>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-800">Vehicle Details</h2>
            {form.vehicleDetails.length === 0 ? (
              <p className="text-sm text-slate-600">No vehicle details recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="border-b border-slate-100 bg-white/70 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 backdrop-blur">
                    <tr>
                      <th className="px-4 py-3">Sr No</th>
                      <th className="px-4 py-3">Registration No</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Make & Model</th>
                      <th className="px-4 py-3">Colour</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {form.vehicleDetails.map((v) => (
                      <tr key={v.serialNo} className="bg-white/80">
                        <td className="px-4 py-3 text-slate-800">{v.serialNo}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{v.registrationNo}</td>
                        <td className="px-4 py-3 text-slate-800">{v.vehicleType}</td>
                        <td className="px-4 py-3 text-slate-800">{v.makeModel}</td>
                        <td className="px-4 py-3 text-slate-800">{v.colour}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-800">Approval Progress</h2>
            <div className="space-y-3">
              {visibleApprovals.map((approval) => (
                <div
                  key={approval.stageNumber}
                  className="rounded-xl border border-slate-200/70 bg-white/80 p-4 text-sm shadow-sm backdrop-blur"
                >
                  <p className="font-semibold text-slate-900">
                    Stage {approval.stageNumber} - {approval.stageName}
                  </p>
                  <p className="mt-1 text-slate-700">Decision: {approval.decision}</p>
                  <p className="mt-1 text-slate-700">
                    Recommendation: {approval.recommendationText ?? "-"}
                  </p>
                  {securityStageNumbers.includes(approval.stageNumber) &&
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

          {canApproveSupervisor && <SupervisorPanel submissionId={form.submissionId} />}
          {canApproveHod && <HodPanel submissionId={form.submissionId} />}
          {canApproveStudentAffairs && <StudentAffairsHostelPanel submissionId={form.submissionId} />}
          {canApproveSecurity && (
            <SecurityOfficePanel submissionId={form.submissionId} stageNumber={form.currentStage} />
          )}
          {canApproveDynamicStage && (
            <DynamicVehicleStagePanel submissionId={form.submissionId} stageNumber={form.currentStage} />
          )}

          {form.overallStatus === "approved" && (
            <div className="section-glass rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-4 text-sm font-semibold text-emerald-900 shadow-lg">
              This request has been fully processed and the vehicle sticker has been issued.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
