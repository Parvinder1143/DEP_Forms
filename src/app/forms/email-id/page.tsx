import { requireApplicantFormAccess } from "@/lib/auth";
import { EmailIdFormClient } from "./email-id-form-client";
import { hasIssuedEmailForUser, listEmailIdFormsBySubmitter } from "@/lib/email-id-store";
import Link from "next/link";

export default async function EmailIdFormPage() {
  const user = await requireApplicantFormAccess("email-id");
  const alreadyIssued = await hasIssuedEmailForUser(user.id);

  if (alreadyIssued) {
    const forms = await listEmailIdFormsBySubmitter(user.id);
    const latestIssued = forms.find((form) => form.status === "ISSUED");
    const issuedEmail = latestIssued?.approvals.find((approval) => approval.stage === 2)?.assignedEmailId;

    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-green-200 bg-green-50 p-6">
          <h1 className="text-2xl font-bold text-green-900">Email ID already issued</h1>
          <p className="mt-2 text-sm text-green-800">
            You already have an approved Email ID request, so a new submission is not allowed.
          </p>
          {latestIssued && (
            <p className="mt-2 text-sm text-green-800">
              Existing request reference: <span className="font-semibold">{latestIssued.id}</span>
            </p>
          )}
          {issuedEmail && (
            <p className="mt-2 text-sm text-green-800">
              Issued Email ID: <span className="font-semibold">{issuedEmail}</span>
            </p>
          )}
          <div className="mt-5">
            <Link prefetch={false}
              href={latestIssued ? `/forms/email-id/${latestIssued.id}` : "/"}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              View existing request
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <EmailIdFormClient />;
}
