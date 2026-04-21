"use client";

import { submitIdentityCardForm } from "@/app/actions/identity-card";
import { useMemo, useState } from "react";

export function IdentityCardFormClient({
  userEmail,
  userFullName,
}: {
  userEmail: string;
  userFullName: string;
}) {
  const [employmentType, setEmploymentType] = useState("");
  const [cardType, setCardType] = useState("");

  const requiresContractUpto = useMemo(() => {
    const normalized = employmentType.toLowerCase();
    return normalized === "temporary" || normalized === "on contract";
  }, [employmentType]);

  const requiresRenewalOrDuplicateFields = cardType === "renewal" || cardType === "duplicate";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Identity Card Workflow</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Identity Card Request Form</h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit complete details for fresh, renewal, or duplicate identity card requests.
          </p>
        </div>

        <form action={submitIdentityCardForm} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Applicant Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Name in Capital Letters *</label>
                <input name="nameInCapitals" required className="input" defaultValue={userFullName} />
              </div>
              <div>
                <label className="label">Employee / Entry Code *</label>
                <input name="employeeCode" required className="input" />
              </div>
              <div>
                <label className="label">Designation *</label>
                <input name="designation" required className="input" />
              </div>
              <div>
                <label className="label">Employment Type *</label>
                <select
                  name="employmentType"
                  required
                  className="input"
                  value={employmentType}
                  onChange={(event) => setEmploymentType(event.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Temporary">Temporary</option>
                  <option value="On contract">On contract</option>
                </select>
              </div>
              <div>
                <label className="label">Contract Upto {requiresContractUpto ? "*" : ""}</label>
                <input name="contractUpto" type="date" className="input" required={requiresContractUpto} />
                <p className="mt-1 text-xs text-slate-500">
                  Mandatory for Temporary and On contract employment type.
                </p>
              </div>
              <div>
                <label className="label">Department / Center / School / Section *</label>
                <input name="department" required className="input" />
              </div>
              <div>
                <label className="label">Father&apos;s / Husband&apos;s Name *</label>
                <input name="fathersHusbandName" required className="input" />
              </div>
              <div>
                <label className="label">Date of Birth *</label>
                <input name="dateOfBirth" type="date" required className="input" />
              </div>
              <div>
                <label className="label">Date of Joining *</label>
                <input name="dateOfJoining" type="date" required className="input" />
              </div>
              <div>
                <label className="label">Blood Group *</label>
                <input name="bloodGroup" required className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Present Address Line 1 *</label>
                <input name="presentAddress" required className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Present Address Line 2 *</label>
                <input name="presentAddressLine2" required className="input" />
              </div>
              <div>
                <label className="label">Office Phone *</label>
                <input name="officePhone" required className="input" />
              </div>
              <div>
                <label className="label">Mobile Number *</label>
                <input name="mobileNumber" required className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Email ID *</label>
                <input
                  name="emailId"
                  type="email"
                  required
                  className="input bg-slate-100 text-slate-600"
                  value={userEmail}
                  readOnly
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Card Request Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Card Type *</label>
                <select
                  name="cardType"
                  required
                  className="input"
                  value={cardType}
                  onChange={(event) => setCardType(event.target.value)}
                >
                  <option value="">Select</option>
                  <option value="fresh">Fresh</option>
                  <option value="renewal">Renewal</option>
                  <option value="duplicate">Duplicate</option>
                </select>
              </div>
              <div>
                <label className="label">Previous Card Validity {requiresRenewalOrDuplicateFields ? "*" : ""}</label>
                <input
                  name="previousCardValidity"
                  type="date"
                  className="input"
                  required={requiresRenewalOrDuplicateFields}
                />
                <p className="mt-1 text-xs text-slate-500">Mandatory when card type is Renewal or Duplicate.</p>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Reason (required for renewal/duplicate)</label>
                <textarea name="reasonForRenewal" className="input h-20" required={requiresRenewalOrDuplicateFields} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">Attachments</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Passport Photo *</label>
                <input name="passportPhoto" type="file" accept="image/*" required className="input" />
              </div>
              <div>
                <label className="label">Previous ID Card Copy (required for renewal/duplicate)</label>
                <input
                  name="previousIdCard"
                  type="file"
                  accept="image/*,.pdf"
                  className="input"
                  required={requiresRenewalOrDuplicateFields}
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Submit Identity Card Request
          </button>
        </form>
      </div>
    </div>
  );
}
