import Link from "next/link";
import {
  getCurrentUser,
  getDashboardPathForUser,
  toDisplayRole,
} from "@/lib/auth";
import { getActiveDelegatedRoleForUser } from "@/lib/delegation-store";
import { signOut } from "@/app/actions/auth";

export async function TopNav() {
  const user = await getCurrentUser();
  const delegatedRole = user ? await getActiveDelegatedRoleForUser(user.id) : null;
  const effectiveRole = delegatedRole ?? user?.role ?? null;
  const dashboardPath = user ? await getDashboardPathForUser(user.id, user.role) : "/";
  const isActingAsDelegatedRole = Boolean(user?.role && delegatedRole && delegatedRole !== user.role);

  return (
    <header className="print-hidden fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/92 backdrop-blur-md shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link prefetch={false}
          href={user ? dashboardPath : "/"}
          className="flex items-center gap-2.5 text-sm font-semibold text-gray-900"
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #111111 0%, #065f46 100%)" }}
          >
            IR
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-bold">IIT Ropar</span>
            <span className="text-xs font-medium text-emerald-700">Forms Portal</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm text-gray-600 md:flex">
          {(!user || dashboardPath === "/") && (
            <Link prefetch={false}
              href="/"
              className="rounded-lg px-3 py-2 font-medium transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Home
            </Link>
          )}
          {effectiveRole === "SYSTEM_ADMIN" && (
            <Link prefetch={false}
              href="/admin"
              className="rounded-lg px-3 py-2 font-medium transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Admin
            </Link>
          )}
          {user && effectiveRole !== "SYSTEM_ADMIN" && dashboardPath !== "/" && (
            <Link prefetch={false}
              href={dashboardPath}
              className="rounded-lg px-3 py-2 font-medium transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end justify-center gap-0.5 text-right leading-tight">
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm whitespace-nowrap">
                  {isActingAsDelegatedRole
                    ? `Temporarily assigned: ${toDisplayRole(effectiveRole)}`
                    : toDisplayRole(effectiveRole)}
                </span>
                {isActingAsDelegatedRole ? (
                  <span className="text-[11px] font-medium text-amber-700 whitespace-nowrap">
                    Base: {toDisplayRole(user?.role ?? null)}
                  </span>
                ) : null}
                <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">{user.email}</span>
              </div>
              <form action={signOut}>
                <button
                  type="submit"
                  className="pop-cta rounded-lg bg-gradient-to-r from-black via-gray-900 to-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link prefetch={false}
                href="/sign-in"
                className="pop-cta rounded-lg bg-gradient-to-r from-black via-gray-900 to-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
              >
                Sign in
              </Link>
              <Link prefetch={false}
                href="/sign-up"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-emerald-400 hover:text-emerald-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
