import { getGuestHouseFormById } from "@/lib/guest-house-store";
import {
  getGuestHouseStatusBadgeClass,
  getGuestHouseStatusLabel,
} from "@/lib/guest-house-status";
import { requireUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";

import { PrintButton } from "@/components/ui/print-button";

export default async function GuestHouseStatusPage({
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

  const form = await getGuestHouseFormById(id);
  if (!form) notFound();

  const canReviewAny =
    user.role === "SYSTEM_ADMIN" ||
    user.role === "DIRECTOR" ||
    user.role === "DEAN_FAA" ||
    user.role === "REGISTRAR" ||
    user.role === "DEPUTY_DEAN" ||
    user.role === "HOD" ||
    user.role === "APPROVING_AUTHORITY" ||
    user.role === "GUEST_HOUSE_INCHARGE" ||
    user.role === "GUEST_HOUSE_COMMITTEE_CHAIR";

  if (!canReviewAny && form.submittedByEmail.toLowerCase() !== user.email.toLowerCase()) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      {isEmbedMode ? (
        <style>{`.print-hidden{display:none!important;}.app-content{padding-top:0!important;}`}</style>
      ) : null}
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Guest House Reservation
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Submission Status</h1>
            <p className="mt-1 text-sm text-slate-500">Reference ID: {form.submissionId}</p>
          </div>
          {!isEmbedMode ? <PrintButton /> : null}
        </div>

        <div
          className={`mt-5 rounded-lg px-4 py-3 text-sm font-semibold ${getGuestHouseStatusBadgeClass(
            form.overallStatus
          )}`}
        >
          Status: {getGuestHouseStatusLabel(form.overallStatus)}
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-slate-500">Guest Name</dt>
            <dd className="font-medium text-slate-900">{form.guestName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Guest Gender</dt>
            <dd className="font-medium text-slate-900">{form.guestGender ?? "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Guest Address</dt>
            <dd className="font-medium text-slate-900">{form.guestAddress}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Contact Number</dt>
            <dd className="font-medium text-slate-900">{form.contactNumber}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Number of Guests</dt>
            <dd className="font-medium text-slate-900">{form.numberOfGuests}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Rooms Required</dt>
            <dd className="font-medium text-slate-900">{form.numberOfRoomsRequired}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Occupancy Type</dt>
            <dd className="font-medium text-slate-900">{form.occupancyType}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Purpose</dt>
            <dd className="font-medium text-slate-900">{form.purposeOfBooking}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Arrival Date</dt>
            <dd className="font-medium text-slate-900">{new Date(form.arrivalDate).toLocaleDateString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Arrival Time</dt>
            <dd className="font-medium text-slate-900">{form.arrivalTime ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Departure Date</dt>
            <dd className="font-medium text-slate-900">{new Date(form.departureDate).toLocaleDateString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Departure Time</dt>
            <dd className="font-medium text-slate-900">{form.departureTime ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Room Type</dt>
            <dd className="font-medium text-slate-900">{form.roomType}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Booking Category</dt>
            <dd className="font-medium text-slate-900">{form.bookingCategory ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Tariff Amount</dt>
            <dd className="font-medium text-slate-900">
              {form.categoryTariffAmount !== null ? `Rs. ${form.categoryTariffAmount}` : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Booking Date</dt>
            <dd className="font-medium text-slate-900">
              {form.bookingDate ? new Date(form.bookingDate).toLocaleDateString("en-IN") : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Institute Guest</dt>
            <dd className="font-medium text-slate-900">{form.isInstituteGuest ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Boarding/Lodging by Guest</dt>
            <dd className="font-medium text-slate-900">
              {form.boardingLodgingByGuest === null ? "-" : form.boardingLodgingByGuest ? "Yes" : "No"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Remarks</dt>
            <dd className="font-medium text-slate-900">{form.remarksIfAny ?? "-"}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-800">Proposer Details</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {form.proposers.length === 0 ? (
              <p>No proposer details found.</p>
            ) : (
              form.proposers.map((proposer) => (
                <div key={proposer.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">{proposer.nameOfProposer}</p>
                  <p>Designation: {proposer.designation ?? "-"}</p>
                  <p>Department: {proposer.department ?? "-"}</p>
                  <p>Employee Code: {proposer.employeeCode ?? "-"}</p>
                  <p>Entry Number: {proposer.entryNumber ?? "-"}</p>
                  <p>Mobile: {proposer.mobileNumber ?? "-"}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-800">Approval Progress</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {form.approvals.map((approval) => (
              <div key={approval.stageNumber} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">
                  Stage {approval.stageNumber}: {approval.stageName}
                </p>
                <p>Decision: {approval.decision}</p>
                <p>Remark: {approval.recommendationText ?? "-"}</p>
                <p>
                  Decided At: {approval.decidedAt ? new Date(approval.decidedAt).toLocaleString("en-IN") : "Pending"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
