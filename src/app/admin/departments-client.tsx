"use client";

import { useState } from "react";
import type { DepartmentRecord } from "@/lib/mock-db";
import { addDepartmentAction, updateDepartmentAction, deleteDepartmentAction } from "@/app/actions/department";

export function DepartmentsClient({ departments }: { departments: DepartmentRecord[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-3xl font-semibold text-slate-900">Departments Management</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage departments and assign HOD emails for proper approval routing.
        </p>
      </div>

      <div className="mb-8 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Add New Department</h3>
        <form action={addDepartmentAction} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-slate-700">Department Name</label>
            <input
              name="name"
              required
              placeholder="e.g. Computer Science and Engineering"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-slate-700">HOD Email</label>
            <input
              name="hodEmail"
              type="email"
              required
              placeholder="e.g. hod.cse@iitrpr.ac.in"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Add Department
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Department Name</th>
              <th className="px-4 py-3">HOD Email</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {departments.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  No departments found. Add one above.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                  {editingId === dept.id ? (
                    <td colSpan={3} className="p-0">
                      <form action={async (formData) => {
                        await updateDepartmentAction(formData);
                        setEditingId(null);
                      }} className="flex items-center gap-3 bg-indigo-50/50 px-4 py-2">
                        <input type="hidden" name="id" value={dept.id} />
                        <div className="flex-1">
                          <input
                            name="name"
                            defaultValue={dept.name}
                            required
                            className="w-full rounded border border-indigo-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            name="hodEmail"
                            type="email"
                            defaultValue={dept.hodEmail}
                            required
                            className="w-full rounded border border-indigo-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex items-center gap-2 justify-end w-32">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="rounded bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-slate-900">{dept.name}</td>
                      <td className="px-4 py-3 text-slate-600">{dept.hodEmail}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingId(dept.id)}
                            className="rounded px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition"
                          >
                            Edit
                          </button>
                          <form action={deleteDepartmentAction}>
                            <input type="hidden" name="id" value={dept.id} />
                            <button
                              type="submit"
                              onClick={(e) => {
                                if (!confirm("Are you sure you want to delete this department?")) {
                                  e.preventDefault();
                                }
                              }}
                              className="rounded px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
