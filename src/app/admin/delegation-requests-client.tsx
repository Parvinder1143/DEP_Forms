"use client";

import { useMemo, useState } from "react";
import {
  approveUnavailabilityRequest,
  rejectUnavailabilityRequest,
  terminateUnavailabilityRequest,
} from "@/app/actions/delegation";
import type { AppRole } from "@/lib/mock-db";

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
  replacementEmail: string | null;
  replacementName: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "TERMINATED";
  adminRemarks: string | null;
  createdAt: Date;
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

export function DelegationRequestsClient(props: {
  requests: DelegationRequestRow[];
  users: UserOption[];
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
            const currentReplacement = request.replacementUserId
              ? props.users.find((user) => user.id === request.replacementUserId)
              : null;

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
                      Proposed/Assigned replacement: {request.replacementEmail ? `${request.replacementName ?? ""} ${request.replacementEmail}`.trim() : "Not provided"}
                    </p>
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
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-emerald-800">
                        Assign replacement and approve
                      </label>
                      <select
                        name="replacementUserId"
                        required
                        defaultValue={currentReplacement?.id ?? ""}
                        className="input w-full"
                      >
                        <option value="" disabled>Select replacement user</option>
                        {replacementOptions.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName ? `${user.fullName} · ` : ""}
                            {user.email}
                            {user.role ? ` · ${toDisplayRole(user.role)}` : ""}
                          </option>
                        ))}
                      </select>
                      <textarea
                        name="adminRemarks"
                        rows={2}
                        className="input mt-2 w-full"
                        placeholder="Optional admin remark"
                      />
                      <button
                        type="submit"
                        className="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Approve Delegation
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
