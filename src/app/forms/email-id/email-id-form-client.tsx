"use client";

import { useState, useTransition } from "react";
import { submitEmailIdForm } from "@/app/actions/email-id";

const INITIALS = ["Dr.", "Mr.", "Ms."];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const ROLES = [
  "Student",
  "Faculty",
  "Non-tech Staff",
  "Tech Staff",
  "Administration",
];
const DEPARTMENTS = [
  "CSE",
  "EE",
  "IR",
  "SA",
  "Accounts",
  "Establishment",
  "Research & Development",
  "Other",
];
const ENGAGEMENT_TYPES = [
  "Permanent",
  "Temp / Project Staff",
  "Contract",
  "Visiting",
  "Guest",
];

export function EmailIdFormClient() {
  const [isPending, startTransition] = useTransition();
  const [natureOfEngagement, setNatureOfEngagement] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isTemp =
    natureOfEngagement.toLowerCase().includes("temp") ||
    natureOfEngagement.toLowerCase().includes("project");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await submitEmailIdForm(fd);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            IIT Ropar — Institute Forms
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Request for Email ID
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Fill in your details below. Your request will be forwarded to the
            appropriate authority.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
              Personal Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Initials *</label>
                <select name="initials" required className="input">
                  <option value="">Select</option>
                  {INITIALS.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">First Name *</label>
                <input
                  name="firstName"
                  required
                  placeholder="First name"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input
                  name="lastName"
                  required
                  placeholder="Last name"
                  className="input"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Gender *</label>
              <select name="gender" required className="input">
                <option value="">Select</option>
                {GENDERS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="label">Permanent Address *</label>
              <textarea
                name="permanentAddress"
                required
                rows={3}
                placeholder="Enter permanent address"
                className="input resize-none"
              />
            </div>
          </section>

          <hr className="border-slate-100" />

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
              Employment Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Organisation / Roll ID *</label>
                <input
                  name="orgId"
                  required
                  placeholder="e.g. 2023CSB1234"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Nature of Engagement *</label>
                <select
                  name="natureOfEngagement"
                  required
                  className="input"
                  value={natureOfEngagement}
                  onChange={(e) => setNatureOfEngagement(e.target.value)}
                >
                  <option value="">Select</option>
                  {ENGAGEMENT_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Role *</label>
                <select name="role" required className="input">
                  <option value="">Select</option>
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Department / Section *</label>
                <select
                  name="department"
                  required
                  className="input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">Select</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>
              {department === "Other" && (
                <div className="sm:col-span-2">
                  <label className="label">Other Department / Section *</label>
                  <input
                    name="departmentOther"
                    required
                    placeholder="Enter department / section"
                    className="input"
                  />
                </div>
              )}
            </div>

            {isTemp && (
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Temp / Project Staff Details
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Project Name *</label>
                    <input
                      name="projectName"
                      required
                      placeholder="Project name"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Joining Date *</label>
                    <input name="joiningDate" type="date" required className="input" />
                  </div>
                  <div>
                    <label className="label">Anticipated End Date *</label>
                    <input
                      name="anticipatedEndDate"
                      type="date"
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Reporting Officer Name *</label>
                    <input
                      name="reportingOfficerName"
                      required
                      placeholder="Officer name"
                      className="input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Reporting Officer Email *</label>
                    <input
                      name="reportingOfficerEmail"
                      type="email"
                      required
                      placeholder="Officer email"
                      className="input"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <hr className="border-slate-100" />

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
              Alternate Way to Communicate
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Mobile No. *</label>
                <input
                  name="mobileNo"
                  type="tel"
                  required
                  placeholder="+91 XXXXX XXXXX"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Alternate (non-IIT Ropar) Email *</label>
                <input
                  name="alternateEmail"
                  type="email"
                  required
                  placeholder="your@email.com"
                  className="input"
                />
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700">
              Consent
            </h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 leading-relaxed">
              I have read the email policies and hereby declare that I hereby
              abide with the Institute email policies (released on 8/9/21) and I
              understand my responsibilities as a user of email facility provided
              by IIT Ropar. I shall not share my email account details with
              anyone. I will use (tick one of the alternates) alternate email id
              / mobile no given above for password recovery.
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-3">
              <input
                name="consentAccepted"
                type="checkbox"
                required
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 accent-indigo-600"
              />
              <span className="text-sm text-slate-700">
                I have read and agree to the above consent statement. *
              </span>
            </label>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60"
            >
              {isPending ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
