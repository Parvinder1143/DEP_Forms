import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboardPathForUser, getQueueRoleForUser, requireUser } from "@/lib/auth";
import { getWorkflow, getStagesForRole } from "@/lib/workflow-engine";
import { getGuestHouseFormById } from "@/lib/guest-house-store";
import {
  getGuestHouseStatusBadgeClass,
  getGuestHouseStatusLabel,
} from "@/lib/guest-house-status";
import {
  ApprovingAuthorityPanel,
  ChairmanPanel,
  DynamicGuestHouseStagePanel,
  InChargePanel,
} from "./approval-panels";

import { PrintButton } from "@/components/ui/print-button";

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value ?? "-"}</dd>
    </div>
  );
}

export default async function GuestHouseDetailPage({
  params,
  searchParams,
} : {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "guest-house",
  });
  const activeRole = queueRole.activeRole;

  if (!activeRole) {
    notFound();
  }
  const { id } = await params;
  const { embed } = await searchParams;
  const isEmbedMode = embed === "1" || embed === "true";
  const form = await getGuestHouseFormById(id);
  if (!form) notFound();

  const workflow = await getWorkflow("guest-house");
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

  const visibleApprovals = form.approvals.filter(
    (approval) => approval.decision !== "pending" || approval.stageNumber === form.currentStage
  );

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
              Guest House Requests
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-white font-semibold">{form.guestName}</span>
          </div>

          <div className="section-glass rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Guest House</p>
                <h1 className="electric-title text-3xl font-black leading-tight">{form.guestName}</h1>
                <p className="mt-2 text-sm font-medium text-gray-600">
                  Ref: {form.submissionId} · Submitted {new Date(form.createdAt).toLocaleDateString("en-IN")}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Current Stage: {form.currentStage}</p>
              </div>
              <div className="flex items-center gap-3">
                {!isEmbedMode ? <PrintButton /> : null}
                <span
                  className={`pill-badge bg-white/80 text-gray-900 ${getGuestHouseStatusBadgeClass(
                    form.overallStatus
                  )}`}
                >
                  {getGuestHouseStatusLabel(form.overallStatus)}
                </span>
              </div>
            </div>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-800">Guest & Booking Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Guest Name" value={form.guestName} />
              <Field label="Gender" value={form.guestGender} />
              <Field label="Contact Number" value={form.contactNumber} />
              <Field label="Guest Address" value={form.guestAddress} />
              <Field label="No. of Guests" value={form.numberOfGuests} />
              <Field label="No. of Rooms" value={form.numberOfRoomsRequired} />
              <Field label="Occupancy" value={form.occupancyType} />
              <Field label="Purpose" value={form.purposeOfBooking} />
              <Field label="Room Type" value={form.roomType} />
              <Field label="Booking Category" value={form.bookingCategory} />
              <Field label="Tariff" value={form.categoryTariffAmount} />
              <Field label="Booking Date" value={form.bookingDate ? new Date(form.bookingDate).toLocaleDateString("en-IN") : "-"} />
              <Field label="Arrival" value={`${new Date(form.arrivalDate).toLocaleDateString("en-IN")} ${form.arrivalTime ?? ""}`} />
              <Field label="Departure" value={`${new Date(form.departureDate).toLocaleDateString("en-IN")} ${form.departureTime ?? ""}`} />
              <Field label="Institute Guest" value={form.isInstituteGuest ? "Yes" : "No"} />
              <Field
                label="Boarding/Lodging by Guest"
                value={form.boardingLodgingByGuest === null ? "-" : form.boardingLodgingByGuest ? "Yes" : "No"}
              />
              <Field label="Room No (stage 2)" value={form.roomNoConfirmed} />
              <Field label="SR No / Page No" value={form.srNoEnteredAtPageNo} />
              <Field label="Check-in" value={form.checkInDateTime ? new Date(form.checkInDateTime).toLocaleString("en-IN") : "-"} />
              <Field label="Check-out" value={form.checkOutDateTime ? new Date(form.checkOutDateTime).toLocaleString("en-IN") : "-"} />
              <Field label="Office Remarks" value={form.officeRemarks} />
              <Field label="Total Charges" value={form.totalCharges} />
              <Field label="Budget Department" value={form.budgetDepartment} />
              <Field label="Submitter" value={form.submittedByEmail} />
            </dl>
          </div>

          <div className="section-glass rounded-3xl border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-800">Proposer Details</h2>
            <div className="space-y-3">
              {form.proposers.map((proposer) => (
                <div key={proposer.id} className="rounded-xl border border-slate-200/70 bg-white/80 p-4 text-sm shadow-sm backdrop-blur">
                  <p className="font-semibold text-slate-900">{proposer.nameOfProposer}</p>
                  <p className="text-slate-700">Designation: {proposer.designation ?? "-"}</p>
                  <p className="text-slate-700">Department: {proposer.department ?? "-"}</p>
                  <p className="text-slate-700">Employee Code: {proposer.employeeCode ?? "-"}</p>
                  <p className="text-slate-700">Entry Number: {proposer.entryNumber ?? "-"}</p>
                  <p className="text-slate-700">Mobile Number: {proposer.mobileNumber ?? "-"}</p>
                </div>
              ))}
            </div>
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
                  <p className="mt-1 text-slate-700">Recommendation: {approval.recommendationText ?? "-"}</p>
                  <p className="mt-1 text-slate-700">
                    Decided At: {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString("en-IN") : "Pending"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {canApproveStage1 ? <ApprovingAuthorityPanel submissionId={form.submissionId} /> : null}
          {canApproveStage2 ? <InChargePanel submissionId={form.submissionId} /> : null}
          {canApproveStage3 ? <ChairmanPanel submissionId={form.submissionId} /> : null}
          {canApproveDynamicStage ? (
            <DynamicGuestHouseStagePanel submissionId={form.submissionId} stageNumber={form.currentStage} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
