"use client";

import { useState } from "react";
import { assignRole, createAssignableRole } from "@/app/actions/auth";
import type { AppRole } from "@/lib/mock-db";
import { BUILT_IN_ROLE_OPTIONS, getRoleLabel } from "@/lib/roles";

export function toDisplayRole(role: AppRole | null | string, customRoleLabels?: Record<string, string>) {
  return getRoleLabel(role, customRoleLabels);
}

type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole | null;
  createdAt: Date;
};

export function UsersClient({
  initialUsers,
  customRoleLabels,
}: {
  initialUsers: UserRow[];
  customRoleLabels?: Record<string, string>;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = initialUsers.filter((user) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(q) ||
      (user.fullName && user.fullName.toLowerCase().includes(q)) ||
      toDisplayRole(user.role, customRoleLabels).toLowerCase().includes(q)
    );
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Users</h2>
          <p className="text-sm text-slate-500">
            Total users: <span className="font-semibold text-slate-800">{filteredUsers.length}</span>
          </p>
        </div>
        
        <div className="relative w-full sm:w-65">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-with-icon w-full"
            placeholder="Search users"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
        <h3 className="text-sm font-semibold text-indigo-900">Add New Assignable Role</h3>
        <p className="mt-1 text-xs text-indigo-700">
          Create a new role code and display name to make it available in assignment dropdowns.
        </p>
        <form action={createAssignableRole} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            name="roleCode"
            className="input"
            placeholder="Role code (e.g. LIBRARY_ADMIN)"
            required
          />
          <input
            name="displayName"
            className="input"
            placeholder="Display name (e.g. Library Admin)"
            required
          />
          <button
            type="submit"
            className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Add Role
          </button>
        </form>
      </div>

      <div>
        {filteredUsers.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500 text-center flex flex-col items-center justify-center space-y-2 border rounded-xl border-dashed border-slate-200">
            <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p>No users found{searchQuery ? ` matching "${searchQuery}"` : ""}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-xl border-slate-100">
            <table className="w-full min-w-190 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{user.email}</td>
                    <td className="px-5 py-3 text-slate-700">{user.fullName ?? "-"}</td>
                    <td className="px-5 py-3 text-slate-700">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100/50 border border-slate-200 text-xs font-medium text-slate-600">
                        {toDisplayRole(user.role, customRoleLabels)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function RoleRequestsClient({
  initialPendingUsers,
  assignableRoles = BUILT_IN_ROLE_OPTIONS,
  customRoleLabels,
}: {
  initialPendingUsers: UserRow[];
  assignableRoles?: AppRole[];
  customRoleLabels?: Record<string, string>;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = initialPendingUsers.filter((user) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(q) ||
      (user.fullName && user.fullName.toLowerCase().includes(q))
    );
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Role Requests</h2>
          <p className="text-sm text-slate-500">
            Pending requests from @iitrpr.ac.in accounts
          </p>
        </div>
        
        {initialPendingUsers.length > 0 && (
          <div className="relative w-full sm:w-65">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-with-icon w-full"
              placeholder="Search requests"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 mt-6">
        {filteredUsers.length === 0 ? (
          <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No pending role requests{searchQuery ? ` matching "${searchQuery}"` : ""}.
          </p>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 transition-all hover:bg-slate-100/50 hover:shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{user.email}</p>
                  <p className="mt-1 text-sm text-slate-500 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Requested {user.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                
                <div className="shrink-0 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <form action={assignRole} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      defaultValue=""
                      className="input max-w-65 text-sm h-10"
                      required
                    >
                      <option value="" disabled>Select role</option>
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>{toDisplayRole(role, customRoleLabels)}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="h-10 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 shadow-sm shadow-indigo-600/20"
                    >
                      Approve
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
