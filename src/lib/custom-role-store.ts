import { randomUUID } from "node:crypto";
import { getPgPool } from "@/lib/db";

export type CustomRoleRecord = {
  id: string;
  roleCode: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
};

type InMemoryCustomRoleStore = {
  roles: CustomRoleRecord[];
};

const customRoleStore = globalThis as unknown as {
  __iitrprCustomRoles?: InMemoryCustomRoleStore;
};

let schemaReady = false;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function getInMemoryStore() {
  if (!customRoleStore.__iitrprCustomRoles) {
    customRoleStore.__iitrprCustomRoles = {
      roles: [],
    };
  }
  return customRoleStore.__iitrprCustomRoles;
}

function normalizeRoleCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function mapRow(row: {
  id: string;
  role_code: string;
  display_name: string;
  created_at: Date;
  updated_at: Date;
}): CustomRoleRecord {
  return {
    id: row.id,
    roleCode: row.role_code,
    displayName: row.display_name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  const pool = getPgPool();
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_custom_roles (
      id TEXT PRIMARY KEY,
      role_code TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  schemaReady = true;
}

export function normalizeAssignableRoleCode(roleCode: string) {
  return normalizeRoleCode(roleCode);
}

export async function listCustomRoles() {
  if (!hasDatabaseUrl()) {
    const store = getInMemoryStore();
    return [...store.roles].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    const store = getInMemoryStore();
    return [...store.roles].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  const result = await pool.query(
    `
    SELECT id, role_code, display_name, created_at, updated_at
    FROM app_custom_roles
    ORDER BY display_name ASC
  `
  );

  return result.rows.map((row) =>
    mapRow(
      row as {
        id: string;
        role_code: string;
        display_name: string;
        created_at: Date;
        updated_at: Date;
      }
    )
  );
}

export async function createCustomRole(input: {
  roleCode: string;
  displayName: string;
}) {
  const roleCode = normalizeRoleCode(input.roleCode);
  const displayName = normalizeDisplayName(input.displayName);

  if (!roleCode) {
    throw new Error("Role code is required.");
  }
  if (!displayName) {
    throw new Error("Role display name is required.");
  }

  if (!hasDatabaseUrl()) {
    const store = getInMemoryStore();
    const exists = store.roles.some((role) => role.roleCode === roleCode);
    if (exists) {
      throw new Error("A role with this code already exists.");
    }

    const now = new Date();
    const created: CustomRoleRecord = {
      id: randomUUID(),
      roleCode,
      displayName,
      createdAt: now,
      updatedAt: now,
    };
    store.roles.push(created);
    return created;
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database connection is not ready.");
  }

  const inserted = await pool.query(
    `
    INSERT INTO app_custom_roles (id, role_code, display_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (role_code) DO NOTHING
    RETURNING id, role_code, display_name, created_at, updated_at
  `,
    [randomUUID(), roleCode, displayName]
  );

  if ((inserted.rowCount ?? 0) === 0) {
    throw new Error("A role with this code already exists.");
  }

  return mapRow(
    inserted.rows[0] as {
      id: string;
      role_code: string;
      display_name: string;
      created_at: Date;
      updated_at: Date;
    }
  );
}
