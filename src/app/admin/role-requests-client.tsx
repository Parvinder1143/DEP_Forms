"use client";

import { useState } from "react";
import { type AppRole } from "@/lib/mock-db";
import { type PersistedUser } from "@/lib/user-store";
import { getRoleLabel } from "@/lib/roles";

const STUDENT_ROLE_REQUEST_TAG = "__ROLE_REQUEST_STUDENT__";

function isStudentRoleRequestTagged(user: Pick<PersistedUser, "department" | "role">) {
  return user.role === null && user.department === STUDENT_ROLE_REQUEST_TAG;
}

function getPreferredRole(user: Pick<PersistedUser, "department">): string | null {
  if (!user.department || !user.department.startsWith("PREFERRED_ROLE:")) {
    return null;
  }
  return user.department.substring("PREFERRED_ROLE:".length);
}
import { approveAllPreferredRoles, assignRole, bulkAssignRoles, bulkRejectRoles, rejectRole } from "@/app/actions/auth";

type RoleRequestsClientProps = {
  pendingUsers: PersistedUser[];
  assignableRoleOptions: AppRole[];
  customRoleLabels: Record<string, string>;
  roleSearchQuery: string;
};

export function RoleRequestsClient({
  pendingUsers,
  assignableRoleOptions,
  customRoleLabels,
  roleSearchQuery,
}: RoleRequestsClientProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<AppRole | "">("");

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingUsers.map((u) => u.id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toRoleLabel = (roleCode: string) => getRoleLabel(roleCode, customRoleLabels);

  const handleBulkApprove = async () => {
    if (!bulkRole || selectedIds.size === 0) return;
    await bulkAssignRoles(Array.from(selectedIds), bulkRole);
    setSelectedIds(new Set());
    setBulkRole("");
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to reject ${selectedIds.size} request(s)?`)) {
      await bulkRejectRoles(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold text-slate-900">User Role Requests</h2>
        <p className="text-sm text-slate-500">
          Pending role requests: <span className="font-semibold text-slate-800">{pendingUsers.length}</span>
        </p>
      </div>

      <form
        action={approveAllPreferredRoles}
        className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3"
      >
        <div>
          <p className="text-sm font-semibold text-indigo-900">Bulk preferred role approval</p>
          <p className="text-xs text-indigo-700">
            Automatically assigns the preferred role to all pending users who requested one.
          </p>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Approve all requests with a preferred role
        </button>
      </form>

      <form action="/admin" method="get" className="mb-4 flex items-center gap-2">
        <input type="hidden" name="tab" value="role-requests" />
        <input
          name="roleSearch"
          defaultValue={roleSearchQuery}
          className="input max-w-65"
          placeholder="Search role requests"
        />
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
          Search
        </button>
      </form>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
          <span className="text-sm font-semibold text-slate-700">{selectedIds.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as AppRole)}
              className="input py-1.5 px-3 text-sm h-auto"
            >
              <option value="" disabled>Select role to assign</option>
              {assignableRoleOptions.map((role) => (
                <option key={role} value={role}>{toRoleLabel(role)}</option>
              ))}
            </select>
            <button
              onClick={handleBulkApprove}
              disabled={!bulkRole}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve Selected
            </button>
            <button
              onClick={handleBulkReject}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Reject Selected
            </button>
          </div>
        </div>
      )}

      {pendingUsers.length === 0 ? (
        <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No pending role requests.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pendingUsers.length && pendingUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Preferred Role / Tags</th>
                <th className="px-4 py-3">Requested Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pendingUsers.map((user) => {
                const preferred = getPreferredRole(user);
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {preferred ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                            Preferred: {getRoleLabel(preferred as AppRole, customRoleLabels)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">None</span>
                        )}
                        {isStudentRoleRequestTagged(user) ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            Student
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(user.createdAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short"
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <form action={assignRole} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <select
                            name="role"
                            defaultValue={preferred && assignableRoleOptions.includes(preferred as AppRole) ? preferred : ""}
                            className="input py-1 px-2 text-xs h-auto w-32"
                            required
                          >
                            <option value="" disabled>Select role</option>
                            {assignableRoleOptions.map((role) => (
                              <option key={role} value={role}>{toRoleLabel(role)}</option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                          >
                            Approve
                          </button>
                        </form>
                        <form action={async () => {
                          if (confirm("Are you sure you want to reject this request?")) {
                            await rejectRole(user.id);
                          }
                        }}>
                          <button
                            type="submit"
                            className="rounded bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 border border-red-200 transition"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
