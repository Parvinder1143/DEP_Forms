import type { ReactNode } from "react";
import Link from "next/link";
import { getDashboardQueueLinksForRole, getDashboardQueueLinksForUser } from "@/lib/auth";
import type { AppRole } from "@/lib/mock-db";

type StakeholderDashboardScaffoldProps = {
  roleLabel: string;
  baseRoleLabel?: string;
  isTemporarilyAssigned?: boolean;
  userId?: string;
  activeRole?: AppRole | null;
  queueLinkRole?: AppRole | null;
  children: ReactNode;
};

export async function StakeholderDashboardScaffold({
  roleLabel,
  baseRoleLabel,
  isTemporarilyAssigned,
  userId,
  activeRole,
  queueLinkRole,
  children,
}: StakeholderDashboardScaffoldProps) {
  const queueLinks = userId
    ? await getDashboardQueueLinksForUser(userId, queueLinkRole ?? activeRole ?? null)
    : await getDashboardQueueLinksForRole(activeRole ?? null);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-7">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
          <div>
            <h1 className="leading-tight">Dashboard</h1>
            <p className="section-lead mt-2">Manage your institutional forms</p>
          </div>
          <Link prefetch={false}
            href="/dashboard/delegation"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 11h6"></path><path d="M19 8v6"></path><path d="M4 19h8"></path><path d="M8 15v8"></path><path d="M4 11h8"></path><path d="M8 7v8"></path><path d="M16 19h6"></path><path d="M19 15v8"></path></svg>
            Unavailability & Delegation
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="dashboard-card rounded-3xl p-5">
          {isTemporarilyAssigned ? (
            <div className="space-y-1">
              <p className="section-lead text-slate-700">
                Temporarily assigned role: <span className="font-semibold text-slate-900">{roleLabel}</span>
              </p>
              <p className="text-sm font-medium text-amber-700">
                Base role: <span className="font-semibold">{baseRoleLabel ?? "Unassigned"}</span>
              </p>
            </div>
          ) : (
            <p className="section-lead text-slate-700">
              Assigned role: <span className="font-semibold text-slate-900">{roleLabel}</span>
            </p>
          )}
        </div>

        {queueLinks.length > 1 ? (
          <div className="dashboard-card rounded-3xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              {queueLinks.map((link) => (
                <Link
                  prefetch={false}
                  key={link.path}
                  href={link.path}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
