"use client";

import { useRef, useState } from "react";
import {
  bulkCreateUsers,
  bulkPreviewUsers,
  type BulkUserCreationResult,
  type BulkUserPreviewResult,
} from "@/app/actions/bulk-users";

export function BulkUserUploadClient({ validRoles }: { validRoles: string[] }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BulkUserCreationResult | null>(null);
  const [preview, setPreview] = useState<BulkUserPreviewResult | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setPreview(null);

    try {
      const content = await file.text();
      setCsvContent(content);

      const previewResult = await bulkPreviewUsers(content);
      setPreview(previewResult);

      if (previewResult.summary.errors > 0) {
        setError(`${previewResult.summary.errors} invalid row(s) found in preview`);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to process file");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleConfirmCreate() {
    if (!csvContent) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const uploadResult = await bulkCreateUsers(csvContent);
      setResult(uploadResult);
      setPreview(null);

      if (uploadResult.errors.length > 0) {
        setError(`${uploadResult.errors.length} error(s) occurred during user creation`);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to create users");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Bulk User Upload</h3>
        <p className="text-sm text-slate-600 mb-4">
          Upload a CSV file to create multiple users at once. Format: email,role. Role matching is case-insensitive.
        </p>

        <label className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={isLoading || isSubmitting}
            className="cursor-pointer file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-black"
          />
          {isLoading && <span className="text-sm text-slate-600">Processing...</span>}
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-900">Error</p>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {preview && !result && (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h4 className="font-semibold text-blue-900">Preview Before Create</h4>
          <p className="text-sm text-blue-800">
            Ready: {preview.summary.ready} | Skipped: {preview.summary.skipped} | Errors: {preview.summary.errors}
          </p>

          <div className="max-h-56 overflow-y-auto space-y-2">
            {preview.preview.map((item, idx) => (
              <div key={`${item.email}-${idx}`} className="rounded bg-white px-3 py-2 text-sm border border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-slate-800">{item.email || "(empty email)"}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                      item.status === "ready"
                        ? "bg-emerald-100 text-emerald-800"
                        : item.status === "skipped"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Role: {item.role ?? "-"}
                  {item.reason ? ` | ${item.reason}` : ""}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleConfirmCreate}
              disabled={isSubmitting || preview.summary.ready === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Accept and Create Users"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setCsvContent(null);
                setError(null);
              }}
              disabled={isSubmitting}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white p-3 border border-slate-200">
              <p className="text-xs text-slate-600">Created</p>
              <p className="text-2xl font-bold text-emerald-600">{result.created.length}</p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-slate-200">
              <p className="text-xs text-slate-600">Skipped</p>
              <p className="text-2xl font-bold text-amber-600">{result.skipped.length}</p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-slate-200">
              <p className="text-xs text-slate-600">Errors</p>
              <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
            </div>
          </div>

          {result.created.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h4 className="font-semibold text-emerald-900 mb-2">✓ Successfully Created ({result.created.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.created.map((user) => (
                  <div key={user.email} className="bg-white rounded p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-emerald-700">{user.email}</p>
                      {user.role && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Password: <span className="font-mono">{user.password}</span>
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-emerald-700 mt-2">
                Note: Share these passwords with users securely. They can change them after first login.
              </p>
            </div>
          )}

          {result.skipped.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="font-semibold text-amber-900 mb-2">⊘ Skipped ({result.skipped.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.skipped.map((user) => (
                  <div key={`${user.email}-${user.reason}`} className="bg-white rounded p-2 text-sm">
                    <p className="font-mono text-amber-700">{user.email}</p>
                    <p className="text-xs text-slate-600">{user.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h4 className="font-semibold text-red-900 mb-2">✕ Errors ({result.errors.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.errors.map((err, idx) => (
                  <div key={`${err.email}-${idx}`} className="bg-white rounded p-2 text-sm">
                    <p className="font-mono text-red-700">{err.email || "(row)"}</p>
                    <p className="text-xs text-slate-600">{err.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setResult(null);
              setPreview(null);
              setCsvContent(null);
              setError(null);
            }}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Upload Another File
          </button>
        </div>
      )}

      <details className="rounded-lg border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer font-semibold text-slate-900">CSV Format Guide</summary>
        <div className="mt-3 text-sm text-slate-700 space-y-2">
          <p>Create a CSV file with the following structure (header row is optional):</p>
          <div className="rounded bg-slate-100 p-2 font-mono text-xs overflow-x-auto">
            <p>email,role</p>
            <p>student1@iitrpr.ac.in,STUDENT</p>
            <p>hod@iitrpr.ac.in,HOD</p>
            <p>employee@iitrpr.ac.in,EMPLOYEE</p>
            <p>admin@iitrpr.ac.in,SYSTEM_ADMIN</p>
          </div>
          <div className="mt-3">
            <p className="font-semibold mb-2">Valid Roles:</p>
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{validRoles.join(", ")}</p>
          </div>
          <p>
            <strong>Notes:</strong>
          </p>
          <ul className="list-disc list-inside mt-1 text-xs">
            <li>Only two columns are supported: email and role.</li>
            <li>Role is case-insensitive; common codes will be normalized.</li>
            <li>Only valid @iitrpr.ac.in emails will be created.</li>
            <li>Invalid roles are shown during preview.</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
