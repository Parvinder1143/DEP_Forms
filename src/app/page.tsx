import Link from "next/link";
import {
  canAccessApplicantForm,
  getApplicantFormAccess,
  getCurrentUser,
  getDashboardPathForUser,
  getDashboardQueueLinksForUser,
  isInstituteEmail,
  toDisplayRole,
} from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveDelegatedRoleForUser } from "@/lib/delegation-store";
import { listGuestHouseFormsBySubmitterEmail } from "@/lib/guest-house-store";
import { getGuestHouseStatusLabel } from "@/lib/guest-house-status";
import { listEmailIdFormsBySubmitter } from "@/lib/email-id-store";
import { getEmailFormStatusText } from "@/lib/email-id-status";
import { listVehicleStickerFormsBySubmitterEmail } from "@/lib/vehicle-sticker-store";
import { getVehicleStickerStatusText } from "@/lib/vehicle-sticker-status";
import { listHostelUndertakingFormsBySubmitterEmail } from "@/lib/hostel-undertaking-store";
import { getHostelUndertakingStatusText } from "@/lib/hostel-undertaking-status";
import { listIdentityCardFormsBySubmitterEmail } from "@/lib/identity-card-store";
import { getIdentityCardStatusText } from "@/lib/identity-card-status";
import { HostelUndertakingSubmissionsTable } from "@/components/applicant/hostel-undertaking-submissions-table";
import { EmailIdSubmissionsTable } from "@/components/applicant/email-id-submissions-table";
import { VehicleStickerSubmissionsTable } from "@/components/applicant/vehicle-sticker-submissions-table";
import { IdentityCardSubmissionsTable } from "@/components/applicant/identity-card-submissions-table";
import { GuestHouseSubmissionsTable } from "@/components/applicant/guest-house-submissions-table";

const FORMS = [
  {
    key: "email-id",
    name: "Email ID Request",
    description: "Request an IIT Ropar institutional email ID.",
    href: "/forms/email-id",
  },
  {
    key: "vehicle-sticker",
    name: "Vehicle Sticker",
    description: "Apply for a vehicle sticker for campus access.",
    href: "/forms/vehicle-sticker",
  },
  {
    key: "hostel-undertaking",
    name: "Hostel Undertaking",
    description: "Submit hostel accommodation undertaking form.",
    href: "/forms/hostel-undertaking",
  },
  {
    key: "identity-card",
    name: "Identity Card",
    description: "Request a new or replacement IIT Ropar identity card.",
    href: "/forms/identity-card",
  },
  {
    key: "guest-house",
    name: "Guest House Booking",
    description: "Apply for guest house accommodation on campus.",
    href: "/forms/guest-house",
  },
] as const;

const FORM_ACCENTS: Record<string, { a: string; b: string; c: string }> = {
  "email-id": { a: "#bbf7d0", b: "#6ee7b7", c: "#d9f99d" },
  "identity-card": { a: "#ddd6fe", b: "#c4b5fd", c: "#a5b4fc" },
  "vehicle-sticker": { a: "#fde68a", b: "#fcd34d", c: "#fdba74" },
  "guest-house": { a: "#99f6e4", b: "#5eead4", c: "#86efac" },
  "hostel-undertaking": { a: "#f5d0fe", b: "#f0abfc", c: "#c4b5fd" },
};

const FORM_DOWNLOADS: Record<string, string> = {
  "email-id": "email-id-creation-form-new.pdf",
  "identity-card": "Identity%20Card%20Form.docx",
  "vehicle-sticker": "Vehicle%20Sticker%20Form_Students.pdf",
  "guest-house": "Revised-Guest-House-Reservation-Form%20w.e.f.01-04-2025.docx",
  "hostel-undertaking": "UNDERTAKING%20FORM%20(1)-aug-13.pdf",
};

const defaultAccent = {
  "--accent-a": "#e5e7eb",
  "--accent-b": "#d1d5db",
  "--accent-c": "#cbd5e1",
} as React.CSSProperties;

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="page-enter px-4 pb-16 pt-4">
        <div className="mx-auto max-w-6xl space-y-12">
          <section className="pop-panel rounded-3xl border border-white/70 bg-white/90 px-6 py-12 text-center shadow-xl backdrop-blur">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg"
                style={{ background: "linear-gradient(135deg, #111111 0%, #065f46 100%)" }}
              >
                IR
              </span>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                  Indian Institute of Technology Ropar
                </p>
                <h1 className="electric-title text-4xl font-black leading-tight sm:text-5xl">
                  Official Forms Portal
                </h1>
                <p className="text-lg text-gray-600 sm:text-xl">
                  Streamlined institutional forms — request, track, and complete submissions securely.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link prefetch={false}
                  href="/sign-in"
                  className="pop-cta rounded-xl bg-gradient-to-r from-black via-gray-900 to-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-lg"
                >
                  Sign in to continue
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Available forms</h2>
              <p className="text-sm text-gray-500">Preview what you can submit after signing in</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {FORMS.map((form) => {
                const accent = FORM_ACCENTS[form.key];
                const downloadHref = FORM_DOWNLOADS[form.key];
                const style = (accent
                  ? {
                      "--accent-a": accent.a,
                      "--accent-b": accent.b,
                      "--accent-c": accent.c,
                    }
                  : defaultAccent) as React.CSSProperties;

                return (
                  <div
                    key={form.key}
                    className="pop-card flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm transition-all duration-200"
                    style={style}
                  >
                    <div className="flex flex-1 flex-col gap-2">
                      <h3 className="text-sm font-bold text-gray-900">{form.name}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{form.description}</p>
                    </div>
                    <div className="mt-auto pt-5">
                      <a
                        href={`/forms/${downloadHref}`}
                        download
                        className="pop-cta block rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-center text-sm font-semibold text-gray-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        Download form
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (user.role === "SYSTEM_ADMIN") {
    redirect("/admin");
  }

  const delegatedRole = await getActiveDelegatedRoleForUser(user.id);
  const effectiveRole = delegatedRole ?? user.role;
  const effectiveDashboardPath = await getDashboardPathForUser(user.id, user.role);
  const queueLinks = await getDashboardQueueLinksForUser(user.id, user.role);

  if (effectiveDashboardPath !== "/") {
    redirect(effectiveDashboardPath);
  }

  if (isInstituteEmail(user.email) && !effectiveRole) {
    redirect("/pending-role");
  }

  const isExternalUser = !isInstituteEmail(user.email);
  const applicantFormAccess = getApplicantFormAccess(user.email, user.role);
  const isExternalNoRole = isExternalUser && !user.role;
  const isStudentLike =
    user.role === "STUDENT" || user.role === "INTERN" || user.role === "EMPLOYEE";
  const canReview = queueLinks.length > 0;

  const visibleForms = FORMS.filter((f) => canAccessApplicantForm(user.email, user.role, f.key));

  const emailSubmissions = await listEmailIdFormsBySubmitter(user.id);
  const vehicleSubmissions = await listVehicleStickerFormsBySubmitterEmail(user.email);
  const hostelUndertakingSubmissions = await listHostelUndertakingFormsBySubmitterEmail(user.email);
  const identityCardSubmissions = await listIdentityCardFormsBySubmitterEmail(user.email);
  const guestHouseSubmissions = await listGuestHouseFormsBySubmitterEmail(user.email);

  const emailSubmissionRows = emailSubmissions.map((submission) => ({
    id: submission.id,
    createdAt:
      submission.createdAt instanceof Date
        ? submission.createdAt.toISOString()
        : String(submission.createdAt),
    statusText: getEmailFormStatusText({ status: submission.status, approvals: submission.approvals }),
  }));

  const vehicleSubmissionRows = vehicleSubmissions.map((submission) => ({
    submissionId: submission.submissionId,
    createdAt:
      submission.createdAt instanceof Date
        ? submission.createdAt.toISOString()
        : String(submission.createdAt),
    statusText: getVehicleStickerStatusText(submission),
  }));

  const identityCardSubmissionRows = identityCardSubmissions.map((submission) => ({
    submissionId: submission.submissionId,
    createdAt:
      submission.createdAt instanceof Date
        ? submission.createdAt.toISOString()
        : String(submission.createdAt),
    statusText: getIdentityCardStatusText(submission),
  }));

  const hostelUndertakingSubmissionRows = hostelUndertakingSubmissions.map((submission) => ({
    submissionId: submission.submissionId,
    createdAt:
      submission.createdAt instanceof Date
        ? submission.createdAt.toISOString()
        : String(submission.createdAt),
    statusText: getHostelUndertakingStatusText(submission),
  }));

  const guestHouseSubmissionRows = guestHouseSubmissions.map((submission) => ({
    submissionId: submission.submissionId,
    guestName: submission.guestName,
    createdAt:
      submission.createdAt instanceof Date
        ? submission.createdAt.toISOString()
        : String(submission.createdAt),
    statusText: getGuestHouseStatusLabel(submission.overallStatus),
  }));

  return (
    <main className="page-enter px-4 pb-16">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="pop-panel rounded-3xl border border-white/70 bg-white/90 px-6 py-8 shadow-xl backdrop-blur">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">IIT Ropar</p>
            <h1 className="electric-title text-4xl font-black leading-tight sm:text-5xl">Institute Forms Platform</h1>
            <p className="text-base text-gray-600 sm:text-lg">
              {isExternalNoRole
                ? "Non-IITRPR users can submit only Email ID and Guest House forms."
                : user.role === "STUDENT"
                  ? "Students can fill all 5 forms."
                  : user.role === "INTERN"
                    ? "Interns can fill all 5 forms."
                    : user.role === "EMPLOYEE"
                      ? "Employees can fill Email ID, Identity Card, Vehicle Sticker, and Guest House forms."
                      : "You can access forms based on your role and track your submissions."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
                Signed in as {user.email} ({toDisplayRole(user.role)})
              </span>
              {canReview && (
                <Link prefetch={false}
                  href={effectiveDashboardPath}
                  className="pop-cta rounded-lg bg-gradient-to-r from-black via-gray-900 to-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-md"
                >
                  Open dashboard
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Start a submission</h2>
              <p className="text-sm text-gray-500">Pick a form to begin. Availability is filtered by your role.</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleForms.map((form) => {
              const accent = FORM_ACCENTS[form.key];
              const style = (accent
                ? {
                    "--accent-a": accent.a,
                    "--accent-b": accent.b,
                    "--accent-c": accent.c,
                  }
                : defaultAccent) as React.CSSProperties;

              return (
                <div
                  key={form.name}
                  className="pop-card rounded-2xl bg-white p-6 shadow-sm transition-all duration-150"
                  style={style}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-semibold text-gray-900">{form.name}</h2>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Available
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{form.description}</p>

                  <div className="mt-5 flex gap-2">
                    <Link prefetch={false}
                      href={form.href}
                      className="pop-cta flex-1 rounded-lg bg-gradient-to-r from-black via-gray-900 to-emerald-700 px-3 py-2 text-center text-xs font-semibold text-white shadow-md"
                    >
                      Fill form
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {isStudentLike && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">My submissions</h2>

            {applicantFormAccess["email-id"] && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-md">
                <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
                  Email ID Forms
                </div>
                {emailSubmissions.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-gray-500">No email ID submissions yet.</div>
                ) : (
                  <EmailIdSubmissionsTable submissions={emailSubmissionRows} />
                )}
              </div>
            )}

            {applicantFormAccess["vehicle-sticker"] && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-md">
                <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
                  Vehicle Sticker Forms
                </div>
                {vehicleSubmissions.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-gray-500">No vehicle sticker submissions yet.</div>
                ) : (
                  <VehicleStickerSubmissionsTable submissions={vehicleSubmissionRows} />
                )}
              </div>
            )}

            {applicantFormAccess["identity-card"] && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-md">
                <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
                  Identity Card Forms
                </div>
                {identityCardSubmissions.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-gray-500">No identity card submissions yet.</div>
                ) : (
                  <IdentityCardSubmissionsTable submissions={identityCardSubmissionRows} />
                )}
              </div>
            )}

            {applicantFormAccess["guest-house"] && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-md">
                <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
                  Guest House Forms
                </div>
                {guestHouseSubmissions.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-gray-500">No guest house submissions yet.</div>
                ) : (
                  <GuestHouseSubmissionsTable submissions={guestHouseSubmissionRows} />
                )}
              </div>
            )}

            {applicantFormAccess["hostel-undertaking"] && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-md">
                <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
                  Hostel Undertaking Forms
                </div>
                {hostelUndertakingSubmissions.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-gray-500">No hostel undertaking submissions yet.</div>
                ) : (
                  <HostelUndertakingSubmissionsTable submissions={hostelUndertakingSubmissionRows} />
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
