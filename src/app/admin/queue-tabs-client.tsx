"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RowData = {
  id: string;
  writtenBy: string;
  stage: string;
  approvedBy: string;
};

type QueueTabsClientProps = {
  title: string;
  pendingRows: RowData[];
  ongoingRows: RowData[];
  completedRows: RowData[];
  defaultSearchQuery?: string;
};

export function QueueTabsClient({
  title,
  pendingRows,
  ongoingRows,
  completedRows,
  defaultSearchQuery = "",
}: QueueTabsClientProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "ongoing" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);

  useEffect(() => {
    const intervalId = setInterval(() => {
      router.refresh();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [router]);

  const containsSearch = (query: string, row: RowData) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      row.id.toLowerCase().includes(q) ||
      row.writtenBy.toLowerCase().includes(q) ||
      row.stage.toLowerCase().includes(q) ||
      row.approvedBy.toLowerCase().includes(q)
    );
  };

  const getFilteredRows = (rows: RowData[]) => {
    if (!searchQuery.trim()) return rows;
    return rows.filter((row) => containsSearch(searchQuery.trim(), row));
  };

  const currentPending = getFilteredRows(pendingRows);
  const currentOngoing = getFilteredRows(ongoingRows);
  const currentCompleted = getFilteredRows(completedRows);

  const tabs = [
    { key: "all", label: "All", rows: [...currentPending, ...currentOngoing, ...currentCompleted], count: currentPending.length + currentOngoing.length + currentCompleted.length },
    { key: "pending", label: `Pending (${currentPending.length})`, rows: currentPending, count: currentPending.length },
    { key: "ongoing", label: `Ongoing (${currentOngoing.length})`, rows: currentOngoing, count: currentOngoing.length },
    { key: "completed", label: `Completed (${currentCompleted.length})`, rows: currentCompleted, count: currentCompleted.length },
  ] as const;

  const activeTabData = tabs.find((t) => t.key === activeFilter) || tabs[0];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 px-5 py-3 gap-4">
        <div className="space-y-1 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Queue</p>
          <p className="text-xl font-semibold text-slate-900">{title}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-with-icon max-w-full sm:max-w-[260px]"
              placeholder={`Search ${title.toLowerCase()}`}
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
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeFilter === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        {activeTabData.rows.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500 text-center flex flex-col items-center justify-center space-y-2">
            <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No items found{searchQuery ? ` matching "${searchQuery}"` : " in this category"}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">Reference</th>
                  <th className="px-5 py-4">Written By</th>
                  <th className="px-5 py-4">Stage</th>
                  <th className="px-5 py-4">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTabData.rows.map((row) => (
                  <tr key={`${activeTabData.key}-${row.id}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-800">{row.id}</td>
                    <td className="px-5 py-4 text-slate-600">{row.writtenBy}</td>
                    <td className="px-5 py-4 text-slate-600">{row.stage}</td>
                    <td className="px-5 py-4 text-slate-600">{row.approvedBy}</td>
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
