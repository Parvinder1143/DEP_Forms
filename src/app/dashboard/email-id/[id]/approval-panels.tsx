"use client";

import { useState, useTransition } from "react";
import { forwardEmailIdForm, issueEmailId, type ForwardingSection } from "@/app/actions/email-id";
import { useRouter } from "next/navigation";

const SECTION_OPTIONS: { value: ForwardingSection; label: string }[] = [
  { value: "ACADEMICS", label: "Academics" },
  { value: "ESTABLISHMENT", label: "Establishment" },
  { value: "RESEARCH_AND_DEVELOPMENT", label: "Research & Development" },
];

// ── Stage 1 Panel ────────────────────────────────────────────────────────────

export function ForwardingAuthorityPanel({
  formId,
  stageNumber,
  stageLabel,
  fixedSection,
}: {
  formId: string;
  stageNumber: number;
  stageLabel: string;
  fixedSection?: ForwardingSection;
}) {
  const [section, setSection] = useState<ForwardingSection>(
    fixedSection ?? "ACADEMICS"
  );
  const [approverName, setApproverName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await forwardEmailIdForm(formId, section, approverName);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="print-hidden space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5"
    >
      <h3 className="font-semibold text-amber-800">
        Stage {stageNumber} — {stageLabel}
      </h3>
      <p className="text-sm text-amber-700">
        Review and sign off on this request to forward it to IT Admin.
      </p>

      {fixedSection ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Forwarding Section
          </label>
          <input
            value={
              SECTION_OPTIONS.find((o) => o.value === fixedSection)?.label ??
              fixedSection
            }
            readOnly
            className="input bg-slate-100"
          />
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Select Forwarding Section
          </label>
          <select
            required
            value={section}
            onChange={(e) => setSection(e.target.value as ForwardingSection)}
            className="input"
          >
            {SECTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Authorised Signatory Name
        </label>
        <input
          required
          value={approverName}
          onChange={(e) => setApproverName(e.target.value)}
          placeholder="Full name of the signatory"
          className="input"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition disabled:opacity-60"
      >
        {isPending ? "Forwarding…" : "Forward & Approve"}
      </button>
    </form>
  );
}

// ── Stage 2 Panel ────────────────────────────────────────────────────────────

export function ITAdminPanel({
  formId,
  stageNumber,
  stageLabel,
}: {
  formId: string;
  stageNumber: number;
  stageLabel: string;
}) {
  const [assignedEmail, setAssignedEmail] = useState("");
  const [dateOfCreation, setDateOfCreation] = useState("");
  const [tentativeRemovalDate, setTentativeRemovalDate] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await issueEmailId(
          formId,
          assignedEmail,
          dateOfCreation,
          tentativeRemovalDate || null,
          createdBy
        );
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="print-hidden space-y-4 rounded-xl border border-green-200 bg-green-50 p-5"
    >
      <h3 className="font-semibold text-green-800">Stage 2 — IT Admin Approval</h3>
      <p className="text-xs font-medium uppercase tracking-wide text-green-700">Stage {stageNumber}: {stageLabel}</p>
      <p className="text-sm text-green-700">
        Email ID creation approved by (with date).
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Assigned Email id
        </label>
        <input
          required
          type="email"
          value={assignedEmail}
          onChange={(e) => setAssignedEmail(e.target.value)}
          placeholder="firstname@iitrpr.ac.in"
          className="input font-mono"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Date of creation
          </label>
          <input
            required
            type="date"
            value={dateOfCreation}
            onChange={(e) => setDateOfCreation(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Tentative date of removal of id
          </label>
          <input
            type="date"
            value={tentativeRemovalDate}
            onChange={(e) => setTentativeRemovalDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Id created by
        </label>
        <input
          required
          value={createdBy}
          onChange={(e) => setCreatedBy(e.target.value)}
          placeholder="IT Admin name"
          className="input"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 transition disabled:opacity-60"
      >
        {isPending ? "Issuing…" : "Issue Email ID"}
      </button>
    </form>
  );
}
