"use client";

import {
  approveHostelUndertakingAtCurrentStage,
  approveHostelUndertakingStageByWarden,
  rejectHostelUndertakingAtCurrentStage,
  rejectHostelUndertakingStageByWarden,
} from "@/app/actions/hostel-undertaking";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function HostelWardenApprovalPanel({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [approverName, setApproverName] = useState("");
  const [remark, setRemark] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await approveHostelUndertakingStageByWarden(submissionId, approverName, remark);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      try {
        await rejectHostelUndertakingStageByWarden(submissionId, approverName, rejectRemark);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={handleApprove} className="print-hidden space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <h3 className="font-semibold text-amber-800">Stage 1 - Hostel Warden Acknowledgement</h3>

      <div>
        <label className="label">Approver Name</label>
        <input
          value={approverName}
          onChange={(event) => setApproverName(event.target.value)}
          required
          className="input"
        />
      </div>

      <div>
        <label className="label">Approval Remark</label>
        <input
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
          required
          className="input"
          placeholder="Acknowledged and verified"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        disabled={isPending}
        className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {isPending ? "Approving..." : "Approve as Hostel Warden"}
      </button>

      <div className="border-t border-amber-200 pt-4">
        <label className="label">Rejection Remark</label>
        <input
          value={rejectRemark}
          onChange={(event) => setRejectRemark(event.target.value)}
          className="input"
          placeholder="Reason for rejection"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={handleReject}
          className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? "Rejecting..." : "Reject with Remark"}
        </button>
      </div>
    </form>
  );
}

export function DynamicHostelStageApprovalPanel({
  submissionId,
  stageNumber,
}: {
  submissionId: string;
  stageNumber: number;
}) {
  const router = useRouter();
  const [approverName, setApproverName] = useState("");
  const [remark, setRemark] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await approveHostelUndertakingAtCurrentStage(submissionId, approverName, remark);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      try {
        await rejectHostelUndertakingAtCurrentStage(submissionId, approverName, rejectRemark);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={handleApprove} className="print-hidden space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-5">
      <h3 className="font-semibold text-slate-800">Stage {stageNumber} - Standard Review</h3>

      <div>
        <label className="label">Approver Name</label>
        <input
          value={approverName}
          onChange={(event) => setApproverName(event.target.value)}
          required
          className="input"
        />
      </div>

      <div>
        <label className="label">Approval Remark</label>
        <input
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
          required
          className="input"
          placeholder="Approved and verified"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        disabled={isPending}
        className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Approving..." : `Approve Stage ${stageNumber}`}
      </button>

      <div className="border-t border-slate-300 pt-4">
        <label className="label">Rejection Remark</label>
        <input
          value={rejectRemark}
          onChange={(event) => setRejectRemark(event.target.value)}
          className="input"
          placeholder="Reason for rejection"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={handleReject}
          className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? "Rejecting..." : "Reject with Remark"}
        </button>
      </div>
    </form>
  );
}
