"use client";

import { Fragment } from "react";
import { useMemo, useState, useTransition } from "react";

export type BulkReviewDecision = "approve" | "reject";

export type BulkReviewRow = {
  id: string;
  cell1: string;
  cell2: string;
  cell3: string;
  submittedAt: string;
  statusText: string;
  statusClassName: string;
  viewHref: string;
  selectable?: boolean;
};

function getTodayLocalDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function BulkReviewGrid(props: {
  pendingRows: BulkReviewRow[];
  ongoingRows?: BulkReviewRow[];
  completedRows: BulkReviewRow[];
  cell1Header: string;
  cell2Header: string;
  cell3Header: string;
  showBulkIssuanceFields?: boolean;
  showBulkValidUptoField?: boolean;
  showBulkStickerNumberField?: boolean;
  onBulkReview: (input: {
    ids: string[];
    decision: BulkReviewDecision;
    approverName: string;
    remark: string;
    dateOfCreation?: string;
    tentativeRemovalDate?: string | null;
    validUpto?: string;
    issuedStickerNo?: string;
  }) => Promise<void>;
}) {
  const {
    pendingRows,
    ongoingRows = [],
    completedRows,
    cell1Header,
    cell2Header,
    cell3Header,
    showBulkIssuanceFields = false,
    showBulkValidUptoField = false,
    showBulkStickerNumberField = false,
    onBulkReview,
  } = props;
  const [activeTab, setActiveTab] = useState<"pending" | "ongoing" | "completed">("pending");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approverName, setApproverName] = useState("");
  const [bulkRemark, setBulkRemark] = useState("");
  const [dateOfCreation] = useState(() => getTodayLocalDate());
  const [tentativeRemovalDate, setTentativeRemovalDate] = useState("");
  const [validUpto, setValidUpto] = useState("");
  const [issuedStickerNo, setIssuedStickerNo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rows = activeTab === "pending" ? pendingRows : activeTab === "ongoing" ? ongoingRows : completedRows;
  const isPendingTab = activeTab === "pending";
  const pendingIdSet = useMemo(
    () => new Set(pendingRows.filter((row) => row.selectable !== false).map((row) => row.id)),
    [pendingRows]
  );
  const actionablePendingCount = pendingIdSet.size;

  const selectedCount = selectedIds.filter((id) => pendingIdSet.has(id)).length;
  const isAllSelected = actionablePendingCount > 0 && selectedCount === actionablePendingCount;

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((currentId) => currentId !== id) : [...prev, id]
    );
  }

  function toggleSelectAllPending() {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pendingIdSet.has(id)));
      return;
    }

    setSelectedIds((prev) => {
      const merged = new Set(prev);
      for (const row of pendingRows) {
        merged.add(row.id);
      }
      return Array.from(merged);
    });
  }

  function runBulkReview(decision: BulkReviewDecision) {
    const actionableIds = selectedIds.filter((id) => pendingIdSet.has(id));
    if (actionableIds.length === 0) {
      setError("Please select at least one pending request.");
      return;
    }
    if (!approverName.trim()) {
      setError("Approver name is required.");
      return;
    }
    if (!bulkRemark.trim()) {
      setError("Bulk remark is required.");
      return;
    }
    if (showBulkValidUptoField && decision === "approve" && !validUpto.trim()) {
      setError("Valid upto date is required for bulk approval.");
      return;
    }
    if (showBulkStickerNumberField && decision === "approve" && !issuedStickerNo.trim()) {
      setError("Sticker number is required for bulk approval.");
      return;
    }
    if (showBulkIssuanceFields && !tentativeRemovalDate.trim()) {
      setError("Tentative removal date is required for bulk email issuance.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await onBulkReview({
          ids: actionableIds,
          decision,
          approverName: approverName.trim(),
          remark: bulkRemark.trim(),
          ...(showBulkIssuanceFields
            ? {
                dateOfCreation,
                tentativeRemovalDate: tentativeRemovalDate.trim(),
              }
            : {}),
          ...(showBulkValidUptoField ? { validUpto: validUpto.trim() } : {}),
          ...(showBulkStickerNumberField ? { issuedStickerNo: issuedStickerNo.trim() } : {}),
        });
        setSelectedIds([]);
        setBulkRemark("");
        setTentativeRemovalDate("");
        setValidUpto("");
        setIssuedStickerNo("");
      } catch (actionError) {
        setError((actionError as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`rounded-xl border px-6 py-2 text-sm font-semibold transition ${
            activeTab === "pending"
              ? "border-amber-400 bg-amber-100 text-amber-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          Pending ({pendingRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ongoing")}
          className={`rounded-xl border px-6 py-2 text-sm font-semibold transition ${
            activeTab === "ongoing"
              ? "border-sky-400 bg-sky-100 text-sky-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          Ongoing ({ongoingRows.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`rounded-xl border px-6 py-2 text-sm font-semibold transition ${
            activeTab === "completed"
              ? "border-green-400 bg-green-100 text-green-900"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          Completed ({completedRows.length})
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {isPendingTab ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-4">
              <button
                type="button"
                onClick={toggleSelectAllPending}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {isAllSelected ? "Clear All" : "Select All"}
              </button>
              <span className="text-sm text-slate-600">
                Selected: {selectedCount}/{actionablePendingCount}
              </span>
            </div>

            <label className="mb-1 block text-sm font-semibold text-slate-700">Approver Name</label>
            <input
              value={approverName}
              onChange={(event) => setApproverName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="Name used for approval or rejection entries"
            />

            {showBulkIssuanceFields ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Bulk Email Issuance Details
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Date of Creation
                    </label>
                    <input
                      type="date"
                      value={dateOfCreation}
                      readOnly
                      className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">
                      Tentative Date of Removal of ID *
                    </label>
                    <input
                      type="date"
                      value={tentativeRemovalDate}
                      onChange={(event) => setTentativeRemovalDate(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {showBulkValidUptoField ? (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Valid Upto (YYYY-MM-DD) *
                </label>
                <input
                  type="date"
                  value={validUpto}
                  onChange={(event) => setValidUpto(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
            ) : null}

            {showBulkStickerNumberField ? (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Sticker Number *
                </label>
                <input
                  type="text"
                  value={issuedStickerNo}
                  onChange={(event) => setIssuedStickerNo(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="Enter sticker number for final-stage approvals"
                />
              </div>
            ) : null}

            <label className="mb-1 mt-3 block text-sm font-semibold text-slate-700">Bulk Remark *</label>
            <textarea
              value={bulkRemark}
              onChange={(event) => setBulkRemark(event.target.value)}
              className="h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="One common remark for all selected requests"
            />

            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => runBulkReview("approve")}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Approve All Selected"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => runBulkReview("reject")}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Reject All Selected"}
              </button>
            </div>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No requests in this tab.</div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  {isPendingTab ? <th className="px-4 py-3">Select</th> : null}
                  <th className="px-4 py-3">{cell1Header}</th>
                  <th className="px-4 py-3">{cell2Header}</th>
                  <th className="px-4 py-3">{cell3Header}</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const isPendingRow = pendingIdSet.has(row.id);
                  const checked = selectedIds.includes(row.id);
                  return (
                    <Fragment key={row.id}>
                    <tr className="bg-white">
                      {isPendingTab ? (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!isPendingRow}
                            onChange={() => toggleSelection(row.id)}
                            className="h-6 w-6 rounded border-slate-300"
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3 font-medium text-slate-900">{row.cell1}</td>
                      <td className="px-4 py-3 text-slate-700">{row.cell2}</td>
                      <td className="px-4 py-3 text-slate-700">{row.cell3}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${row.statusClassName}`}>
                          {row.statusText}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.submittedAt}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {expandedId === row.id ? "Hide" : "View Full Form"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === row.id && (
                      <tr>
                        <td colSpan={isPendingTab ? 7 : 6} className="bg-slate-50 px-4 py-4">
                          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Expanded Form Preview
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const iframe = document.querySelector(`iframe[title="Form ${row.id}"]`) as HTMLIFrameElement;
                                  if (iframe?.contentWindow) {
                                    iframe.contentWindow.print();
                                  }
                                }}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                  <rect x="6" y="14" width="12" height="8"></rect>
                                </svg>
                                Download
                              </button>
                            </div>
                            <iframe
                              src={`${row.viewHref}?embed=1`}
                              title={`Form ${row.id}`}
                              className="h-[70vh] w-full rounded-lg border border-slate-200"
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
