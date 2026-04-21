"use client";

import { useEffect, useState, useTransition } from "react";
import { submitVehicleStickerForm } from "@/app/actions/vehicle-sticker";

function getTodayLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function VehicleStickerFormClient() {
  const [error, setError] = useState<string | null>(null);
  const [declarationDate, setDeclarationDate] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDeclarationDate(getTodayLocalDate());
  }, []);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("declarationDate", declarationDate || getTodayLocalDate());

    startTransition(async () => {
      try {
        await submitVehicleStickerForm(formData);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            IIT Ropar
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Vehicle Sticker Application</h1>
          <p className="mt-1 text-sm text-slate-500">Digital form based on the official vehicle sticker format.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Applicant Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Name of Applicant *</label>
                <input name="applicantName" required className="input" placeholder="Full name" />
              </div>
              <div>
                <label className="label">Designation *</label>
                <input name="designation" required className="input" placeholder="Designation" />
              </div>
              <div>
                <label className="label">Entry / Employee No *</label>
                <input name="entryOrEmpNo" required className="input" placeholder="Entry no / Employee no" />
              </div>
              <div>
                <label className="label">Department / Section *</label>
                <input name="department" required className="input" placeholder="Department" />
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Address *</label>
              <textarea name="address" rows={3} required className="input resize-none" placeholder="Address" />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Phone / Mobile No *</label>
                <input name="phone" required className="input" placeholder="Phone number" />
              </div>
              <div>
                <label className="label">Email *</label>
                <input name="emailContact" type="email" required className="input" placeholder="Email" />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Driving License No *</label>
                <input name="drivingLicenseNo" required className="input" placeholder="DL number" />
              </div>
              <div>
                <label className="label">DL Valid Upto *</label>
                <input name="dlValidUpto" type="date" required className="input" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Vehicle Details</h2>
            <div className="mb-4 rounded-xl border border-slate-200 p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="label">Registration No *</label>
                  <input name="vehicleRegistrationNo" required className="input" placeholder="PB.." />
                </div>
                <div>
                  <label className="label">Type *</label>
                  <select name="vehicleType" required className="input" defaultValue="">
                    <option value="">Select</option>
                    <option value="2W">2W</option>
                    <option value="4W">4W</option>
                  </select>
                </div>
                <div>
                  <label className="label">Make / Model *</label>
                  <input name="vehicleMakeModel" required className="input" placeholder="Make model" />
                </div>
                <div>
                  <label className="label">Colour *</label>
                  <input name="vehicleColour" required className="input" placeholder="Colour" />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Required Attachments</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Applicant Photo *</label>
                <input name="applicantPhoto" type="file" accept="image/*" required className="input" />
              </div>
              <div>
                <label className="label">Vehicle RC *</label>
                <input name="vehicleRc" type="file" accept="image/*,.pdf" required className="input" />
              </div>
              <div>
                <label className="label">Driving License (DL) *</label>
                <input name="drivingLicenseDoc" type="file" accept="image/*,.pdf" required className="input" />
              </div>
              <div>
                <label className="label">College ID *</label>
                <input name="collegeIdDoc" type="file" accept="image/*,.pdf" required className="input" />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Declaration</h2>
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              I hereby solemnly declare that the information provided above is correct to the best of my knowledge and belief.
            </p>
            <div className="mt-4">
              <label className="label">Date *</label>
              <input
                name="declarationDate"
                type="date"
                value={declarationDate}
                readOnly
                required
                className="input max-w-xs bg-slate-100"
              />
            </div>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? "Submitting..." : "Submit Vehicle Sticker Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
