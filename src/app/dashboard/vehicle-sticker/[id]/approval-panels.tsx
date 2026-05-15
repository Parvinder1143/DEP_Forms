"use client";

import {
  approveVehicleStickerAtCurrentStage,
  approveVehicleStickerByHod,
  rejectVehicleStickerByHod,
  rejectVehicleStickerAtCurrentStage,
  rejectVehicleStickerBySecurityOffice,
  rejectVehicleStickerByStudentAffairsHostel,
  rejectVehicleStickerBySupervisor,
  approveVehicleStickerByStudentAffairsHostel,
  approveVehicleStickerBySupervisor,
  issueVehicleStickerBySecurityOffice,
} from "@/app/actions/vehicle-sticker";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SupervisorPanel({ submissionId }: { submissionId: string }) {
  const [approverName, setApproverName] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await approveVehicleStickerBySupervisor(submissionId, approverName);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="print-hidden space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <h3 className="font-semibold text-amber-800">Stage 1 - Supervisor Recommendation</h3>
      <div>
        <label className="label">Supervisor Name</label>
        <input value={approverName} onChange={(e) => setApproverName(e.target.value)} required className="input" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={isPending} className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
        {isPending ? "Approving..." : "Approve as Supervisor"}
      </button>

      <div className="border-t border-amber-200 pt-4">
        <label className="label">Rejection Remark</label>
        <input value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} className="input" placeholder="Reason for rejection" />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                await rejectVehicleStickerBySupervisor(submissionId, approverName, rejectRemark);
                router.refresh();
              } catch (err) {
                setError((err as Error).message);
              }
            })
          }
          className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? "Rejecting..." : "Reject with Remark"}
        </button>
      </div>
    </form>
  );
}

export function HodPanel({ submissionId }: { submissionId: string }) {
  const [approverName, setApproverName] = useState("");
  const [validUpto, setValidUpto] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await approveVehicleStickerByHod(submissionId, approverName, validUpto);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="print-hidden space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-5">
      <h3 className="font-semibold text-blue-800">Stage 2 - HoD Recommendation</h3>
      <div>
        <label className="label">HoD / Section Head Name</label>
        <input value={approverName} onChange={(e) => setApproverName(e.target.value)} required className="input" />
      </div>
      <div>
        <label className="label">Valid Upto *</label>
        <input type="date" value={validUpto} onChange={(e) => setValidUpto(e.target.value)} required className="input" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={isPending} className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
        {isPending ? "Approving..." : "Approve as HoD"}
      </button>

      <div className="border-t border-blue-200 pt-4">
        <label className="label">Rejection Remark</label>
        <input value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} className="input" placeholder="Reason for rejection" />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                await rejectVehicleStickerByHod(submissionId, approverName, rejectRemark);
                router.refresh();
              } catch (err) {
                setError((err as Error).message);
              }
            })
          }
          className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? "Rejecting..." : "Reject with Remark"}
        </button>
      </div>
    </form>
  );
}

export function StudentAffairsHostelPanel({ submissionId }: { submissionId: string }) {
  const [approverName, setApproverName] = useState("");
  const [recommendationText, setRecommendationText] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [residingInHostel, setResidingInHostel] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await approveVehicleStickerByStudentAffairsHostel(
          submissionId,
          approverName,
          residingInHostel,
          recommendationText
        );
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="print-hidden space-y-4 rounded-xl border border-purple-200 bg-purple-50 p-5">
      <h3 className="font-semibold text-purple-800">Stage 3 - Student Affairs</h3>
      <div>
        <label className="label">Approver Name</label>
        <input value={approverName} onChange={(e) => setApproverName(e.target.value)} required className="input" />
      </div>
      <div>
        <label className="label">Whether residing in hostel</label>
        <select
          className="input"
          value={residingInHostel ? "yes" : "no"}
          onChange={(e) => setResidingInHostel(e.target.value === "yes")}
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <div>
        <label className="label">Recommendation / Duration</label>
        <input value={recommendationText} onChange={(e) => setRecommendationText(e.target.value)} required className="input" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={isPending} className="w-full rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-60">
        {isPending ? "Approving..." : "Approve Stage 3"}
      </button>

      <div className="border-t border-purple-200 pt-4">
        <label className="label">Rejection Remark</label>
        <input value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} className="input" placeholder="Reason for rejection" />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                await rejectVehicleStickerByStudentAffairsHostel(submissionId, approverName, rejectRemark);
                router.refresh();
              } catch (err) {
                setError((err as Error).message);
              }
            })
          }
          className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? "Rejecting..." : "Reject with Remark"}
        </button>
      </div>
    </form>
  );
}

export function SecurityOfficePanel({
  submissionId,
  stageNumber = 4,
}: {
  submissionId: string;
  stageNumber?: number;
}) {
  const [approverName, setApproverName] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [issuedStickerNo, setIssuedStickerNo] = useState("");
  const [validUpto, setValidUpto] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await issueVehicleStickerBySecurityOffice(
          submissionId,
          approverName,
          issuedStickerNo,
          validUpto,
          issueDate
        );
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="print-hidden space-y-4 rounded-xl border border-green-200 bg-green-50 p-5">
      <h3 className="font-semibold text-green-800">Stage {stageNumber} - Security Office</h3>
      <div>
        <label className="label">Security Officer Name</label>
        <input value={approverName} onChange={(e) => setApproverName(e.target.value)} required className="input" />
      </div>
      <div>
        <label className="label">Issued Vehicle Sticker No</label>
        <input value={issuedStickerNo} onChange={(e) => setIssuedStickerNo(e.target.value)} required className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Valid Upto</label>
          <input type="date" value={validUpto} onChange={(e) => setValidUpto(e.target.value)} required className="input" />
        </div>
        <div>
          <label className="label">Issue Date</label>
          <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required className="input" />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={isPending} className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">
        {isPending ? "Issuing..." : "Issue Vehicle Sticker"}
      </button>

      <div className="border-t border-green-200 pt-4">
        <label className="label">Rejection Remark</label>
        <input value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} className="input" placeholder="Reason for rejection" />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                await rejectVehicleStickerBySecurityOffice(submissionId, approverName, rejectRemark);
                router.refresh();
              } catch (err) {
                setError((err as Error).message);
              }
            })
          }
          className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? "Rejecting..." : "Reject with Remark"}
        </button>
      </div>
    </form>
  );
}

export function DynamicVehicleStagePanel({
  submissionId,
  stageNumber,
}: {
  submissionId: string;
  stageNumber: number;
}) {
  const [approverName, setApproverName] = useState("");
  const [remark, setRemark] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await approveVehicleStickerAtCurrentStage(submissionId, approverName, remark);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="print-hidden space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-5">
      <h3 className="font-semibold text-slate-800">Stage {stageNumber} - Standard Review</h3>
      <div>
        <label className="label">Approver Name</label>
        <input value={approverName} onChange={(e) => setApproverName(e.target.value)} required className="input" />
      </div>
      <div>
        <label className="label">Approval Remark</label>
        <input value={remark} onChange={(e) => setRemark(e.target.value)} required className="input" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={isPending} className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
        {isPending ? "Approving..." : `Approve Stage ${stageNumber}`}
      </button>

      <div className="border-t border-slate-300 pt-4">
        <label className="label">Rejection Remark</label>
        <input value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} className="input" placeholder="Reason for rejection" />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                await rejectVehicleStickerAtCurrentStage(submissionId, approverName, rejectRemark);
                router.refresh();
              } catch (err) {
                setError((err as Error).message);
              }
            })
          }
          className="mt-3 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {isPending ? "Rejecting..." : "Reject with Remark"}
        </button>
      </div>
    </form>
  );
}
