import Link from "next/link";
import { getDashboardPathForRole, isInstituteEmail, requireUser, toDisplayRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PendingRoleAutoRedirect } from "./auto-redirect";

export default async function PendingRolePage() {
  const user = await requireUser();

  if (user.role) {
    if (user.role === "SYSTEM_ADMIN") {
      redirect("/admin");
    }
    redirect(await getDashboardPathForRole(user.role));
  }

  if (!isInstituteEmail(user.email)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-14">
      <main className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Access Pending
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Role assignment required
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Signed in as <span className="font-semibold">{user.email}</span>.
          Your current role is <span className="font-semibold">{toDisplayRole(user.role)}</span>.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          A System Admin will assign your role before you can submit forms or
          perform approvals.
        </p>
        <PendingRoleAutoRedirect />

        <div className="mt-6 flex gap-3">
          <Link prefetch={false}
            href="/"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
          >
            Go to home
          </Link>
          <Link prefetch={false}
            href="/sign-in"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Sign in with another account
          </Link>
        </div>
      </main>
    </div>
  );
}
