import { getPgPool } from "@/lib/db";
import type { AppRole } from "@/lib/mock-db";

export interface WorkflowStage {
  stage: number;
  role: string; // Comma-separated AppRole list e.g. "HOD,SECTION_HEAD"
  mode?: "OR" | "AND" | string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  stages: WorkflowStage[];
  updatedAt: Date;
}

export function getWorkflowStageRoleCodes(stage: WorkflowStage) {
  return String(stage.role)
    .split(",")
    .map((roleCode) => roleCode.trim().toUpperCase())
    .filter(Boolean);
}

export function getWorkflowStageMode(stage: WorkflowStage): "OR" | "AND" {
  const modeRaw = String(stage.mode ?? "OR").trim().toUpperCase();
  return modeRaw === "AND" ? "AND" : "OR";
}

export function isRoleEligibleForStage(stage: WorkflowStage, role: AppRole) {
  const stageRoles = getWorkflowStageRoleCodes(stage) as AppRole[];
  return stageRoles.includes(role);
}

/**
 * Fetch the full dynamic workflow blueprint for a specific form type.
 */
export async function getWorkflow(formId: string): Promise<WorkflowDefinition | null> {
  const pool = getPgPool();
  if (!pool) return null;

  const result = await pool.query(
    `SELECT id, name, description, stages, updated_at FROM app_workflows WHERE id = $1 LIMIT 1`,
    [formId]
  );

  if (result.rowCount === 0) return null;
  const row = result.rows[0];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    stages: row.stages as WorkflowStage[],
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Returns all workflows currently registered in the dynamic engine.
 */
export async function listWorkflows(): Promise<WorkflowDefinition[]> {
  const pool = getPgPool();
  if (!pool) return [];

  const result = await pool.query(`SELECT id, name, description, stages, updated_at FROM app_workflows ORDER BY name`);
  
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    stages: row.stages as WorkflowStage[],
    updatedAt: new Date(row.updated_at),
  }));
}

/**
 * Determine the exact numerical stages a specific role is responsible for auditing.
 */
export function getStagesForRole(workflow: WorkflowDefinition, activeRole: AppRole): number[] {
  const roleAliases: Partial<Record<AppRole, AppRole[]>> = {
    HOD: ["SECTION_HEAD"],
    SECTION_HEAD: ["HOD"],
  };

  const eligibleRoles = new Set<AppRole>([activeRole, ...(roleAliases[activeRole] ?? [])]);

  return workflow.stages
    .filter((s) => {
      const stageRoles = getWorkflowStageRoleCodes(s) as AppRole[];
      return stageRoles.some((role) => eligibleRoles.has(role));
    })
    .map((s) => s.stage);
}

/**
 * Calculate the next stage number for a submission given its current stage.
 * Returns null if the current stage is the final stage.
 */
export function getNextStage(workflow: WorkflowDefinition, currentStage: number): number | null {
  // Assuming stages are sorted sequentially. Find the stage immediately after current.
  const sorted = [...workflow.stages].sort((a, b) => a.stage - b.stage);
  const next = sorted.find((s) => s.stage > currentStage);
  return next ? next.stage : null;
}

/**
 * Retrieve the minimum (first) stage to start the workflow.
 */
export function getFirstStage(workflow: WorkflowDefinition): number {
  if (workflow.stages.length === 0) return 1;
  const sorted = [...workflow.stages].sort((a, b) => a.stage - b.stage);
  return sorted[0].stage;
}
