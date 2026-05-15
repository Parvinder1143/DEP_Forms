"use client";

import { useMemo, useState } from "react";
import {
  approveUnavailabilityRequest,
  rejectUnavailabilityRequest,
  terminateUnavailabilityRequest,
} from "@/app/actions/delegation";
import type { AppRole } from "@/lib/mock-db";
import type { DelegationQueueOverrideRecord } from "@/lib/delegation-store";

function toDisplayRole(role: AppRole | null | string) {
  if (!role) return "Unassigned";

  switch (role) {
    case "STUDENT": return "Student";
    case "INTERN": return "Intern";
    case "EMPLOYEE": return "Employee";
    case "HOSTEL_WARDEN": return "Hostel Warden";
    case "SUPERVISOR": return "Supervisor";
    case "SECTION_HEAD": return "Section Head";
    case "HOD": return "HoD";
    case "REGISTRAR": return "Registrar";
    case "DEAN_FAA": return "Dean";
    case "DIRECTOR": return "Director";
    case "DEPUTY_DEAN": return "Deputy Dean";
    case "STUDENT_AFFAIRS_HOSTEL_MGMT": return "Student Affairs";
    case "SECURITY_OFFICE": return "Security Office";
    case "FORWARDING_AUTHORITY_ACADEMICS": return "Academics";
    case "ESTABLISHMENT": return "Establishment";
    case "FORWARDING_AUTHORITY_R_AND_D": return "R&D";
    case "APPROVING_AUTHORITY": return "Approving Authority";
    case "GUEST_HOUSE_INCHARGE": return "Guest House In-charge";
    case "GUEST_HOUSE_COMMITTEE_CHAIR": return "Chairman GH Committee";
    case "IT_ADMIN": return "IT Admin";
    case "SYSTEM_ADMIN": return "System Admin";
    default: return role;
  }
}

type DelegationRequestRow = {
  id: string;
  requesterUserId: string;
  requesterEmail: string;
  requesterName: string | null;
  delegatedRole: AppRole;
  replacementUserId: string | null;
  queueDelegations: Partial<Record<"email-id" | "vehicle-sticker" | "identity-card" | "guest-house" | "hostel-undertaking", string>>;
  submittedQueueDelegations: Partial<Record<"email-id" | "vehicle-sticker" | "identity-card" | "guest-house" | "hostel-undertaking", string>>;
  replacementEmail: string | null;
  replacementName: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "TERMINATED";
  adminRemarks: string | null;
  createdAt: Date;
};

const QUEUE_LABELS: Record<"email-id" | "vehicle-sticker" | "identity-card" | "guest-house" | "hostel-undertaking", string> = {
  "email-id": "Email Queue",
  "vehicle-sticker": "Vehicle Sticker Queue",
  "identity-card": "Identity Card Queue",
  "guest-house": "Guest House Queue",
  "hostel-undertaking": "Hostel Undertaking Queue",
};

type UserOption = {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole | null;
};

function statusClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  if (status === "TERMINATED") return "bg-slate-200 text-slate-800";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-700";
  return "bg-amber-100 text-amber-700";
}

function getOverrideTimelineState(
  override: DelegationQueueOverrideRecord,
  now: Date
): "ACTIVE_NOW" | "UPCOMING" | "TERMINATED" {
  if (override.triggerRequestStatus !== "APPROVED") {
    return "TERMINATED";
  }
  const startsAt = new Date(override.startsAt);
  const endsAt = new Date(override.endsAt);
  if (now < startsAt) {
    return "UPCOMING";
  }
  if (now > endsAt) {
    return "TERMINATED";
  }
  return "ACTIVE_NOW";
}

function getOverrideTimelineStateChip(state: "ACTIVE_NOW" | "UPCOMING" | "TERMINATED") {
  if (state === "ACTIVE_NOW") {
    return {
      label: "ACTIVE NOW",
      className: "border border-emerald-300 bg-emerald-100 text-emerald-800",
    };
  }
  if (state === "UPCOMING") {
    return {
      label: "UPCOMING",
      className: "border border-amber-300 bg-amber-100 text-amber-800",
    };
  }
  return {
    label: "TERMINATED",
    className: "border border-slate-300 bg-slate-200 text-slate-800",
  };
}

export function DelegationRequestsClient(props: {
  requests: DelegationRequestRow[];
  users: UserOption[];
  queueOverrides: DelegationQueueOverrideRecord[];
}) {
  const [search, setSearch] = useState("");

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return props.requests;

    return props.requests.filter((request) => {
      return (
        request.requesterEmail.toLowerCase().includes(q) ||
        (request.requesterName ?? "").toLowerCase().includes(q) ||
        (request.replacementEmail ?? "").toLowerCase().includes(q) ||
        request.reason.toLowerCase().includes(q) ||
        request.status.toLowerCase().includes(q) ||
        toDisplayRole(request.delegatedRole).toLowerCase().includes(q)
      );
    });
  }, [props.requests, search]);

  const replacementsByRole = useMemo(() => {
    const map = new Map<AppRole, UserOption[]>();

    for (const request of props.requests) {
      const compatible = props.users
        .filter((user) => user.id !== request.requesterUserId && user.role !== "SYSTEM_ADMIN")
        .sort((a, b) => {
          const aSame = a.role === request.delegatedRole ? 0 : 1;
          const bSame = b.role === request.delegatedRole ? 0 : 1;
          if (aSame !== bSame) return aSame - bSame;
          return a.email.localeCompare(b.email);
        });
      map.set(request.delegatedRole, compatible);
    }

    return map;
  }, [props.requests, props.users]);

  const queueAssignmentsByUser = useMemo(() => {
    const now = new Date();
    const grouped = new Map<string, Array<{
      sourceRequestId: string;
      sourceRequesterName: string | null;
      sourceRequesterEmail: string;
      queueKey: keyof typeof QUEUE_LABELS;
    }>>();

    for (const source of props.requests) {
      if (source.status !== "APPROVED") continue;
      if (new Date(source.startsAt) > now || new Date(source.endsAt) < now) continue;

      for (const [queueKeyRaw, targetUserId] of Object.entries(source.queueDelegations)) {
        if (!targetUserId) continue;
        const queueKey = queueKeyRaw as keyof typeof QUEUE_LABELS;
        const entries = grouped.get(targetUserId) ?? [];
        entries.push({
          sourceRequestId: source.id,
          sourceRequesterName: source.requesterName,
          sourceRequesterEmail: source.requesterEmail,
          queueKey,
        });
        grouped.set(targetUserId, entries);
      }
    }

    return grouped;
  }, [props.requests]);

  const overrideBySourceRequest = useMemo(() => {
    const grouped = new Map<string, DelegationQueueOverrideRecord[]>();
    for (const item of props.queueOverrides) {
      const bucket = grouped.get(item.sourceRequestId) ?? [];
      bucket.push(item);
      grouped.set(item.sourceRequestId, bucket);
    }
    return grouped;
  }, [props.queueOverrides]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Delegation Requests</h2>
          <p className="text-sm text-slate-500">Approve stakeholder unavailability and assign temporary replacements.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-with-icon w-full"
            placeholder="Search requests"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No delegation requests found.
          </p>
        ) : (
          filteredRequests.map((request) => {
            const replacementOptions = replacementsByRole.get(request.delegatedRole) ?? [];
            const incomingQueueAssignments = queueAssignmentsByUser.get(request.requesterUserId) ?? [];
            const currentReplacement = request.replacementUserId
              ? props.users.find((user) => user.id === request.replacementUserId)
              : null;
            const hasQueueRecommendation = Object.keys(request.queueDelegations).length > 0;
            const hasStakeholderRecommendation = Boolean(request.replacementUserId) || hasQueueRecommendation;
            const submittedQueueDelegationText = Object.entries(request.submittedQueueDelegations)
              .map(([queueKey, userId]) => {
                const user = props.users.find((item) => item.id === userId);
                const queueLabel = QUEUE_LABELS[queueKey as keyof typeof QUEUE_LABELS] ?? queueKey;
                return `${queueLabel}: ${user ? user.fullName ?? user.email : userId}`;
              })
              .join(" | ");
            const requestOverrides = overrideBySourceRequest.get(request.id) ?? [];
            const now = new Date();

            return (
              <article key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {request.requesterName ?? "-"} · {request.requesterEmail}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Role: {toDisplayRole(request.delegatedRole)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Duration: {new Date(request.startsAt).toLocaleDateString("en-IN")} - {new Date(request.endsAt).toLocaleDateString("en-IN")}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">Reason: {request.reason}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Queue-wise forwarding: {submittedQueueDelegationText || "Not configured"}
                    </p>
                    {requestOverrides.length > 0 ? (
                      <div className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-2 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                          Temporary override timeline
                        </p>
                        <div className="mt-1 space-y-1">
                          {requestOverrides.map((override) => {
                            const fromUser = props.users.find((u) => u.id === override.overriddenFromUserId);
                            const toUser = override.overrideToUserId
                              ? props.users.find((u) => u.id === override.overrideToUserId)
                              : null;
                            const triggerRequest = props.requests.find((r) => r.id === override.triggerRequestId);
                            const timelineState = getOverrideTimelineState(override, now);
                            const timelineStateChip = getOverrideTimelineStateChip(timelineState);

                            return (
                              <div key={override.id} className="rounded-md border border-sky-200 bg-white px-2 py-1.5">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${timelineStateChip.className}`}>
                                    {timelineStateChip.label}
                                  </span>
                                </div>
                                <p className="text-xs text-sky-900">
                                  {QUEUE_LABELS[override.queueKey]}: {(fromUser?.fullName ?? fromUser?.email ?? override.overriddenFromUserId)} -&gt; {(toUser?.fullName ?? toUser?.email ?? "Skipped")}
                                  {" "}
                                  ({new Date(override.startsAt).toLocaleDateString("en-IN")} - {new Date(override.endsAt).toLocaleDateString("en-IN")})
                                  {triggerRequest ? ` via ${triggerRequest.requesterName ?? triggerRequest.requesterEmail} unavailability` : ""}
                                  {"; auto-reverts after end date."}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    {request.adminRemarks ? (
                      <p className="mt-1 text-sm text-slate-600">Admin note: {request.adminRemarks}</p>
                    ) : null}
                  </div>
                  <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                {request.status === "PENDING" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <form action={approveUnavailabilityRequest} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="replacementUserId" value={currentReplacement?.id ?? ""} />
                      <textarea
                        name="adminRemarks"
                        rows={2}
                        className="input mt-2 w-full"
                        placeholder="Optional admin remark"
                      />
                      {incomingQueueAssignments.length > 0 ? (
                        <div className="mt-2 rounded-md border border-emerald-200 bg-white p-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                            Incoming Delegated Queues (Admin Controlled)
                          </p>
                          <p className="mt-1 text-xs text-emerald-700">
                            Reassign these queues optionally. If left blank, assignment is skipped.
                          </p>
                          <input type="hidden" name="incomingQueueCount" value={incomingQueueAssignments.length} />
                          <div className="mt-2 space-y-2">
                            {incomingQueueAssignments.map((incoming, index) => {
                              const incomingOptions = props.users
                                .filter((user) => user.id !== request.requesterUserId && user.role !== "SYSTEM_ADMIN")
                                .sort((a, b) => a.email.localeCompare(b.email));

                              return (
                                <div key={`${incoming.sourceRequestId}_${incoming.queueKey}`}>
                                  <input
                                    type="hidden"
                                    name={`incomingSourceRequestId_${index}`}
                                    value={incoming.sourceRequestId}
                                  />
                                  <input
                                    type="hidden"
                                    name={`incomingQueueKey_${index}`}
                                    value={incoming.queueKey}
                                  />
                                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                                    {QUEUE_LABELS[incoming.queueKey]} from {incoming.sourceRequesterName ?? incoming.sourceRequesterEmail}
                                  </label>
                                  <select name={`incomingReplacementUserId_${index}`} className="input w-full">
                                    <option value="">Skip assignment (admin hold)</option>
                                    {incomingOptions.map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.fullName ? `${user.fullName} · ` : ""}
                                        {user.email}
                                        {user.role ? ` · ${toDisplayRole(user.role)}` : ""}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <input type="hidden" name="incomingQueueCount" value="0" />
                      )}
                      <button
                        type="submit"
                        className="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Approve Request
                      </button>
                    </form>

                    <form action={rejectUnavailabilityRequest} className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <input type="hidden" name="requestId" value={request.id} />
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-red-800">
                        Reject request
                      </label>
                      <textarea
                        name="adminRemarks"
                        rows={3}
                        className="input w-full"
                        placeholder="Reason for rejection (optional)"
                      />
                      <button
                        type="submit"
                        className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        Reject Request
                      </button>
                    </form>
                  </div>
                ) : null}

                {request.status === "APPROVED" ? (
                  <form action={terminateUnavailabilityRequest} className="mt-4 rounded-lg border border-slate-300 bg-white p-3">
                    <input type="hidden" name="requestId" value={request.id} />
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Terminate temporary arrangement
                    </label>
                    <textarea
                      name="adminRemarks"
                      rows={2}
                      className="input w-full"
                      placeholder="Optional note for termination"
                    />
                    <button
                      type="submit"
                      className="mt-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black"
                    >
                      Terminate Delegation
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
