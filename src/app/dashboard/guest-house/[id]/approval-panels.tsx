"use client";

import {
  approveGuestHouseAtCurrentStage,
  approveGuestHouseByApprovingAuthority,
  approveGuestHouseByChairman,
  approveGuestHouseByIncharge,
  rejectGuestHouseAtCurrentStage,
  rejectGuestHouseByApprovingAuthority,
  rejectGuestHouseByChairman,
  rejectGuestHouseByIncharge,
} from "@/app/actions/guest-house";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ApprovingAuthorityPanel({ submissionId }: { submissionId: string }) {
  const [approverName, setApproverName] = useState("");
  const [remark, setRemark] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await approveGuestHouseByApprovingAuthority(submissionId, approverName, remark);
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
      className="print-hidden space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-5"
    >
      <h3 className="font-semibold text-amber-800">Stage 1 - Competent Authority</h3>
      <div>
        <label className="label">Approver Name *</label>
        <input required value={approverName} onChange={(e) => setApproverName(e.target.value)} className="input" />
      </div>
      <div>
        <label className="label">Approval Remark *</label>
        <textarea required value={remark} onChange={(e) => setRemark(e.target.value)} className="input h-20" />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        disabled={isPending}
        className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {isPending ? "Approving..." : "Approve Stage 1"}
      </button>

      <div className="border-t border-amber-200 pt-4">
        <label className="label">Rejection Remark *</label>
        <textarea value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} className="input h-20" />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                await rejectGuestHouseByApprovingAuthority(submissionId, approverName, rejectRemark);
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

export function InChargePanel({ submissionId }: { submissionId: string }) {
  const [approverName, setApproverName] = useState("");
  const [roomNoConfirmed, setRoomNoConfirmed] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [checkInDateTime, setCheckInDateTime] = useState("");
  const [checkOutDateTime, setCheckOutDateTime] = useState("");
  const [officeRemarks, setOfficeRemarks] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await approveGuestHouseByIncharge({
              submissionId,
              approverName,
              roomNoConfirmed,
              entryDate,
              checkInDateTime,
              checkOutDateTime,
              officeRemarks,
            });
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
      className="print-hidden space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-5"
    >
      <h3 className="font-semibold text-blue-800">Stage 2 - Guest House In-charge</h3>
      <div>
        <label className="label">In-charge Name *</label>
        <input required value={approverName} onChange={(e) => setApproverName(e.target.value)} className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Room No Confirmed *</label>
          <input required value={roomNoConfirmed} onChange={(e) => setRoomNoConfirmed(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Entry Date *</label>
          <input required type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="input" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Check-in Date Time *</label>
          <input
            required
            type="datetime-local"
            value={checkInDateTime}
            onChange={(e) => setCheckInDateTime(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label">Check-out Date Time *</label>
          <input
            required
            type="datetime-local"
            value={checkOutDateTime}
            onChange={(e) => setCheckOutDateTime(e.target.value)}
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="label">Office Remarks *</label>
        <textarea required value={officeRemarks} onChange={(e) => setOfficeRemarks(e.target.value)} className="input h-20" />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        disabled={isPending}
        className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isPending ? "Approving..." : "Approve Stage 2"}
      </button>

      <div className="border-t border-blue-200 pt-4">
        <label className="label">Rejection Remark *</label>
        <textarea value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} className="input h-20" />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                await rejectGuestHouseByIncharge(submissionId, approverName, rejectRemark);
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

export function ChairmanPanel({ submissionId }: { submissionId: string }) {
  const [approverName, setApproverName] = useState("");
  const [remark, setRemark] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await approveGuestHouseByChairman(submissionId, approverName, remark);
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
      className="print-hidden space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
    >
      <h3 className="font-semibold text-emerald-800">Stage 3 - Chairman GH Committee</h3>
      <div>
        <label className="label">Chairman Name *</label>
        <input required value={approverName} onChange={(e) => setApproverName(e.target.value)} className="input" />
      </div>
      <div>
        <label className="label">Approval Remark *</label>
        <textarea required value={remark} onChange={(e) => setRemark(e.target.value)} className="input h-20" />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        disabled={isPending}
        className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {isPending ? "Approving..." : "Approve and Close"}
      </button>

      <div className="border-t border-emerald-200 pt-4">
        <label className="label">Rejection Remark *</label>
        <textarea value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} className="input h-20" />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                await rejectGuestHouseByChairman(submissionId, approverName, rejectRemark);
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

export function DynamicGuestHouseStagePanel({
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

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await approveGuestHouseAtCurrentStage(submissionId, approverName, remark);
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
          }
        });
      }}
      className="print-hidden space-y-4 rounded-xl border border-slate-300 bg-slate-50 p-5"
    >
      <h3 className="font-semibold text-slate-800">Stage {stageNumber} - Standard Review</h3>
      <div>
        <label className="label">Approver Name *</label>
        <input required value={approverName} onChange={(e) => setApproverName(e.target.value)} className="input" />
      </div>
      <div>
        <label className="label">Approval Remark *</label>
        <textarea required value={remark} onChange={(e) => setRemark(e.target.value)} className="input h-20" />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        disabled={isPending}
        className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Approving..." : `Approve Stage ${stageNumber}`}
      </button>

      <div className="border-t border-slate-300 pt-4">
        <label className="label">Rejection Remark *</label>
        <textarea value={rejectRemark} onChange={(e) => setRejectRemark(e.target.value)} className="input h-20" />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                await rejectGuestHouseAtCurrentStage(submissionId, approverName, rejectRemark);
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
