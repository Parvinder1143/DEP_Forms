import { randomUUID } from "node:crypto";
import { getPgPool } from "@/lib/db";

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  const pool = getPgPool();
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_stage_role_approvals (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      stage_number INTEGER NOT NULL,
      role_code TEXT NOT NULL,
      approver_user_id TEXT,
      approver_email TEXT NOT NULL,
      approver_name TEXT,
      approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (submission_id, stage_number, role_code)
    );
  `);

  schemaReady = true;
}

export async function addRoleApprovalForStage(input: {
  submissionId: string;
  stageNumber: number;
  roleCode: string;
  approverUserId: string;
  approverEmail: string;
  approverName?: string | null;
}) {
  const pool = getPgPool();
  if (!pool) {
    return { inserted: true };
  }

  await ensureSchema();

  const result = await pool.query(
    `
    INSERT INTO app_stage_role_approvals (
      id,
      submission_id,
      stage_number,
      role_code,
      approver_user_id,
      approver_email,
      approver_name
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (submission_id, stage_number, role_code) DO NOTHING
  `,
    [
      randomUUID(),
      input.submissionId,
      input.stageNumber,
      input.roleCode.toUpperCase(),
      input.approverUserId,
      input.approverEmail.toLowerCase(),
      input.approverName ?? null,
    ]
  );

  return { inserted: (result.rowCount ?? 0) > 0 };
}

export async function listApprovedRolesForStage(submissionId: string, stageNumber: number) {
  const pool = getPgPool();
  if (!pool) {
    return [] as string[];
  }

  await ensureSchema();

  const result = await pool.query(
    `
    SELECT role_code
    FROM app_stage_role_approvals
    WHERE submission_id = $1
      AND stage_number = $2
  `,
    [submissionId, stageNumber]
  );

  return result.rows.map((row) => String(row.role_code).toUpperCase());
}

export async function clearStageRoleApprovals(submissionId: string, stageNumber: number) {
  const pool = getPgPool();
  if (!pool) {
    return;
  }

  await ensureSchema();

  await pool.query(
    `
    DELETE FROM app_stage_role_approvals
    WHERE submission_id = $1
      AND stage_number = $2
  `,
    [submissionId, stageNumber]
  );
}

export async function listRoleStageApprovalsForSubmissions(
  roleCode: string,
  submissionIds: string[]
) {
  const pool = getPgPool();
  const ids = submissionIds.filter(Boolean);
  if (!pool || ids.length === 0) {
    return new Map<string, Set<number>>();
  }

  await ensureSchema();

  const result = await pool.query(
    `
    SELECT submission_id, stage_number
    FROM app_stage_role_approvals
    WHERE role_code = $1
      AND submission_id = ANY($2)
  `,
    [roleCode.toUpperCase(), ids]
  );

  const map = new Map<string, Set<number>>();
  for (const row of result.rows) {
    const submissionId = String(row.submission_id);
    const stageNumber = Number(row.stage_number);
    const bucket = map.get(submissionId) ?? new Set<number>();
    bucket.add(stageNumber);
    map.set(submissionId, bucket);
  }

  return map;
}
