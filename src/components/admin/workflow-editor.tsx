"use client";

import { useTransition, useState } from "react";
import { updateWorkflowStages } from "@/app/actions/admin-workflows";
import type { ActiveDelegationRecord, DelegationQueueKey } from "@/lib/delegation-store";

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Student",
  INTERN: "Intern",
  EMPLOYEE: "Employee",
  HOSTEL_WARDEN: "Hostel Warden",
  SUPERVISOR: "Supervisor",
  SECTION_HEAD: "Section Head",
  HOD: "HoD",
  REGISTRAR: "Registrar",
  DEAN_FAA: "Dean",
  DIRECTOR: "Director",
  DEPUTY_DEAN: "Deputy Dean",
  STUDENT_AFFAIRS_HOSTEL_MGMT: "Student Affairs",
  SECURITY_OFFICE: "Security Office",
  FORWARDING_AUTHORITY_ACADEMICS: "Academics",
  ESTABLISHMENT: "Establishment",
  FORWARDING_AUTHORITY_R_AND_D: "R&D",
  APPROVING_AUTHORITY: "Approving Authority",
  GUEST_HOUSE_INCHARGE: "Guest House In-charge",
  GUEST_HOUSE_COMMITTEE_CHAIR: "Chairman GH Committee",
  IT_ADMIN: "IT Admin",
  SYSTEM_ADMIN: "System Admin",
};

type WorkflowStageRow = {
  stage: number;
  role: string;
  mode?: "OR" | "AND" | string;
};

type WorkflowEditorInput = {
  id: string;
  name: string;
  description: string;
  stages: WorkflowStageRow[];
};

function toRoleLabel(roleCode: string) {
  return ROLE_LABELS[roleCode] ?? roleCode.replace(/_/g, " ");
}

function toRoleGroupLabel(group: string) {
  const mode = group.includes("&") ? "AND" : "OR";
  const separator = mode === "AND" ? " & " : " / ";

  return group
    .replace(/\|/g, ",")
    .replace(/&/g, ",")
    .split(",")
    .map((roleCode) => toRoleLabel(roleCode.trim()))
    .join(separator);
}

export function WorkflowEditor({
  workflow,
  activeDelegations,
  targetTextByDelegationId,
  delegatedUserLabelById,
  roleOptions,
}: {
  workflow: WorkflowEditorInput;
  activeDelegations: ActiveDelegationRecord[];
  targetTextByDelegationId: Record<string, string>;
  delegatedUserLabelById: Record<string, string>;
  roleOptions: string[];
}) {
  const [stages, setStages] = useState(() => 
    workflow.stages.map((s) => ({ ...s, mode: s.mode === "AND" ? "AND" : "OR" }))
  );
  const [isPending, startTransition] = useTransition();

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newStages = [...stages];
    [newStages[index - 1], newStages[index]] = [newStages[index], newStages[index - 1]];
    setStages(newStages);
  };

  const handleMoveDown = (index: number) => {
    if (index === stages.length - 1) return;
    const newStages = [...stages];
    [newStages[index + 1], newStages[index]] = [newStages[index], newStages[index + 1]];
    setStages(newStages);
  };

  const handleAddStage = () => {
    const defaultRole = roleOptions[0] ?? "SYSTEM_ADMIN";
    setStages([...stages, { stage: stages.length + 1, role: defaultRole, mode: "OR" }]);
  };

  const handleRemoveStage = (index: number) => {
    const newStages = stages.filter((_, i: number) => i !== index);
    setStages(newStages);
  };

  const handleRoleListChange = (index: number, selectedRoles: string[]) => {
    const newStages = [...stages];
    const normalized = Array.from(
      new Set(selectedRoles.map((roleCode) => roleCode.trim().toUpperCase()).filter(Boolean))
    );
    if (normalized.length === 0) {
      return;
    }

    newStages[index] = {
      ...newStages[index],
      role: normalized.join(","),
    };
    setStages(newStages);
  };

  const handleModeChange = (index: number, mode: "OR" | "AND") => {
    const newStages = [...stages];
    newStages[index] = {
      ...newStages[index],
      mode,
    };
    setStages(newStages);
  };

  const handleSave = () => {
    startTransition(async () => {
      await updateWorkflowStages(workflow.id, stages);
    });
  };

  const hasChanges = JSON.stringify(stages) !== JSON.stringify(workflow.stages);

  // If a workflow contains a legacy role not in the default list, ensure it still renders
  const uniqueRolesInUse = Array.from(
    new Set(
      stages.flatMap((s) =>
        String(s.role)
          .split(",")
          .map((roleCode) => roleCode.trim().toUpperCase())
          .filter(Boolean)
      )
    )
  );
  const dropDownOptions = Array.from(
    new Set([...roleOptions, ...uniqueRolesInUse])
  );

  const activeDelegationsByRole = activeDelegations.reduce((acc, item) => {
    const normalizedRole = String(item.delegatedRole).trim().toUpperCase();
    const bucket = acc.get(normalizedRole) ?? [];
    bucket.push(item);
    acc.set(normalizedRole, bucket);
    return acc;
  }, new Map<string, ActiveDelegationRecord[]>());

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{workflow.name}</h2>
          <p className="text-sm text-slate-500">{workflow.description}</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isPending || stages.length === 0}
            className="flex h-9 items-center rounded-lg bg-black px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      <div className="p-6 overflow-x-auto">
        <div className="flex min-w-max items-center gap-4 py-4">
          <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center shadow-sm w-48 shrink-0">
            <span className="mb-1 text-sm font-bold leading-tight text-emerald-900">Applicant</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Start</span>
          </div>
          
          <div className="flex w-8 items-center justify-center text-slate-300 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </div>

          {stages.map((stage, i: number) => (
            <div key={i} className="flex items-center gap-4 shrink-0">
              <div className="group relative flex w-48 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-slate-300">
                <span
                  className={`absolute -left-2 -top-2 rounded-full px-2 py-0.5 text-[9px] font-black tracking-wide shadow-sm ${
                    stage.mode === "AND"
                      ? "border border-amber-300 bg-amber-100 text-amber-900"
                      : "border border-sky-300 bg-sky-100 text-sky-900"
                  }`}
                >
                  {stage.mode === "AND" ? "AND" : "OR"}
                </span>
                
                {/* Remove Stage */}
                <button 
                  onClick={() => handleRemoveStage(i)} 
                  className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-200"
                  title="Remove Stage"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>

                {/* Reorder Controls */}
                <div className="absolute -top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 bg-white px-2 py-1 shadow-sm rounded-full border border-slate-200">
                  <button 
                    onClick={() => handleMoveUp(i)} 
                    disabled={i === 0}
                    className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"></path></svg>
                  </button>
                  <button 
                    onClick={() => handleMoveDown(i)} 
                    disabled={i === stages.length - 1}
                    className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
                  </button>
                </div>

                <span className="mb-1 text-sm font-bold leading-tight text-slate-800">Stage {i + 1}</span>
                <div className="w-full space-y-2">
                  <select
                    multiple
                    value={String(stage.role)
                      .split(",")
                      .map((roleCode) => roleCode.trim())
                      .filter(Boolean)}
                    onChange={(e) =>
                      handleRoleListChange(
                        i,
                        Array.from(e.target.selectedOptions).map((opt) => opt.value)
                      )
                    }
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
                    title="Select one or more stage roles"
                  >
                    {dropDownOptions.map((opt) => (
                      <option key={opt as string} value={opt as string}>
                        {toRoleLabel(opt as string)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={stage.mode === "AND" ? "AND" : "OR"}
                    onChange={(e) => handleModeChange(i, e.target.value === "AND" ? "AND" : "OR")}
                    className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 focus:border-indigo-500 focus:outline-none"
                    title="Choose approval rule"
                  >
                    <option value="OR">OR (any selected role can approve)</option>
                    <option value="AND">AND (all selected roles must approve)</option>
                  </select>

                  <p className="text-[9px] font-semibold text-slate-500">
                    {toRoleGroupLabel(
                      String(stage.role)
                        .split(",")
                        .map((roleCode) => roleCode.trim())
                        .filter(Boolean)
                        .join(stage.mode === "AND" ? "&" : "|")
                    )}
                  </p>
                </div>

                {(() => {
                  const queueLabelByKey: Record<string, string> = {
                    "email-id": "Email Queue",
                    "vehicle-sticker": "Vehicle Sticker Queue",
                    "identity-card": "Identity Card Queue",
                    "guest-house": "Guest House Queue",
                    "hostel-undertaking": "Hostel Undertaking Queue",
                  };

                  const roleCodes = String(stage.role)
                    .split(",")
                    .map((r: string) => r.trim().toUpperCase())
                    .filter(Boolean);

                  const workflowQueueKey = Object.prototype.hasOwnProperty.call(queueLabelByKey, workflow.id)
                    ? (workflow.id as keyof typeof queueLabelByKey)
                    : null;

                  const matches = roleCodes.flatMap((roleCode: string) => activeDelegationsByRole.get(roleCode) ?? []);
                  const uniqueMatches = Array.from(new Map(matches.map((d) => [d.id, d])).values()).filter((d) => {
                    const hasQueueMappings = Object.keys(d.queueDelegations).length > 0;
                    if (hasQueueMappings) {
                      return workflowQueueKey ? Boolean(d.queueDelegations[workflowQueueKey as DelegationQueueKey]) : false;
                    }
                    return Boolean(d.replacementName || d.replacementEmail);
                  });
                  if (uniqueMatches.length === 0) return null;

                  return (
                    <div className="mt-2 space-y-1 text-left w-full">
                      {uniqueMatches.slice(0, 2).map((d) => {
                        const workflowQueueDetail = workflowQueueKey
                          ? d.queueDetails.find((detail) => detail.queueKey === workflowQueueKey)
                          : undefined;
                        const workflowQueueUserId = workflowQueueKey
                          ? d.queueDelegations[workflowQueueKey as DelegationQueueKey]
                          : undefined;
                        const displayEndDate = workflowQueueDetail?.hasOverride && workflowQueueDetail.overrideEndsAt
                          ? new Date(workflowQueueDetail.overrideEndsAt)
                          : new Date(d.endsAt);

                        const workflowSpecificTarget = workflowQueueDetail
                          ? (() => {
                              const queueLabel = workflowQueueKey ? queueLabelByKey[workflowQueueKey as DelegationQueueKey] : workflow.id;
                              const originalLabel =
                                delegatedUserLabelById[workflowQueueDetail.originalUserId] ?? workflowQueueDetail.originalUserId;
                              const effectiveLabel = workflowQueueDetail.effectiveUserId
                                ? delegatedUserLabelById[workflowQueueDetail.effectiveUserId] ?? workflowQueueDetail.effectiveUserId
                                : "Skipped";

                              if (workflowQueueDetail.hasOverride) {
                                const starts = workflowQueueDetail.overrideStartsAt
                                  ? new Date(workflowQueueDetail.overrideStartsAt).toLocaleDateString("en-IN")
                                  : null;
                                const ends = workflowQueueDetail.overrideEndsAt
                                  ? new Date(workflowQueueDetail.overrideEndsAt).toLocaleDateString("en-IN")
                                  : null;
                                const windowText = starts && ends ? ` (${starts} to ${ends})` : "";
                                return `${queueLabel}: ${originalLabel} -> ${effectiveLabel}${windowText}`;
                              }

                              return `${queueLabel}: ${effectiveLabel}`;
                            })()
                          : workflowQueueUserId
                            ? `${workflowQueueKey ? queueLabelByKey[workflowQueueKey as DelegationQueueKey] : workflow.id}: ${delegatedUserLabelById[workflowQueueUserId] ?? workflowQueueUserId}`
                            : null;

                        return (
                          <p key={d.id} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-800">
                            Acting: {toRoleLabel(d.delegatedRole)} {"->"} {(workflowSpecificTarget ?? targetTextByDelegationId[d.id] ?? ((d.replacementName ?? d.replacementEmail) || "Replacement").trim())} (till {displayEndDate.toLocaleDateString("en-IN")})
                          </p>
                        );
                      })}
                      {uniqueMatches.length > 2 ? (
                        <p className="text-[9px] font-semibold text-slate-500">
                          +{uniqueMatches.length - 2} more active delegations
                        </p>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
              
              <div className="flex w-8 items-center justify-center text-slate-300 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </div>
            </div>
          ))}

          {/* Add Stage Node */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={handleAddStage}
              className="group relative flex w-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-transparent p-4 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="text-slate-400 group-hover:text-indigo-500 mb-1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600">Add Stage</span>
            </button>
            <div className="flex w-8 items-center justify-center text-slate-300 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-4 text-center shadow-sm w-48 shrink-0">
            <span className="mb-1 text-sm font-bold leading-tight text-amber-900">Approved</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">End</span>
          </div>
        </div>
      </div>
    </div>
  );
}
