"use client";

import {
  approveIdentityCardAtCurrentStage,
  approveIdentityCardByEstablishment,
  approveIdentityCardByHodOrSectionHead,
  approveIdentityCardByRegistrarOrDean,
  rejectIdentityCardAtCurrentStage,
  rejectIdentityCardByEstablishment,
  rejectIdentityCardByHodOrSectionHead,
  rejectIdentityCardByRegistrarOrDean,
} from "@/app/actions/identity-card";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function StagePanel(props: {
  title: string;
  accentClass: string;
  actionLabel: string;
  onApprove: (approverName: string) => Promise<void>;
  onReject: (approverName: string, remark: string) => Promise<void>;
}) {
  const [approverName, setApproverName] = useState("");
  const [rejectRemark, setRejectRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submitApprove(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await props.onApprove(approverName);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={submitApprove} className={`space-y-4 rounded-xl border p-5 ${props.accentClass}`}>
      <h3 className="font-semibold">{props.title}</h3>
      <div>
        <label className="label">Approver Name</label>
        <input
          value={approverName}
          onChange={(e) => setApproverName(e.target.value)}
          required
          className="input"
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        disabled={isPending}
        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Processing..." : props.actionLabel}
      </button>

      <div className="border-t border-slate-200 pt-4">
        <label className="label">Rejection Remark</label>
        <input
          value={rejectRemark}
          onChange={(e) => setRejectRemark(e.target.value)}
          className="input"
          placeholder="Reason for rejection"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null);
                await props.onReject(approverName, rejectRemark);
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

export function HodSectionHeadPanel({ submissionId }: { submissionId: string }) {
  return (
    <StagePanel
      title="Stage 1 - HoD / Section Head Forwarding"
      accentClass="border-blue-200 bg-blue-50 text-blue-800"
      actionLabel="Approve Stage 1"
      onApprove={(approverName) => approveIdentityCardByHodOrSectionHead(submissionId, approverName)}
      onReject={(approverName, remark) =>
        rejectIdentityCardByHodOrSectionHead(submissionId, approverName, remark)
      }
    />
  );
}

export function EstablishmentPanel({ submissionId }: { submissionId: string }) {
  return (
    <StagePanel
      title="Stage 2 - Establishment Review"
      accentClass="border-amber-200 bg-amber-50 text-amber-800"
      actionLabel="Approve Stage 2"
      onApprove={(approverName) => approveIdentityCardByEstablishment(submissionId, approverName)}
      onReject={(approverName, remark) =>
        rejectIdentityCardByEstablishment(submissionId, approverName, remark)
      }
    />
  );
}

export function RegistrarDeanPanel({ submissionId }: { submissionId: string }) {
  return (
    <StagePanel
      title="Stage 3 - Registrar / Dean Final Approval"
      accentClass="border-green-200 bg-green-50 text-green-800"
      actionLabel="Approve Final Stage"
      onApprove={(approverName) => approveIdentityCardByRegistrarOrDean(submissionId, approverName)}
      onReject={(approverName, remark) =>
        rejectIdentityCardByRegistrarOrDean(submissionId, approverName, remark)
      }
    />
  );
}

export function DynamicStagePanel({ submissionId, stageNumber }: { submissionId: string; stageNumber: number }) {
  return (
    <StagePanel
      title={`Stage ${stageNumber} - Standard Review`}
      accentClass="border-slate-300 bg-slate-50 text-slate-800"
      actionLabel={`Approve Stage ${stageNumber}`}
      onApprove={(approverName) => approveIdentityCardAtCurrentStage(submissionId, approverName)}
      onReject={(approverName, remark) =>
        rejectIdentityCardAtCurrentStage(submissionId, approverName, remark)
      }
    />
  );
}
