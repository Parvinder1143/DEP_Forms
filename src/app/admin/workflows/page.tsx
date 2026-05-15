import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { WorkflowEditor } from "@/components/admin/workflow-editor";
import { listWorkflows } from "@/lib/workflow-engine";
import { listActiveDelegations } from "@/lib/delegation-store";
import { listCustomRoles } from "@/lib/custom-role-store";
import { BUILT_IN_ROLE_OPTIONS } from "@/lib/roles";
import { getRoleLabel } from "@/lib/roles";
import { listUsers } from "@/lib/user-store";

export default async function AdminWorkflowsPage() {
  await requireRole(["SYSTEM_ADMIN"]);

  const workflows = await listWorkflows();
  const activeDelegations = await listActiveDelegations();
  const customRoles = await listCustomRoles();
  const users = await listUsers();
  const roleOptions = Array.from(
    new Set([
      ...BUILT_IN_ROLE_OPTIONS.map((role) => String(role).toUpperCase()),
      ...customRoles.map((role) => role.roleCode.toUpperCase()),
    ])
  );
  const queueLabelByKey: Record<string, string> = {
    "email-id": "Email Queue",
    "vehicle-sticker": "Vehicle Sticker Queue",
    "identity-card": "Identity Card Queue",
    "guest-house": "Guest House Queue",
    "hostel-undertaking": "Hostel Undertaking Queue",
  };
  const delegatedUserLabelById: Record<string, string> = Object.fromEntries(
    users.map((user) => [
      user.id,
      user.role ? getRoleLabel(user.role) : user.fullName ?? user.email,
    ])
  );

  const targetTextByDelegationId: Record<string, string> = Object.fromEntries(
    activeDelegations.map((delegation) => {
      const baseQueueText = delegation.queueDetails
        .map((detail) => {
          const queueLabel = queueLabelByKey[detail.queueKey] ?? detail.queueKey;
          const originalLabel = delegatedUserLabelById[detail.originalUserId] ?? detail.originalUserId;
          return `${queueLabel}: ${originalLabel}`;
        })
        .join(" | ");

      const overrideQueueText = delegation.queueDetails
        .filter((detail) => detail.hasOverride)
        .map((detail) => {
          const originalLabel = delegatedUserLabelById[detail.originalUserId] ?? detail.originalUserId;
          const effectiveLabel = detail.effectiveUserId
            ? delegatedUserLabelById[detail.effectiveUserId] ?? detail.effectiveUserId
            : "Skipped";
          const queueLabel = queueLabelByKey[detail.queueKey] ?? detail.queueKey;
          const starts = detail.overrideStartsAt
            ? new Date(detail.overrideStartsAt).toLocaleDateString("en-IN")
            : null;
          const ends = detail.overrideEndsAt
            ? new Date(detail.overrideEndsAt).toLocaleDateString("en-IN")
            : null;
          const windowText = starts && ends ? ` (${starts} to ${ends})` : "";
          return `${queueLabel}: ${originalLabel} -> ${effectiveLabel}${windowText}`;
        })
        .join(" | ");

      const fallbackText = (delegation.replacementName ?? delegation.replacementEmail).trim();
      const layeredText = [
        baseQueueText ? `Base: ${baseQueueText}` : "",
        overrideQueueText ? `Temp override: ${overrideQueueText}` : "",
      ]
        .filter(Boolean)
        .join(" ; ");

      return [
        delegation.id,
        layeredText || fallbackText || "Replacement",
      ];
    })
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link prefetch={false}
                href="/admin"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition hover:bg-slate-300 hover:text-slate-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>
              </Link>
              <h1 className="text-3xl font-black text-slate-900">Dynamic Workflows</h1>
            </div>
            <p className="mt-2 text-sm text-slate-600 ml-11">
              Configure the approval routing sequence for each form type. Changes apply immediately to all incoming steps.
            </p>
            <div className="mt-3 ml-11 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-sky-300 bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-900">
                OR = any one role
              </span>
              <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                AND = all roles
              </span>
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Live Engine
            </span>
          </div>
        </div>

        <div className="space-y-8 ml-11">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Active Delegations</h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                {activeDelegations.length} active
              </span>
            </div>

            {activeDelegations.length === 0 ? (
              <p className="text-sm text-slate-500">No active approved delegations right now.</p>
            ) : (
              <div className="space-y-2">
                {activeDelegations.slice(0, 6).map((delegation) => (
                  <p key={delegation.id} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                    {getRoleLabel(delegation.delegatedRole)}: {(delegation.requesterName ?? delegation.requesterEmail).trim()} -&gt; {targetTextByDelegationId[delegation.id]} (till {new Date(delegation.endsAt).toLocaleDateString("en-IN")})
                  </p>
                ))}
                {activeDelegations.length > 6 ? (
                  <p className="text-xs font-semibold text-slate-500">+{activeDelegations.length - 6} more active delegations</p>
                ) : null}
              </div>
            )}
          </section>

          {workflows.map((workflow) => (
            <WorkflowEditor
              key={workflow.id}
              workflow={workflow}
              activeDelegations={activeDelegations}
              targetTextByDelegationId={targetTextByDelegationId}
              delegatedUserLabelById={delegatedUserLabelById}
              roleOptions={roleOptions}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
