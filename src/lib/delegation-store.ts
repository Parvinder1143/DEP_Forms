import { randomUUID } from "node:crypto";
import { getPgPool } from "@/lib/db";
import type { AppRole } from "@/lib/mock-db";

export type DelegationRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "TERMINATED";

export type DelegationRequestRecord = {
  id: string;
  requesterUserId: string;
  requesterEmail: string;
  requesterName: string | null;
  delegatedRole: AppRole;
  replacementUserId: string | null;
  replacementEmail: string | null;
  replacementName: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  status: DelegationRequestStatus;
  adminRemarks: string | null;
  decidedAt: Date | null;
  decidedByUserId: string | null;
  decidedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ActiveDelegationRecord = {
  id: string;
  delegatedRole: AppRole;
  requesterName: string | null;
  requesterEmail: string;
  replacementName: string | null;
  replacementEmail: string;
  startsAt: Date;
  endsAt: Date;
};

type InMemoryDelegationRow = {
  id: string;
  requesterUserId: string;
  requesterEmail: string;
  requesterName: string | null;
  delegatedRole: AppRole;
  replacementUserId: string | null;
  replacementEmail: string | null;
  replacementName: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  status: DelegationRequestStatus;
  adminRemarks: string | null;
  decidedAt: Date | null;
  decidedByUserId: string | null;
  decidedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const mem = globalThis as unknown as {
  __delegationStore?: InMemoryDelegationRow[];
};

let schemaReady = false;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function getMemoryStore() {
  if (!mem.__delegationStore) {
    mem.__delegationStore = [];
  }
  return mem.__delegationStore;
}

async function ensureDelegationSchema() {
  if (schemaReady) return;

  const pool = getPgPool();
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_role_delegation_requests (
      id TEXT PRIMARY KEY,
      requester_user_id TEXT NOT NULL,
      delegated_role TEXT NOT NULL,
      replacement_user_id TEXT,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      admin_remarks TEXT,
      decided_at TIMESTAMPTZ,
      decided_by_user_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  schemaReady = true;
}

function mapDbRow(row: Record<string, unknown>): DelegationRequestRecord {
  return {
    id: String(row.id),
    requesterUserId: String(row.requester_user_id),
    requesterEmail: String(row.requester_email ?? ""),
    requesterName: row.requester_name ? String(row.requester_name) : null,
    delegatedRole: String(row.delegated_role) as AppRole,
    replacementUserId: row.replacement_user_id ? String(row.replacement_user_id) : null,
    replacementEmail: row.replacement_email ? String(row.replacement_email) : null,
    replacementName: row.replacement_name ? String(row.replacement_name) : null,
    startsAt: new Date(String(row.starts_at)),
    endsAt: new Date(String(row.ends_at)),
    reason: String(row.reason),
    status: String(row.status) as DelegationRequestStatus,
    adminRemarks: row.admin_remarks ? String(row.admin_remarks) : null,
    decidedAt: row.decided_at ? new Date(String(row.decided_at)) : null,
    decidedByUserId: row.decided_by_user_id ? String(row.decided_by_user_id) : null,
    decidedByName: row.decided_by_name ? String(row.decided_by_name) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function createDelegationRequest(input: {
  requesterUserId: string;
  requesterRole: AppRole;
  replacementUserId?: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string;
}) {
  if (!hasDatabaseUrl()) {
    const store = getMemoryStore();
    const now = new Date();
    const row: InMemoryDelegationRow = {
      id: randomUUID(),
      requesterUserId: input.requesterUserId,
      requesterEmail: "",
      requesterName: null,
      delegatedRole: input.requesterRole,
      replacementUserId: input.replacementUserId ?? null,
      replacementEmail: null,
      replacementName: null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      reason: input.reason,
      status: "PENDING",
      adminRemarks: null,
      decidedAt: null,
      decidedByUserId: null,
      decidedByName: null,
      createdAt: now,
      updatedAt: now,
    };
    store.push(row);
    return row;
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  await pool.query(
    `
    INSERT INTO app_role_delegation_requests (
      id,
      requester_user_id,
      delegated_role,
      replacement_user_id,
      starts_at,
      ends_at,
      reason,
      status,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', NOW(), NOW())
  `,
    [
      randomUUID(),
      input.requesterUserId,
      input.requesterRole,
      input.replacementUserId ?? null,
      input.startsAt.toISOString(),
      input.endsAt.toISOString(),
      input.reason,
    ]
  );
}

export async function listDelegationRequestsForRequester(requesterUserId: string) {
  if (!hasDatabaseUrl()) {
    return getMemoryStore()
      .filter((row) => row.requesterUserId === requesterUserId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) return [] as DelegationRequestRecord[];

  const result = await pool.query(
    `
    SELECT
      r.id,
      r.requester_user_id,
      req.email AS requester_email,
      req.full_name AS requester_name,
      r.delegated_role,
      r.replacement_user_id,
      rep.email AS replacement_email,
      rep.full_name AS replacement_name,
      r.starts_at,
      r.ends_at,
      r.reason,
      r.status,
      r.admin_remarks,
      r.decided_at,
      r.decided_by_user_id,
      decider.full_name AS decided_by_name,
      r.created_at,
      r.updated_at
    FROM app_role_delegation_requests r
    LEFT JOIN app_users req ON req.id = r.requester_user_id
    LEFT JOIN app_users rep ON rep.id = r.replacement_user_id
    LEFT JOIN app_users decider ON decider.id = r.decided_by_user_id
    WHERE r.requester_user_id = $1
    ORDER BY r.created_at DESC
  `,
    [requesterUserId]
  );

  return result.rows.map((row) => mapDbRow(row));
}

export async function listDelegationRequestsForAdmin() {
  if (!hasDatabaseUrl()) {
    return getMemoryStore().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) return [] as DelegationRequestRecord[];

  const result = await pool.query(`
    SELECT
      r.id,
      r.requester_user_id,
      req.email AS requester_email,
      req.full_name AS requester_name,
      r.delegated_role,
      r.replacement_user_id,
      rep.email AS replacement_email,
      rep.full_name AS replacement_name,
      r.starts_at,
      r.ends_at,
      r.reason,
      r.status,
      r.admin_remarks,
      r.decided_at,
      r.decided_by_user_id,
      decider.full_name AS decided_by_name,
      r.created_at,
      r.updated_at
    FROM app_role_delegation_requests r
    LEFT JOIN app_users req ON req.id = r.requester_user_id
    LEFT JOIN app_users rep ON rep.id = r.replacement_user_id
    LEFT JOIN app_users decider ON decider.id = r.decided_by_user_id
    ORDER BY
      CASE WHEN r.status = 'PENDING' THEN 0 ELSE 1 END,
      r.created_at DESC
  `);

  return result.rows.map((row) => mapDbRow(row));
}

export async function approveDelegationRequest(input: {
  requestId: string;
  replacementUserId: string;
  adminUserId: string;
  adminRemarks?: string | null;
}) {
  if (!hasDatabaseUrl()) {
    const store = getMemoryStore();
    const row = store.find((item) => item.id === input.requestId);
    if (!row) throw new Error("Delegation request not found.");
    if (row.status !== "PENDING") throw new Error("Only pending requests can be approved.");

    row.status = "APPROVED";
    row.replacementUserId = input.replacementUserId;
    row.adminRemarks = input.adminRemarks?.trim() || null;
    row.decidedAt = new Date();
    row.decidedByUserId = input.adminUserId;
    row.updatedAt = new Date();
    return;
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) throw new Error("Database is not configured.");

  const existing = await pool.query(
    `SELECT status FROM app_role_delegation_requests WHERE id = $1 LIMIT 1`,
    [input.requestId]
  );

  if ((existing.rowCount ?? 0) === 0) {
    throw new Error("Delegation request not found.");
  }
  if (String(existing.rows[0].status) !== "PENDING") {
    throw new Error("Only pending requests can be approved.");
  }

  await pool.query(
    `
    UPDATE app_role_delegation_requests
    SET status = 'APPROVED',
        replacement_user_id = $2,
        admin_remarks = $3,
        decided_at = NOW(),
        decided_by_user_id = $4,
        updated_at = NOW()
    WHERE id = $1
  `,
    [input.requestId, input.replacementUserId, input.adminRemarks?.trim() || null, input.adminUserId]
  );
}

export async function rejectDelegationRequest(input: {
  requestId: string;
  adminUserId: string;
  adminRemarks?: string | null;
}) {
  if (!hasDatabaseUrl()) {
    const store = getMemoryStore();
    const row = store.find((item) => item.id === input.requestId);
    if (!row) throw new Error("Delegation request not found.");
    if (row.status !== "PENDING") throw new Error("Only pending requests can be rejected.");

    row.status = "REJECTED";
    row.adminRemarks = input.adminRemarks?.trim() || null;
    row.decidedAt = new Date();
    row.decidedByUserId = input.adminUserId;
    row.updatedAt = new Date();
    return;
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) throw new Error("Database is not configured.");

  const existing = await pool.query(
    `SELECT status FROM app_role_delegation_requests WHERE id = $1 LIMIT 1`,
    [input.requestId]
  );

  if ((existing.rowCount ?? 0) === 0) {
    throw new Error("Delegation request not found.");
  }
  if (String(existing.rows[0].status) !== "PENDING") {
    throw new Error("Only pending requests can be rejected.");
  }

  await pool.query(
    `
    UPDATE app_role_delegation_requests
    SET status = 'REJECTED',
        admin_remarks = $2,
        decided_at = NOW(),
        decided_by_user_id = $3,
        updated_at = NOW()
    WHERE id = $1
  `,
    [input.requestId, input.adminRemarks?.trim() || null, input.adminUserId]
  );
}

export async function cancelDelegationRequestByRequester(input: {
  requestId: string;
  requesterUserId: string;
}) {
  if (!hasDatabaseUrl()) {
    const store = getMemoryStore();
    const row = store.find((item) => item.id === input.requestId && item.requesterUserId === input.requesterUserId);
    if (!row) throw new Error("Delegation request not found.");
    if (row.status !== "PENDING") throw new Error("Only pending requests can be cancelled.");

    row.status = "CANCELLED";
    row.updatedAt = new Date();
    return;
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) throw new Error("Database is not configured.");

  const updated = await pool.query(
    `
    UPDATE app_role_delegation_requests
    SET status = 'CANCELLED',
        updated_at = NOW()
    WHERE id = $1
      AND requester_user_id = $2
      AND status = 'PENDING'
    RETURNING id
  `,
    [input.requestId, input.requesterUserId]
  );

  if ((updated.rowCount ?? 0) === 0) {
    throw new Error("Only your pending requests can be cancelled.");
  }
}

export async function terminateDelegationRequestByAdmin(input: {
  requestId: string;
  adminUserId: string;
  adminRemarks?: string | null;
}) {
  if (!hasDatabaseUrl()) {
    const store = getMemoryStore();
    const row = store.find((item) => item.id === input.requestId);
    if (!row) throw new Error("Delegation request not found.");
    if (row.status !== "APPROVED") throw new Error("Only approved delegations can be terminated.");

    row.status = "TERMINATED";
    row.endsAt = new Date();
    row.adminRemarks = input.adminRemarks?.trim() || row.adminRemarks || null;
    row.decidedAt = new Date();
    row.decidedByUserId = input.adminUserId;
    row.updatedAt = new Date();
    return;
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) throw new Error("Database is not configured.");

  const existing = await pool.query(
    `SELECT status FROM app_role_delegation_requests WHERE id = $1 LIMIT 1`,
    [input.requestId]
  );

  if ((existing.rowCount ?? 0) === 0) {
    throw new Error("Delegation request not found.");
  }
  if (String(existing.rows[0].status) !== "APPROVED") {
    throw new Error("Only approved delegations can be terminated.");
  }

  await pool.query(
    `
    UPDATE app_role_delegation_requests
    SET status = 'TERMINATED',
        ends_at = NOW(),
        admin_remarks = COALESCE(NULLIF($2, ''), admin_remarks),
        decided_at = NOW(),
        decided_by_user_id = $3,
        updated_at = NOW()
    WHERE id = $1
  `,
    [input.requestId, input.adminRemarks?.trim() || null, input.adminUserId]
  );
}

export async function getActiveDelegatedRoleForUser(
  userId: string,
  allowedRoles?: AppRole[]
): Promise<AppRole | null> {
  const now = new Date();

  if (!hasDatabaseUrl()) {
    const row = getMemoryStore()
      .filter((item) => {
        if (item.status !== "APPROVED") return false;
        if (item.replacementUserId !== userId) return false;
        if (item.startsAt > now || item.endsAt < now) return false;
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(item.delegatedRole)) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

    return row?.delegatedRole ?? null;
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) return null;

  const hasAllowedRoles = Boolean(allowedRoles && allowedRoles.length > 0);
  const query = hasAllowedRoles
    ? `
      SELECT delegated_role
      FROM app_role_delegation_requests
      WHERE replacement_user_id = $1
        AND status = 'APPROVED'
        AND starts_at <= NOW()
        AND ends_at >= NOW()
        AND delegated_role = ANY($2::text[])
      ORDER BY updated_at DESC
      LIMIT 1
    `
    : `
      SELECT delegated_role
      FROM app_role_delegation_requests
      WHERE replacement_user_id = $1
        AND status = 'APPROVED'
        AND starts_at <= NOW()
        AND ends_at >= NOW()
      ORDER BY updated_at DESC
      LIMIT 1
    `;

  const params = hasAllowedRoles ? [userId, allowedRoles] : [userId];
  const result = await pool.query(query, params);

  if ((result.rowCount ?? 0) === 0) return null;
  return String(result.rows[0].delegated_role) as AppRole;
}

export async function getActiveDelegationForUser(
  userId: string,
  allowedRoles?: AppRole[]
): Promise<{
  delegatedRole: AppRole;
  requesterDepartment: string | null;
} | null> {
  const now = new Date();

  if (!hasDatabaseUrl()) {
    const row = getMemoryStore()
      .filter((item) => {
        if (item.status !== "APPROVED") return false;
        if (item.replacementUserId !== userId) return false;
        if (item.startsAt > now || item.endsAt < now) return false;
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(item.delegatedRole)) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

    if (!row) return null;
    return {
      delegatedRole: row.delegatedRole,
      requesterDepartment: null,
    };
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) return null;

  const hasAllowedRoles = Boolean(allowedRoles && allowedRoles.length > 0);
  const query = hasAllowedRoles
    ? `
      SELECT r.delegated_role, req.department AS requester_department
      FROM app_role_delegation_requests r
      LEFT JOIN app_users req ON req.id = r.requester_user_id
      WHERE r.replacement_user_id = $1
        AND r.status = 'APPROVED'
        AND r.starts_at <= NOW()
        AND r.ends_at >= NOW()
        AND r.delegated_role = ANY($2::text[])
      ORDER BY r.updated_at DESC
      LIMIT 1
    `
    : `
      SELECT r.delegated_role, req.department AS requester_department
      FROM app_role_delegation_requests r
      LEFT JOIN app_users req ON req.id = r.requester_user_id
      WHERE r.replacement_user_id = $1
        AND r.status = 'APPROVED'
        AND r.starts_at <= NOW()
        AND r.ends_at >= NOW()
      ORDER BY r.updated_at DESC
      LIMIT 1
    `;

  const params = hasAllowedRoles ? [userId, allowedRoles] : [userId];
  const result = await pool.query(query, params);

  if ((result.rowCount ?? 0) === 0) return null;

  return {
    delegatedRole: String(result.rows[0].delegated_role) as AppRole,
    requesterDepartment: result.rows[0].requester_department
      ? String(result.rows[0].requester_department)
      : null,
  };
}

export async function hasActiveOutgoingDelegationForRole(
  requesterUserId: string,
  delegatedRole: AppRole
): Promise<boolean> {
  const now = new Date();

  if (!hasDatabaseUrl()) {
    return getMemoryStore().some((item) => {
      if (item.requesterUserId !== requesterUserId) return false;
      if (item.delegatedRole !== delegatedRole) return false;
      if (item.status !== "APPROVED") return false;
      if (item.startsAt > now || item.endsAt < now) return false;
      return true;
    });
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) return false;

  const result = await pool.query(
    `
      SELECT 1
      FROM app_role_delegation_requests
      WHERE requester_user_id = $1
        AND delegated_role = $2
        AND status = 'APPROVED'
        AND starts_at <= NOW()
        AND ends_at >= NOW()
      LIMIT 1
    `,
    [requesterUserId, delegatedRole]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function listActiveDelegations(): Promise<ActiveDelegationRecord[]> {
  const now = new Date();

  if (!hasDatabaseUrl()) {
    return getMemoryStore()
      .filter((item) => {
        if (item.status !== "APPROVED") return false;
        if (!item.replacementUserId) return false;
        if (item.startsAt > now || item.endsAt < now) return false;
        return true;
      })
      .map((item) => ({
        id: item.id,
        delegatedRole: item.delegatedRole,
        requesterName: item.requesterName,
        requesterEmail: item.requesterEmail,
        replacementName: item.replacementName,
        replacementEmail: item.replacementEmail ?? "",
        startsAt: item.startsAt,
        endsAt: item.endsAt,
      }))
      .sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime());
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) return [];

  const result = await pool.query(
    `
      SELECT
        r.id,
        r.delegated_role,
        req.full_name AS requester_name,
        req.email AS requester_email,
        rep.full_name AS replacement_name,
        rep.email AS replacement_email,
        r.starts_at,
        r.ends_at
      FROM app_role_delegation_requests r
      LEFT JOIN app_users req ON req.id = r.requester_user_id
      LEFT JOIN app_users rep ON rep.id = r.replacement_user_id
      WHERE r.status = 'APPROVED'
        AND r.replacement_user_id IS NOT NULL
        AND r.starts_at <= NOW()
        AND r.ends_at >= NOW()
      ORDER BY r.ends_at ASC, r.updated_at DESC
    `
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    delegatedRole: String(row.delegated_role) as AppRole,
    requesterName: row.requester_name ? String(row.requester_name) : null,
    requesterEmail: row.requester_email ? String(row.requester_email) : "",
    replacementName: row.replacement_name ? String(row.replacement_name) : null,
    replacementEmail: row.replacement_email ? String(row.replacement_email) : "",
    startsAt: new Date(String(row.starts_at)),
    endsAt: new Date(String(row.ends_at)),
  }));
}
