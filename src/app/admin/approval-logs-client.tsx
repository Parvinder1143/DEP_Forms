"use client";

import { useMemo, useState } from "react";

type LogRow = {
  id: string;
  formType: string;
  reference: string;
  applicant: string;
  stage: string;
  decision: string;
  actor: string;
  note: string;
  decidedAt: Date | null;
};

export function ApprovalLogsClient({ initialLogs }: { initialLogs: LogRow[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = initialLogs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    
    return (
      log.formType.toLowerCase().includes(q) ||
      log.reference.toLowerCase().includes(q) ||
      log.applicant.toLowerCase().includes(q) ||
      log.stage.toLowerCase().includes(q) ||
      log.decision.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q) ||
      log.note.toLowerCase().includes(q) ||
      (log.decidedAt && log.decidedAt.toLocaleString("en-IN").toLowerCase().includes(q))
    );
  });

  const groupedLogs = useMemo(() => {
    const groups = new Map<
      string,
      {
        groupKey: string;
        formType: string;
        reference: string;
        applicant: string;
        latestAt: Date | null;
        logs: LogRow[];
      }
    >();

    for (const log of filteredLogs) {
      const groupKey = `${log.formType}::${log.reference}`;
      const existing = groups.get(groupKey);

      if (!existing) {
        groups.set(groupKey, {
          groupKey,
          formType: log.formType,
          reference: log.reference,
          applicant: log.applicant,
          latestAt: log.decidedAt,
          logs: [log],
        });
        continue;
      }

      existing.logs.push(log);
      if (!existing.latestAt || ((log.decidedAt?.getTime() ?? 0) > existing.latestAt.getTime())) {
        existing.latestAt = log.decidedAt;
      }
    }

    const grouped = Array.from(groups.values());
    for (const group of grouped) {
      group.logs.sort((a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0));
    }

    grouped.sort((a, b) => (b.latestAt?.getTime() ?? 0) - (a.latestAt?.getTime() ?? 0));
    return grouped;
  }, [filteredLogs]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Approval Logs</h2>
          <p className="text-sm text-slate-500">
            Form groups: <span className="font-semibold text-slate-800">{groupedLogs.length}</span>
            {" · "}
            Total logs: <span className="font-semibold text-slate-800">{filteredLogs.length}</span>
          </p>
        </div>

        <div className="relative w-full sm:w-[320px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-with-icon w-full"
            placeholder="Search approval logs"
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

      {groupedLogs.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500 text-center flex flex-col items-center justify-center space-y-2 border rounded-xl border-dashed border-slate-200">
          <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="rounded-xl px-4 py-3 text-sm text-slate-500">
            No approval logs found{searchQuery ? ` matching "${searchQuery}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedLogs.map((group) => (
            <details key={group.groupKey} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {group.formType} · {group.applicant}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Ref: {group.reference} · Latest: {group.latestAt ? group.latestAt.toLocaleString("en-IN") : "-"}
                  </p>
                </div>
                <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                  View all logs ({group.logs.length})
                </span>
              </summary>

              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-white text-left text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Stage</th>
                      <th className="px-4 py-3">Decision</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {log.decidedAt ? new Date(log.decidedAt).toLocaleString("en-IN") : "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{log.stage}</td>
                        <td className="px-4 py-3 text-slate-700 capitalize">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                              log.decision.toLowerCase() === "approved" || log.decision.toLowerCase() === "issued"
                                ? "bg-emerald-100 text-emerald-700"
                                : log.decision.toLowerCase() === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {log.decision}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{log.actor}</td>
                        <td className="max-w-sm truncate px-4 py-3 text-xs italic text-slate-700" title={log.note}>
                          {log.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
