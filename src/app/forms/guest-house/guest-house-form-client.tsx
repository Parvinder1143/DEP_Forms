"use client";

import { useEffect, useState, useTransition } from "react";
import { submitGuestHouseForm } from "@/app/actions/guest-house";

const bookingTerms: string[] = [
  "Check-in and check-out time are 01:00 PM and 11:00 AM respectively.",
  "One day minimum charge applies for all bookings unless cancelled at least 24 hours before the booked date.",
  "For bulk bookings for conferences/workshops/events, room cancellation requests must be made at least one week before the event.",
  "Request for bulk booking may not be made more than 90 days prior to the event.",
  "Request for regular booking may be submitted at least two days before arrival of guest.",
  "Student accommodation requests for parents should be forwarded through respective Wardens/Dean of Students.",
  "Not more than two persons are allowed in a double occupancy bed room.",
  "Booking is not permitted for guests undergoing medical treatment/advice for communicable disease or post-delivery case.",
  "Pets/Dogs/Cats are not allowed in the Guest House.",
  "MHRD/Govt. of India clearance is required for guests/visitors holding foreign passport.",
  "In emergency due to heavy booking, a single occupant may be asked to share accommodation as per availability order.",
  "Requests for availing dining facility should be communicated in advance at the reception.",
  "Accommodation is subject to competent authority approval and room availability.",
];

const FIXED_ARRIVAL_TIME = "13:00";
const FIXED_DEPARTURE_TIME = "11:00";

function getTodayLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function GuestHouseFormClient() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [roomType, setRoomType] = useState<"executive_suite" | "business_room" | "">("");
  const [bookingCategory, setBookingCategory] = useState("");
  const [isInstituteGuest, setIsInstituteGuest] = useState<"yes" | "no" | "">("");
  const [guestToBeCharged, setGuestToBeCharged] = useState(false);
  const [bookingDate, setBookingDate] = useState("");

  useEffect(() => {
    setBookingDate(getTodayLocalDate());
  }, []);

  const categoryOptions =
    roomType === "executive_suite"
      ? [
          { value: "cat_a", label: "Cat-A (Free)", amount: 0 },
          { value: "cat_b", label: "Cat-B (Rs. 3500)", amount: 3500 },
        ]
      : roomType === "business_room"
        ? [
            { value: "cat_a", label: "Cat-A (Free)", amount: 0 },
            { value: "b_1", label: "B-1 (Rs. 2000)", amount: 2000 },
            { value: "b_2", label: "B-2 (Rs. 1200)", amount: 1200 },
          ]
        : [];

  const allCategoryOptions = [
    { value: "cat_a", label: "Cat-A (Free)" },
    { value: "cat_b", label: "Cat-B (Rs. 3500) - Executive Suite" },
    { value: "b_1", label: "B-1 (Rs. 2000) - Business Room" },
    { value: "b_2", label: "B-2 (Rs. 1200) - Business Room" },
  ];

  const visibleCategoryOptions = roomType
    ? categoryOptions.map((option) => ({ value: option.value, label: option.label }))
    : allCategoryOptions;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await submitGuestHouseForm(formData);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            IIT Ropar
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Guest House Form</h1>
          <p className="mt-1 text-sm text-slate-500">Any logged-in user can submit this request.</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Guest Details</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Guest Name *</label>
                <input name="guestName" required className="input" placeholder="Full guest name" />
              </div>
              <div>
                <label className="label">Gender *</label>
                <select name="guestGender" required className="input">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Guest Address *</label>
                <textarea
                  name="guestAddress"
                  required
                  rows={2}
                  className="input resize-none"
                  placeholder="Full correspondence address"
                />
              </div>
              <div>
                <label className="label">Contact Number *</label>
                <input name="contactNumber" required className="input" placeholder="Contact number" />
              </div>
              <div>
                <label className="label">Number of Guests *</label>
                <input name="numberOfGuests" type="number" min={1} required className="input" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Booking Details</h2>
            <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                View terms, categories, and tariff details before selecting room type
              </summary>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <ol className="list-decimal space-y-1 pl-5">
                  {bookingTerms.map((term, index) => (
                    <li key={index}>{term}</li>
                  ))}
                </ol>

                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="min-w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Room</th>
                        <th className="px-3 py-2 font-semibold">Category</th>
                        <th className="px-3 py-2 font-semibold">Tariff</th>
                        <th className="px-3 py-2 font-semibold">Approving Authority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      <tr>
                        <td className="px-3 py-2">Executive Suite</td>
                        <td className="px-3 py-2">Cat-A</td>
                        <td className="px-3 py-2">Free</td>
                        <td className="px-3 py-2">Director / Concerned Dean</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Executive Suite</td>
                        <td className="px-3 py-2">Cat-B</td>
                        <td className="px-3 py-2">Rs. 3500</td>
                        <td className="px-3 py-2">Chairman, Guest House Committee</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Business Room</td>
                        <td className="px-3 py-2">Cat-A</td>
                        <td className="px-3 py-2">Free</td>
                        <td className="px-3 py-2">Registrar / Concerned Dean / Director</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Business Room</td>
                        <td className="px-3 py-2">B-1</td>
                        <td className="px-3 py-2">Rs. 2000</td>
                        <td className="px-3 py-2">Concerned Dean / Associate Dean / HoDs / Registrar</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">Business Room</td>
                        <td className="px-3 py-2">B-2</td>
                        <td className="px-3 py-2">Rs. 1200</td>
                        <td className="px-3 py-2">Chairman, Guest House Committee</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <p>* GST charges are extra as applicable.</p>
                  <p>** No GST on internal bookings from institute funds.</p>
                  <p>
                    *** If payment is from institute/project fund, no bill is raised; amount is deducted from
                    respective budget head.
                  </p>
                  <p>
                    **** Booking approval is processed in the workflow stages as per applicable authority.
                  </p>
                </div>
              </div>
            </details>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Number of Rooms Required *</label>
                <input name="numberOfRoomsRequired" type="number" min={1} required className="input" />
              </div>
              <div>
                <label className="label">Occupancy Type *</label>
                <select name="occupancyType" required className="input">
                  <option value="">Select</option>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                </select>
              </div>
              <div>
                <label className="label">Arrival Date *</label>
                <input name="arrivalDate" type="date" required className="input" />
              </div>
              <div>
                <label className="label">Arrival Time *</label>
                <input
                  name="arrivalTime"
                  type="time"
                  value={FIXED_ARRIVAL_TIME}
                  readOnly
                  required
                  className="input bg-slate-100"
                />
              </div>
              <div>
                <label className="label">Departure Date *</label>
                <input name="departureDate" type="date" required className="input" />
              </div>
              <div>
                <label className="label">Departure Time *</label>
                <input
                  name="departureTime"
                  type="time"
                  value={FIXED_DEPARTURE_TIME}
                  readOnly
                  required
                  className="input bg-slate-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Purpose of Booking *</label>
                <textarea
                  name="purposeOfBooking"
                  required
                  rows={3}
                  className="input resize-none"
                  placeholder="Official purpose of stay"
                />
              </div>
              <div>
                <label className="label">Room Type *</label>
                <select
                  name="roomType"
                  required
                  className="input"
                  value={roomType}
                  onChange={(event) => {
                    const nextRoomType = event.target.value as "executive_suite" | "business_room" | "";
                    setRoomType(nextRoomType);
                    setBookingCategory("");
                  }}
                >
                  <option value="">Select</option>
                  <option value="executive_suite">Executive Suite</option>
                  <option value="business_room">Business Room</option>
                </select>
              </div>
              <div>
                <label className="label">Booking Category *</label>
                <select
                  name="bookingCategory"
                  required
                  className="input"
                  value={bookingCategory}
                  onChange={(event) => setBookingCategory(event.target.value)}
                >
                  <option value="">Select category</option>
                  {visibleCategoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Booking Date *</label>
                <input
                  name="bookingDate"
                  type="date"
                  value={bookingDate}
                  readOnly
                  required
                  className="input bg-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Undertaking</h2>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <p>(a) I hereby undertake to vacate the room in the guest house, if allotted, on expiry of the sanctioned period.</p>
              <p>(b) I have read the terms and conditions and these are acceptable to me.</p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">(c) Boarding/Lodging charges paid by Guest? *</label>
                <select name="boardingLodgingByGuest" required className="input">
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="label">(e) Is Institute Guest? *</label>
                <select
                  name="isInstituteGuest"
                  required
                  className="input"
                  value={isInstituteGuest}
                  onChange={(event) => setIsInstituteGuest(event.target.value as "yes" | "no" | "")}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="sm:col-span-2 flex items-start gap-2 text-sm text-slate-700">
                  <input
                    name="guestToBeCharged"
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={guestToBeCharged}
                    onChange={(event) => setGuestToBeCharged(event.target.checked)}
                  />
                  <span>(d) Guest to be charged</span>
                </label>
              </div>
              <div>
                <label className="label">Project no / Budget Head / Other</label>
                <input
                  name="budgetDepartment"
                  className="input"
                  placeholder="Write here if guest is not to be charged"
                  required={!guestToBeCharged}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">(f) Remarks (if any)</label>
                <textarea name="remarksIfAny" rows={2} className="input resize-none" placeholder="Optional remarks" />
              </div>
              <label className="sm:col-span-2 flex items-start gap-2 text-sm text-slate-700">
                <input name="undertakingAccepted" type="checkbox" required className="mt-1 h-4 w-4" />
                <span>I confirm clauses (a) and (b) above and accept the guest house terms.</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Proposer Details</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Name of Proposer *</label>
                <input name="proposerName" required className="input" />
              </div>
              <div>
                <label className="label">Designation *</label>
                <input name="proposerDesignation" required className="input" />
              </div>
              <div>
                <label className="label">Department *</label>
                <input name="proposerDepartment" required className="input" />
              </div>
              <div>
                <label className="label">Employee Code</label>
                <input name="proposerEmployeeCode" className="input" />
              </div>
              <div>
                <label className="label">Entry Number</label>
                <input name="proposerEntryNumber" className="input" />
              </div>
              <div>
                <label className="label">Mobile Number *</label>
                <input name="proposerMobile" required className="input" />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? "Submitting..." : "Submit Guest House Form"}
          </button>
        </form>
      </div>
    </div>
  );
}
