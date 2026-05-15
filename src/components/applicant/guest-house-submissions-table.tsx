"use client";

import { Fragment, useState } from "react";

type GuestHouseSubmissionRow = {
  submissionId: string;
  guestName: string;
  createdAt: string;
  statusText: string;
};

export function GuestHouseSubmissionsTable({
  submissions,
}: {
  submissions: GuestHouseSubmissionRow[];
}) {
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  const toggleExpanded = (submissionId: string) => {
    setExpandedSubmissionId((current) => (current === submissionId ? null : submissionId));
  };

  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
        <tr>
          <th className="px-5 py-3">Reference</th>
          <th className="px-5 py-3">Guest</th>
          <th className="px-5 py-3">Submitted On</th>
          <th className="px-5 py-3">Status</th>
          <th className="px-5 py-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {submissions.map((submission) => {
          const isExpanded = expandedSubmissionId === submission.submissionId;

          return (
            <Fragment key={submission.submissionId}>
              <tr>
                <td className="px-5 py-3 font-medium text-gray-900">{submission.submissionId}</td>
                <td className="px-5 py-3 text-gray-800">{submission.guestName}</td>
                <td className="px-5 py-3 text-gray-600">
                  {new Date(submission.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-5 py-3 text-gray-800">{submission.statusText}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(submission.submissionId)}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? "Hide" : "View"}
                  </button>
                </td>
              </tr>
              {isExpanded && (
                <tr>
                  <td className="bg-gray-50 px-5 py-4" colSpan={5}>
                    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Expanded Form Preview
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const iframe = document.querySelector(`iframe[title="Guest House form ${submission.submissionId}"]`) as HTMLIFrameElement;
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
                        src={`/forms/guest-house/${submission.submissionId}?embed=1`}
                        title={`Guest House form ${submission.submissionId}`}
                        className="h-[70vh] w-full rounded-lg border border-gray-200"
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
  );
}
