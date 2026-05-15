"use client";

import { useState } from "react";

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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  function toDate(value: Date | null) {
    if (!value) return null;
    if (value instanceof Date) return value;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }

  function getDecisionPillClass(decision: string) {
    const normalized = decision.toLowerCase();
    if (normalized === "approved" || normalized === "issued") {
      return "bg-emerald-100 text-emerald-700";
    }
    if (normalized === "rejected") {
      return "bg-red-100 text-red-700";
    }
    return "bg-indigo-100 text-indigo-700";
  }

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

  const groupedLogsMap = filteredLogs.reduce(
    (acc, log) => {
      const groupKey = log.reference;
      const existing = acc.get(groupKey);
      if (existing) {
        existing.logs.push(log);
      } else {
        acc.set(groupKey, {
          reference: log.reference,
          formType: log.formType,
          applicant: log.applicant,
          logs: [log],
        });
      }

      return acc;
    },
    new Map<
      string,
      {
        reference: string;
        formType: string;
        applicant: string;
        logs: LogRow[];
      }
    >()
  );

  const groupedLogs = Array.from(groupedLogsMap.values())
    .map((group) => {
      const sortedLogs = [...group.logs].sort((a, b) => {
        const left = toDate(a.decidedAt)?.getTime() ?? 0;
        const right = toDate(b.decidedAt)?.getTime() ?? 0;
        return right - left;
      });

      return {
        ...group,
        logs: sortedLogs,
        latestAt: toDate(sortedLogs[0]?.decidedAt ?? null),
      };
    })
    .sort((a, b) => (b.latestAt?.getTime() ?? 0) - (a.latestAt?.getTime() ?? 0));

  const groupCount = groupedLogs.length;

  function toggleGroup(reference: string) {
    setExpandedGroups((prev) => ({
      ...prev,
      [reference]: !prev[reference],
    }));
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Approval Logs</h2>
          <p className="text-sm text-slate-500">
            Form groups: <span className="font-semibold text-slate-800">{groupCount}</span> · Total logs:{" "}
            <span className="font-semibold text-slate-800">{filteredLogs.length}</span>
          </p>
        </div>

        <div className="relative w-full sm:w-[420px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-with-icon h-12 w-full rounded-xl px-10 text-base"
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

      {filteredLogs.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500 text-center flex flex-col items-center justify-center space-y-2 border rounded-xl border-dashed border-slate-200">
          <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="rounded-xl px-4 py-3 text-sm text-slate-500">
            No approval logs found{searchQuery ? ` matching "${searchQuery}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedLogs.map((group) => {
            const isExpanded = Boolean(expandedGroups[group.reference]);

            return (
              <div key={group.reference} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div
                  className={`flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between ${
                    isExpanded ? "border-b border-slate-200" : ""
                  }`}
                >
                  <div>
                    <p className="text-2xl font-semibold leading-tight text-slate-900">
                      {group.formType} · {group.applicant}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Ref: {group.reference} · Latest:{" "}
                      {group.latestAt ? group.latestAt.toLocaleString("en-IN") : "-"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleGroup(group.reference)}
                    className="inline-flex h-12 min-w-[190px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    {isExpanded ? "Hide logs" : `View all logs (${group.logs.length})`}
                  </button>
                </div>

                {isExpanded ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] text-sm">
                      <thead className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-6 py-4">When</th>
                          <th className="px-6 py-4">Stage</th>
                          <th className="px-6 py-4">Decision</th>
                          <th className="px-6 py-4">Actor</th>
                          <th className="px-6 py-4">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {group.logs.map((log) => (
                          <tr key={log.id} className="transition-colors hover:bg-slate-50">
                            <td className="whitespace-nowrap px-6 py-5 text-slate-700">
                              {toDate(log.decidedAt)?.toLocaleString("en-IN") ?? "-"}
                            </td>
                            <td className="px-6 py-5 text-slate-700">{log.stage}</td>
                            <td className="px-6 py-5">
                              <span
                                className={`inline-flex items-center rounded-xl px-3 py-1 text-xs font-semibold ${getDecisionPillClass(log.decision)}`}
                              >
                                {log.decision}
                              </span>
                            </td>
                            <td className="px-6 py-5 font-medium text-slate-700">{log.actor}</td>
                            <td className="max-w-xl px-6 py-5 text-slate-700 italic">{log.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
