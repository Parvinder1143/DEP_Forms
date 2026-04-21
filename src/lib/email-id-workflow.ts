import type { EmailFormWithApprovals } from "@/lib/email-id-store";
import type { AppRole } from "@/lib/mock-db";
import {
  getFirstStage,
  getWorkflowStageRoleCodes,
  getNextStage,
  type WorkflowDefinition,
  type WorkflowStage,
} from "@/lib/workflow-engine";

export function getSortedWorkflowStages(workflow: WorkflowDefinition) {
  return [...workflow.stages].sort((a, b) => a.stage - b.stage);
}

export function getHighestApprovedStage(form: Pick<EmailFormWithApprovals, "approvals">) {
  if (!form.approvals.length) {
    return null;
  }

  return Math.max(...form.approvals.map((approval) => approval.stage));
}

export function getCurrentEmailWorkflowStage(
  form: Pick<EmailFormWithApprovals, "status" | "approvals">,
  workflow: WorkflowDefinition
): number | null {
  if (form.status === "REJECTED" || form.status === "ISSUED") {
    return null;
  }

  const highestApprovedStage = getHighestApprovedStage(form);
  if (!highestApprovedStage) {
    return getFirstStage(workflow);
  }

  return getNextStage(workflow, highestApprovedStage);
}

export function getStageDefinitionByNumber(
  workflow: WorkflowDefinition,
  stageNumber: number
): WorkflowStage | null {
  return workflow.stages.find((stage) => stage.stage === stageNumber) ?? null;
}

export function parseStageRoles(stage: WorkflowStage | null) {
  if (!stage) {
    return [];
  }

  return getWorkflowStageRoleCodes(stage);
}

export function roleCanApproveStage(stage: WorkflowStage | null, role: AppRole | null) {
  if (!stage || !role) {
    return false;
  }

  const normalizedRole = String(role).toUpperCase();
  return parseStageRoles(stage).includes(normalizedRole);
}

export function stageRequiresIssuanceFields(workflow: WorkflowDefinition, stageNumber: number) {
  const nextStage = getNextStage(workflow, stageNumber);
  return nextStage === null;
}

export function roleGroupToLabel(
  stageRole: string,
  toRoleLabel: (roleCode: string) => string,
  mode: "OR" | "AND" = "OR"
) {
  const separator = mode === "AND" ? " & " : " / ";

  return stageRole
    .split(",")
    .map((roleCode) => toRoleLabel(roleCode.trim().toUpperCase()))
    .join(separator);
}
