import { randomUUID } from "node:crypto";
import { getPgPool } from "@/lib/db";
import type { AppRole } from "@/lib/mock-db";

export type DelegationQueueKey =
  | "email-id"
  | "vehicle-sticker"
  | "identity-card"
  | "guest-house"
  | "hostel-undertaking";

export type DelegationQueueMap = Partial<Record<DelegationQueueKey, string>>;

const delegationQueueKeys: DelegationQueueKey[] = [
  "email-id",
  "vehicle-sticker",
  "identity-card",
  "guest-house",
  "hostel-undertaking",
];

export type DelegationRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "TERMINATED";

export type DelegationRequestRecord = {
  id: string;
  requesterUserId: string;
  requesterEmail: string;
  requesterName: string | null;
  delegatedRole: AppRole;
  replacementUserId: string | null;
  queueDelegations: DelegationQueueMap;
  submittedQueueDelegations: DelegationQueueMap;
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

export type DelegationQueueOverrideRecord = {
  id: string;
  sourceRequestId: string;
  queueKey: DelegationQueueKey;
  overriddenFromUserId: string;
  overrideToUserId: string | null;
  triggerRequestStatus: DelegationRequestStatus;
  startsAt: Date;
  endsAt: Date;
  triggerRequestId: string;
  adminUserId: string;
  createdAt: Date;
};

export type ActiveDelegationRecord = {
  id: string;
  delegatedRole: AppRole;
  requesterName: string | null;
  requesterEmail: string;
  replacementName: string | null;
  replacementEmail: string;
  queueDelegations: DelegationQueueMap;
  queueDetails: Array<{
    queueKey: DelegationQueueKey;
    originalUserId: string;
    effectiveUserId: string | null;
    hasOverride: boolean;
    overrideFromUserId: string | null;
    overrideToUserId: string | null;
    overrideStartsAt: Date | null;
    overrideEndsAt: Date | null;
  }>;
  startsAt: Date;
  endsAt: Date;
};

type QueueOverrideRecord = {
  id: string;
  sourceRequestId: string;
  queueKey: DelegationQueueKey;
  overriddenFromUserId: string;
  overrideToUserId: string | null;
  startsAt: Date;
  endsAt: Date;
  triggerRequestId: string;
  adminUserId: string;
  createdAt: Date;
};

type InMemoryDelegationRow = {
  id: string;
  requesterUserId: string;
  requesterEmail: string;
  requesterName: string | null;
  delegatedRole: AppRole;
  replacementUserId: string | null;
  queueDelegations: DelegationQueueMap;
  submittedQueueDelegations?: DelegationQueueMap;
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
  __delegationOverrideStore?: QueueOverrideRecord[];
};

let schemaReady = false;

function normalizeMemoryRow(row: InMemoryDelegationRow): DelegationRequestRecord {
  return {
    id: row.id,
    requesterUserId: row.requesterUserId,
    requesterEmail: row.requesterEmail,
    requesterName: row.requesterName,
    delegatedRole: row.delegatedRole,
    replacementUserId: row.replacementUserId,
    queueDelegations: row.queueDelegations,
    submittedQueueDelegations: row.submittedQueueDelegations ?? row.queueDelegations,
    replacementEmail: row.replacementEmail,
    replacementName: row.replacementName,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    reason: row.reason,
    status: row.status,
    adminRemarks: row.adminRemarks,
    decidedAt: row.decidedAt,
    decidedByUserId: row.decidedByUserId,
    decidedByName: row.decidedByName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function getMemoryStore() {
  if (!mem.__delegationStore) {
    mem.__delegationStore = [];
  }
  return mem.__delegationStore;
}

function getMemoryOverrideStore() {
  if (!mem.__delegationOverrideStore) {
    mem.__delegationOverrideStore = [];
  }
  return mem.__delegationOverrideStore;
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
      queue_delegations JSONB NOT NULL DEFAULT '{}'::jsonb,
      submitted_queue_delegations JSONB NOT NULL DEFAULT '{}'::jsonb,
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

  await pool.query(`
    ALTER TABLE app_role_delegation_requests
    ADD COLUMN IF NOT EXISTS queue_delegations JSONB NOT NULL DEFAULT '{}'::jsonb
  `);

  await pool.query(`
    ALTER TABLE app_role_delegation_requests
    ADD COLUMN IF NOT EXISTS submitted_queue_delegations JSONB NOT NULL DEFAULT '{}'::jsonb
  `);

  await pool.query(`
    UPDATE app_role_delegation_requests
    SET submitted_queue_delegations = COALESCE(queue_delegations, '{}'::jsonb)
    WHERE COALESCE(submitted_queue_delegations, '{}'::jsonb) = '{}'::jsonb
      AND COALESCE(queue_delegations, '{}'::jsonb) <> '{}'::jsonb
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_role_delegation_queue_overrides (
      id TEXT PRIMARY KEY,
      source_request_id TEXT NOT NULL,
      queue_key TEXT NOT NULL,
      overridden_from_user_id TEXT NOT NULL,
      override_to_user_id TEXT,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      trigger_request_id TEXT NOT NULL,
      admin_user_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  schemaReady = true;
}

async function listActiveQueueOverrides(at: Date) {
  if (!hasDatabaseUrl()) {
    const requestById = new Map(getMemoryStore().map((row) => [row.id, row]));
    return getMemoryOverrideStore().filter((item) => {
      if (item.startsAt > at || item.endsAt < at) return false;
      const trigger = requestById.get(item.triggerRequestId);
      if (!trigger) return false;
      if (trigger.status !== "APPROVED") return false;
      if (trigger.startsAt > at || trigger.endsAt < at) return false;
      return true;
    });
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) return [] as QueueOverrideRecord[];

  const result = await pool.query(
    `
      SELECT
        o.id,
        o.source_request_id,
        o.queue_key,
        o.overridden_from_user_id,
        o.override_to_user_id,
        o.starts_at,
        o.ends_at,
        o.trigger_request_id,
        o.admin_user_id,
        o.created_at
      FROM app_role_delegation_queue_overrides o
      INNER JOIN app_role_delegation_requests trigger
        ON trigger.id = o.trigger_request_id
      WHERE o.starts_at <= $1
        AND o.ends_at >= $1
        AND trigger.status = 'APPROVED'
        AND trigger.starts_at <= $1
        AND trigger.ends_at >= $1
      ORDER BY created_at DESC
    `,
    [at.toISOString()]
  );

  return result.rows
    .map((row) => {
      const queueKey = parseDelegationQueueKey(String(row.queue_key));
      if (!queueKey) return null;
      return {
        id: String(row.id),
        sourceRequestId: String(row.source_request_id),
        queueKey,
        overriddenFromUserId: String(row.overridden_from_user_id),
        overrideToUserId: row.override_to_user_id ? String(row.override_to_user_id) : null,
        startsAt: new Date(String(row.starts_at)),
        endsAt: new Date(String(row.ends_at)),
        triggerRequestId: String(row.trigger_request_id),
        adminUserId: String(row.admin_user_id),
        createdAt: new Date(String(row.created_at)),
      };
    })
    .filter((item): item is QueueOverrideRecord => Boolean(item));
}

export async function listDelegationQueueOverridesForAdmin(): Promise<DelegationQueueOverrideRecord[]> {
  if (!hasDatabaseUrl()) {
    const requestById = new Map(getMemoryStore().map((row) => [row.id, row]));
    return [...getMemoryOverrideStore()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((item) => ({
        ...item,
        triggerRequestStatus: requestById.get(item.triggerRequestId)?.status ?? "TERMINATED",
      }));
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) return [];

  const result = await pool.query(
    `
      SELECT
        o.id,
        o.source_request_id,
        o.queue_key,
        o.overridden_from_user_id,
        o.override_to_user_id,
        o.starts_at,
        o.ends_at,
        o.trigger_request_id,
        o.admin_user_id,
        o.created_at,
        trigger.status AS trigger_request_status
      FROM app_role_delegation_queue_overrides o
      LEFT JOIN app_role_delegation_requests trigger
        ON trigger.id = o.trigger_request_id
      ORDER BY created_at DESC
    `
  );

  return result.rows
    .map((row) => {
      const queueKey = parseDelegationQueueKey(String(row.queue_key));
      if (!queueKey) return null;
      return {
        id: String(row.id),
        sourceRequestId: String(row.source_request_id),
        queueKey,
        overriddenFromUserId: String(row.overridden_from_user_id),
        overrideToUserId: row.override_to_user_id ? String(row.override_to_user_id) : null,
        triggerRequestStatus: row.trigger_request_status
          ? (String(row.trigger_request_status) as DelegationRequestStatus)
          : "TERMINATED",
        startsAt: new Date(String(row.starts_at)),
        endsAt: new Date(String(row.ends_at)),
        triggerRequestId: String(row.trigger_request_id),
        adminUserId: String(row.admin_user_id),
        createdAt: new Date(String(row.created_at)),
      };
    })
    .filter((row): row is DelegationQueueOverrideRecord => Boolean(row));
}

function resolveEffectiveQueueAssignee(input: {
  sourceRequestId: string;
  queueKey: DelegationQueueKey;
  originalAssigneeUserId: string;
  overrides: QueueOverrideRecord[];
}) {
  let currentAssignee: string | null = input.originalAssigneeUserId;
  let lastApplied: QueueOverrideRecord | null = null;
  const seen = new Set<string>();

  for (let depth = 0; depth < 5 && currentAssignee; depth += 1) {
    const next = input.overrides.find((override) => {
      if (seen.has(override.id)) return false;
      return (
        override.sourceRequestId === input.sourceRequestId &&
        override.queueKey === input.queueKey &&
        override.overriddenFromUserId === currentAssignee
      );
    });

    if (!next) {
      break;
    }

    seen.add(next.id);
    lastApplied = next;
    currentAssignee = next.overrideToUserId;
  }

  return {
    effectiveAssigneeUserId: currentAssignee,
    lastAppliedOverride: lastApplied,
  };
}

function buildEffectiveQueueAssignments(input: {
  sourceRequestId: string;
  queueDelegations: DelegationQueueMap;
  overrides: QueueOverrideRecord[];
}) {
  const effectiveQueueDelegations: DelegationQueueMap = {};
  const queueDetails: ActiveDelegationRecord["queueDetails"] = [];

  for (const [queueKey, originalUserId] of Object.entries(input.queueDelegations) as Array<[
    DelegationQueueKey,
    string,
  ]>) {
    const resolution = resolveEffectiveQueueAssignee({
      sourceRequestId: input.sourceRequestId,
      queueKey,
      originalAssigneeUserId: originalUserId,
      overrides: input.overrides,
    });

    if (resolution.effectiveAssigneeUserId) {
      effectiveQueueDelegations[queueKey] = resolution.effectiveAssigneeUserId;
    }

    queueDetails.push({
      queueKey,
      originalUserId,
      effectiveUserId: resolution.effectiveAssigneeUserId,
      hasOverride: Boolean(resolution.lastAppliedOverride),
      overrideFromUserId: resolution.lastAppliedOverride?.overriddenFromUserId ?? null,
      overrideToUserId: resolution.lastAppliedOverride?.overrideToUserId ?? null,
      overrideStartsAt: resolution.lastAppliedOverride?.startsAt ?? null,
      overrideEndsAt: resolution.lastAppliedOverride?.endsAt ?? null,
    });
  }

  return {
    effectiveQueueDelegations,
    queueDetails,
  };
}

function parseQueueDelegations(raw: unknown): DelegationQueueMap {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const allowedKeys = new Set<DelegationQueueKey>(delegationQueueKeys);

  const result: DelegationQueueMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowedKeys.has(key as DelegationQueueKey)) continue;
    const userId = String(value ?? "").trim();
    if (userId) {
      result[key as DelegationQueueKey] = userId;
    }
  }

  return result;
}

function parseDelegationQueueKey(value: string): DelegationQueueKey | null {
  return delegationQueueKeys.includes(value as DelegationQueueKey)
    ? (value as DelegationQueueKey)
    : null;
}

function mapDbRow(row: Record<string, unknown>): DelegationRequestRecord {
  return {
    id: String(row.id),
    requesterUserId: String(row.requester_user_id),
    requesterEmail: String(row.requester_email ?? ""),
    requesterName: row.requester_name ? String(row.requester_name) : null,
    delegatedRole: String(row.delegated_role) as AppRole,
    replacementUserId: row.replacement_user_id ? String(row.replacement_user_id) : null,
    queueDelegations: parseQueueDelegations(row.queue_delegations),
    submittedQueueDelegations: parseQueueDelegations(row.submitted_queue_delegations),
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
  queueDelegations?: DelegationQueueMap;
  startsAt: Date;
  endsAt: Date;
  reason: string;
}) {
  if (!hasDatabaseUrl()) {
    const store = getMemoryStore();
    const now = new Date();
    const sanitizedQueueDelegations = parseQueueDelegations(input.queueDelegations);
    const row: InMemoryDelegationRow = {
      id: randomUUID(),
      requesterUserId: input.requesterUserId,
      requesterEmail: "",
      requesterName: null,
      delegatedRole: input.requesterRole,
      replacementUserId: input.replacementUserId ?? null,
      queueDelegations: sanitizedQueueDelegations,
      submittedQueueDelegations: sanitizedQueueDelegations,
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

  const sanitizedQueueDelegations = parseQueueDelegations(input.queueDelegations);
  await pool.query(
    `
    INSERT INTO app_role_delegation_requests (
      id,
      requester_user_id,
      delegated_role,
      replacement_user_id,
      queue_delegations,
      submitted_queue_delegations,
      starts_at,
      ends_at,
      reason,
      status,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $5::jsonb, $6, $7, $8, 'PENDING', NOW(), NOW())
  `,
    [
      randomUUID(),
      input.requesterUserId,
      input.requesterRole,
      input.replacementUserId ?? null,
      JSON.stringify(sanitizedQueueDelegations),
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
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => normalizeMemoryRow(row));
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
      r.queue_delegations,
      r.submitted_queue_delegations,
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
    return getMemoryStore()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((row) => normalizeMemoryRow(row));
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
      r.queue_delegations,
      r.submitted_queue_delegations,
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
  replacementUserId?: string | null;
  adminUserId: string;
  adminRemarks?: string | null;
  incomingQueueReassignments?: Array<{
    sourceRequestId: string;
    queueKey: DelegationQueueKey;
    replacementUserId?: string | null;
  }>;
}) {
  if (!hasDatabaseUrl()) {
    const store = getMemoryStore();
    const row = store.find((item) => item.id === input.requestId);
    if (!row) throw new Error("Delegation request not found.");
    if (row.status !== "PENDING") throw new Error("Only pending requests can be approved.");

    row.status = "APPROVED";
    row.replacementUserId = input.replacementUserId?.trim() || null;
    row.adminRemarks = input.adminRemarks?.trim() || null;
    row.decidedAt = new Date();
    row.decidedByUserId = input.adminUserId;
    row.updatedAt = new Date();

    const requesterUserId = row.requesterUserId;
    const overrideStore = getMemoryOverrideStore();
    for (const reassignment of input.incomingQueueReassignments ?? []) {
      const source = store.find((item) => item.id === reassignment.sourceRequestId);
      if (!source) continue;
      if (source.status !== "APPROVED") continue;

      const originalAssignee = source.queueDelegations[reassignment.queueKey];
      if (!originalAssignee || originalAssignee !== requesterUserId) continue;

      overrideStore.push({
        id: randomUUID(),
        sourceRequestId: source.id,
        queueKey: reassignment.queueKey,
        overriddenFromUserId: requesterUserId,
        overrideToUserId: reassignment.replacementUserId?.trim() || null,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        triggerRequestId: row.id,
        adminUserId: input.adminUserId,
        createdAt: new Date(),
      });
    }
    return;
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) throw new Error("Database is not configured.");

  const existing = await pool.query(
    `SELECT status, requester_user_id, starts_at, ends_at FROM app_role_delegation_requests WHERE id = $1 LIMIT 1`,
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
    [input.requestId, input.replacementUserId?.trim() || null, input.adminRemarks?.trim() || null, input.adminUserId]
  );

  const requesterUserId = String(existing.rows[0].requester_user_id);
  const requestStartsAt = new Date(String(existing.rows[0].starts_at));
  const requestEndsAt = new Date(String(existing.rows[0].ends_at));
  for (const reassignment of input.incomingQueueReassignments ?? []) {
    await pool.query(
      `
      INSERT INTO app_role_delegation_queue_overrides (
        id,
        source_request_id,
        queue_key,
        overridden_from_user_id,
        override_to_user_id,
        starts_at,
        ends_at,
        trigger_request_id,
        admin_user_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `,
      [
        randomUUID(),
        reassignment.sourceRequestId,
        reassignment.queueKey,
        requesterUserId,
        reassignment.replacementUserId?.trim() || null,
        requestStartsAt.toISOString(),
        requestEndsAt.toISOString(),
        input.requestId,
        input.adminUserId,
      ]
    );
  }
}

export async function listIncomingActiveQueueDelegationsForUser(userId: string): Promise<Array<{
  sourceRequestId: string;
  sourceRequesterName: string | null;
  sourceRequesterEmail: string;
  queueKey: DelegationQueueKey;
}>> {
  const now = new Date();
  const activeOverrides = await listActiveQueueOverrides(now);

  if (!hasDatabaseUrl()) {
    const rows: Array<{
      sourceRequestId: string;
      sourceRequesterName: string | null;
      sourceRequesterEmail: string;
      queueKey: DelegationQueueKey;
    }> = [];

    for (const item of getMemoryStore()) {
      if (item.status !== "APPROVED") continue;
      if (item.startsAt > now || item.endsAt < now) continue;

      const resolved = buildEffectiveQueueAssignments({
        sourceRequestId: item.id,
        queueDelegations: item.queueDelegations,
        overrides: activeOverrides,
      });

      for (const [queueKeyRaw, targetUserId] of Object.entries(resolved.effectiveQueueDelegations)) {
        const queueKey = parseDelegationQueueKey(queueKeyRaw);
        if (!queueKey) continue;
        if (targetUserId !== userId) continue;
        rows.push({
          sourceRequestId: item.id,
          sourceRequesterName: item.requesterName,
          sourceRequesterEmail: item.requesterEmail,
          queueKey,
        });
      }
    }

    return rows;
  }

  await ensureDelegationSchema();
  const pool = getPgPool();
  if (!pool) return [];

  const result = await pool.query(
    `
      SELECT
        r.id AS source_request_id,
        req.full_name AS source_requester_name,
        req.email AS source_requester_email,
        r.queue_delegations,
        r.updated_at
      FROM app_role_delegation_requests r
      LEFT JOIN app_users req ON req.id = r.requester_user_id
      WHERE r.status = 'APPROVED'
        AND r.starts_at <= NOW()
        AND r.ends_at >= NOW()
      ORDER BY r.updated_at DESC
    `
  );

  const rows: Array<{
    sourceRequestId: string;
    sourceRequesterName: string | null;
    sourceRequesterEmail: string;
    queueKey: DelegationQueueKey;
  }> = [];

  for (const row of result.rows) {
    const sourceRequestId = String(row.source_request_id);
    const resolved = buildEffectiveQueueAssignments({
      sourceRequestId,
      queueDelegations: parseQueueDelegations(row.queue_delegations),
      overrides: activeOverrides,
    });

    for (const [queueKeyRaw, targetUserId] of Object.entries(resolved.effectiveQueueDelegations)) {
      const queueKey = parseDelegationQueueKey(queueKeyRaw);
      if (!queueKey) continue;
      if (targetUserId !== userId) continue;

      rows.push({
        sourceRequestId,
        sourceRequesterName: row.source_requester_name ? String(row.source_requester_name) : null,
        sourceRequesterEmail: row.source_requester_email ? String(row.source_requester_email) : "",
        queueKey,
      });
    }
  }

  return rows;
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
    const overrideStore = getMemoryOverrideStore();
    const row = store.find((item) => item.id === input.requestId);
    if (!row) throw new Error("Delegation request not found.");
    if (row.status !== "APPROVED") throw new Error("Only approved delegations can be terminated.");

    const terminationAt = new Date();
    row.status = "TERMINATED";
    row.endsAt = terminationAt;
    row.adminRemarks = input.adminRemarks?.trim() || row.adminRemarks || null;
    row.decidedAt = terminationAt;
    row.decidedByUserId = input.adminUserId;

    const overrideEndsAt = new Date(terminationAt.getTime() - 1);
    for (const override of overrideStore) {
      if (override.triggerRequestId !== input.requestId) continue;
      if (override.endsAt > overrideEndsAt) {
        override.endsAt = overrideEndsAt;
      }
    }

    row.updatedAt = terminationAt;
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

  await pool.query(
    `
      UPDATE app_role_delegation_queue_overrides
      SET ends_at = LEAST(ends_at, NOW() - INTERVAL '1 millisecond')
      WHERE trigger_request_id = $1
        AND ends_at >= NOW()
    `,
    [input.requestId]
  );
}

export async function getActiveDelegatedRoleForUser(
  userId: string,
  allowedRoles?: AppRole[]
): Promise<AppRole | null> {
  const now = new Date();
  const activeOverrides = await listActiveQueueOverrides(now);

  if (!hasDatabaseUrl()) {
    const row = getMemoryStore()
      .filter((item) => {
        if (item.status !== "APPROVED") return false;
        const resolved = buildEffectiveQueueAssignments({
          sourceRequestId: item.id,
          queueDelegations: item.queueDelegations,
          overrides: activeOverrides,
        });
        const isQueueReplacement = Object.values(resolved.effectiveQueueDelegations).includes(userId);
        if (item.replacementUserId !== userId && !isQueueReplacement) return false;
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

  const result = await pool.query(
    `
      SELECT id, delegated_role, replacement_user_id, queue_delegations
      FROM app_role_delegation_requests
      WHERE status = 'APPROVED'
        AND starts_at <= NOW()
        AND ends_at >= NOW()
      ORDER BY updated_at DESC
    `
  );

  for (const row of result.rows) {
    const delegatedRole = String(row.delegated_role) as AppRole;
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(delegatedRole)) continue;

    const queueDelegations = parseQueueDelegations(row.queue_delegations);
    const resolved = buildEffectiveQueueAssignments({
      sourceRequestId: String(row.id),
      queueDelegations,
      overrides: activeOverrides,
    });

    const isQueueReplacement = Object.values(resolved.effectiveQueueDelegations).includes(userId);
    const isFallbackReplacement =
      Object.keys(queueDelegations).length === 0 &&
      row.replacement_user_id &&
      String(row.replacement_user_id) === userId;

    if (isQueueReplacement || isFallbackReplacement) {
      return delegatedRole;
    }
  }

  return null;
}

export async function getActiveDelegationForUser(
  userId: string,
  allowedRoles?: AppRole[]
): Promise<{
  delegatedRole: AppRole;
  requesterDepartment: string | null;
} | null> {
  const now = new Date();
  const activeOverrides = await listActiveQueueOverrides(now);

  if (!hasDatabaseUrl()) {
    const row = getMemoryStore()
      .filter((item) => {
        if (item.status !== "APPROVED") return false;
        const resolved = buildEffectiveQueueAssignments({
          sourceRequestId: item.id,
          queueDelegations: item.queueDelegations,
          overrides: activeOverrides,
        });
        const isQueueReplacement = Object.values(resolved.effectiveQueueDelegations).includes(userId);
        if (item.replacementUserId !== userId && !isQueueReplacement) return false;
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

  const result = await pool.query(
    `
      SELECT
        r.id,
        r.delegated_role,
        r.replacement_user_id,
        r.queue_delegations,
        req.department AS requester_department
      FROM app_role_delegation_requests r
      LEFT JOIN app_users req ON req.id = r.requester_user_id
      WHERE r.status = 'APPROVED'
        AND r.starts_at <= NOW()
        AND r.ends_at >= NOW()
      ORDER BY r.updated_at DESC
    `
  );

  for (const row of result.rows) {
    const delegatedRole = String(row.delegated_role) as AppRole;
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(delegatedRole)) continue;

    const queueDelegations = parseQueueDelegations(row.queue_delegations);
    const resolved = buildEffectiveQueueAssignments({
      sourceRequestId: String(row.id),
      queueDelegations,
      overrides: activeOverrides,
    });

    const isQueueReplacement = Object.values(resolved.effectiveQueueDelegations).includes(userId);
    const isFallbackReplacement =
      Object.keys(queueDelegations).length === 0 &&
      row.replacement_user_id &&
      String(row.replacement_user_id) === userId;

    if (isQueueReplacement || isFallbackReplacement) {
      return {
        delegatedRole,
        requesterDepartment: row.requester_department ? String(row.requester_department) : null,
      };
    }
  }

  return null;
}

export async function getActiveQueueDelegationForUser(
  userId: string,
  queueKey: DelegationQueueKey,
  allowedRoles?: AppRole[]
): Promise<{
  delegatedRole: AppRole;
  requesterDepartment: string | null;
} | null> {
  const now = new Date();
  const activeOverrides = await listActiveQueueOverrides(now);

  if (!hasDatabaseUrl()) {
    const row = getMemoryStore()
      .filter((item) => {
        if (item.status !== "APPROVED") return false;
        if (item.startsAt > now || item.endsAt < now) return false;
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(item.delegatedRole)) return false;

        const resolved = buildEffectiveQueueAssignments({
          sourceRequestId: item.id,
          queueDelegations: item.queueDelegations,
          overrides: activeOverrides,
        });
        const queueReplacement = resolved.effectiveQueueDelegations[queueKey];
        if (queueReplacement) {
          return queueReplacement === userId;
        }

        return item.replacementUserId === userId;
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

  const result = await pool.query(
    `
      SELECT
        r.id,
        r.delegated_role,
        r.replacement_user_id,
        r.queue_delegations,
        req.department AS requester_department,
        r.updated_at
      FROM app_role_delegation_requests r
      LEFT JOIN app_users req ON req.id = r.requester_user_id
      WHERE r.status = 'APPROVED'
        AND r.starts_at <= NOW()
        AND r.ends_at >= NOW()
      ORDER BY r.updated_at DESC
    `
  );

  for (const row of result.rows) {
    const delegatedRole = String(row.delegated_role) as AppRole;
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(delegatedRole)) {
      continue;
    }

    const sourceRequestId = String(row.id);
    const queueDelegations = parseQueueDelegations(row.queue_delegations);
    const resolved = buildEffectiveQueueAssignments({
      sourceRequestId,
      queueDelegations,
      overrides: activeOverrides,
    });

    const effectiveQueueAssignee = resolved.effectiveQueueDelegations[queueKey];
    if (effectiveQueueAssignee === userId) {
      return {
        delegatedRole,
        requesterDepartment: row.requester_department ? String(row.requester_department) : null,
      };
    }

    if (
      Object.keys(queueDelegations).length === 0 &&
      row.replacement_user_id &&
      String(row.replacement_user_id) === userId
    ) {
      return {
        delegatedRole,
        requesterDepartment: row.requester_department ? String(row.requester_department) : null,
      };
    }
  }

  return null;
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
  const activeOverrides = await listActiveQueueOverrides(now);

  if (!hasDatabaseUrl()) {
    return getMemoryStore()
      .filter((item) => {
        if (item.status !== "APPROVED") return false;
        const resolved = buildEffectiveQueueAssignments({
          sourceRequestId: item.id,
          queueDelegations: item.queueDelegations,
          overrides: activeOverrides,
        });
        const hasFallbackReplacement = Boolean(item.replacementUserId);
        const hasQueueReplacements = Object.keys(resolved.effectiveQueueDelegations).length > 0;
        if (!hasFallbackReplacement && !hasQueueReplacements) return false;
        if (item.startsAt > now || item.endsAt < now) return false;
        return true;
      })
      .map((item) => {
        const resolved = buildEffectiveQueueAssignments({
          sourceRequestId: item.id,
          queueDelegations: item.queueDelegations,
          overrides: activeOverrides,
        });
        return {
          id: item.id,
          delegatedRole: item.delegatedRole,
          requesterName: item.requesterName,
          requesterEmail: item.requesterEmail,
          replacementName: item.replacementName,
          replacementEmail:
            item.replacementEmail ??
            (Object.keys(resolved.effectiveQueueDelegations).length > 0 ? "Queue-wise assignees" : ""),
          queueDelegations: resolved.effectiveQueueDelegations,
          queueDetails: resolved.queueDetails,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
        };
      })
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
        r.queue_delegations,
        r.replacement_user_id,
        r.starts_at,
        r.ends_at
      FROM app_role_delegation_requests r
      LEFT JOIN app_users req ON req.id = r.requester_user_id
      LEFT JOIN app_users rep ON rep.id = r.replacement_user_id
      WHERE r.status = 'APPROVED'
        AND (
          r.replacement_user_id IS NOT NULL
          OR COALESCE(r.queue_delegations, '{}'::jsonb) <> '{}'::jsonb
        )
        AND r.starts_at <= NOW()
        AND r.ends_at >= NOW()
      ORDER BY r.ends_at ASC, r.updated_at DESC
    `
  );

  return result.rows
    .map((row) => {
      const sourceRequestId = String(row.id);
      const queueDelegations = parseQueueDelegations(row.queue_delegations);
      const resolved = buildEffectiveQueueAssignments({
        sourceRequestId,
        queueDelegations,
        overrides: activeOverrides,
      });

      return {
        id: sourceRequestId,
        delegatedRole: String(row.delegated_role) as AppRole,
        requesterName: row.requester_name ? String(row.requester_name) : null,
        requesterEmail: row.requester_email ? String(row.requester_email) : "",
        replacementName: row.replacement_name ? String(row.replacement_name) : null,
        replacementEmail: row.replacement_email
          ? String(row.replacement_email)
          : "Queue-wise assignees",
        queueDelegations: resolved.effectiveQueueDelegations,
        queueDetails: resolved.queueDetails,
        replacementUserId: row.replacement_user_id ? String(row.replacement_user_id) : null,
        startsAt: new Date(String(row.starts_at)),
        endsAt: new Date(String(row.ends_at)),
      };
    })
    .filter((item) => {
      const hasQueue = Object.keys(item.queueDelegations).length > 0;
      const hasFallback = Boolean(item.replacementUserId);
      return hasQueue || hasFallback;
    })
    .map((item) => {
      const resultItem = { ...item };
      delete (resultItem as { replacementUserId?: string | null }).replacementUserId;
      return resultItem;
    });
}
