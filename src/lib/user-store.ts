import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { AppRole, AuthMode, UserRecord } from "@/lib/mock-db";
import { getPgPool } from "@/lib/db";
import {
  authenticateUser as authenticateUserInMemory,
  findUserByEmail as findUserByEmailInMemory,
  listUsers as listUsersInMemory,
  updateUserPassword as updateUserPasswordInMemory,
  updateUserRole as updateUserRoleInMemory,
  deleteUser as deleteUserInMemory,
} from "@/lib/mock-db";

export type PersistedUser = {
  id: string;
  email: string;
  fullName: string | null;
  department: string | null;
  role: AppRole | null;
  createdAt: Date;
  updatedAt: Date;
};

const STUDENT_ROLE_REQUEST_TAG = "__ROLE_REQUEST_STUDENT__";

let schemaReady = false;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeLegacyRole(role: string | null): AppRole | null {
  if (!role) return null;

  if (role === "FORWARDING_AUTHORITY_ESTABLISHMENT") {
    return "ESTABLISHMENT";
  }
  if (role === "REGISTRAR_DEAN_FAA") {
    return "REGISTRAR";
  }

  return role as AppRole;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hashHex] = storedHash.split(":");
  if (!salt || !hashHex) return false;

  const incoming = scryptSync(password, salt, 64);
  const stored = Buffer.from(hashHex, "hex");
  if (incoming.length !== stored.length) return false;

  return timingSafeEqual(incoming, stored);
}

async function ensureSchemaAndSeed() {
  if (schemaReady) return;

  const pool = getPgPool();
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      department TEXT,
      role TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Add the department column if it does not already exist
  await pool.query(`
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS department TEXT;
  `);

  // Normalize legacy dean account emails to the new canonical dean mailbox.
  await pool.query(
    `
    UPDATE app_users
    SET email = 'dean@iitrpr.ac.in',
        updated_at = NOW()
    WHERE email = 'dean.faa@iitrpr.ac.in'
  `
  );

  // Remove deprecated combined registrar/dean account if it exists.
  await pool.query(
    `
    DELETE FROM app_users
    WHERE email = 'registrar.dean@iitrpr.ac.in'
  `
  );

  // Normalize forwarding authority aliases to canonical mailbox names.
  await pool.query(
    `
    UPDATE app_users
    SET email = 'academics@iitrpr.ac.in',
        updated_at = NOW()
    WHERE email = 'forwarding.academics@iitrpr.ac.in'
      AND NOT EXISTS (
        SELECT 1 FROM app_users existing WHERE existing.email = 'academics@iitrpr.ac.in'
      )
  `
  );
  await pool.query(
    `
    DELETE FROM app_users
    WHERE email = 'forwarding.academics@iitrpr.ac.in'
  `
  );

  await pool.query(
    `
    UPDATE app_users
    SET email = 'rnd@iitrpr.ac.in',
        updated_at = NOW()
    WHERE email = 'forwarding.rnd@iitrpr.ac.in'
      AND NOT EXISTS (
        SELECT 1 FROM app_users existing WHERE existing.email = 'rnd@iitrpr.ac.in'
      )
  `
  );
  await pool.query(
    `
    DELETE FROM app_users
    WHERE email = 'forwarding.rnd@iitrpr.ac.in'
  `
  );

  // Remove deprecated forwarding establishment alias if present.
  await pool.query(
    `
    DELETE FROM app_users
    WHERE email = 'forwarding.establishment@iitrpr.ac.in'
  `
  );

  // Remove deprecated guest house approving authority account.
  await pool.query(
    `
    DELETE FROM app_users
    WHERE email = 'approving.authority@iitrpr.ac.in'
  `
  );

  // Normalize canonical stakeholder display names.
  await pool.query(
    `
    UPDATE app_users
    SET full_name = CASE
      WHEN email = 'dean@iitrpr.ac.in' THEN 'Dean'
      WHEN email = 'academics@iitrpr.ac.in' THEN 'Academics'
      WHEN email = 'rnd@iitrpr.ac.in' THEN 'R&D'
      ELSE full_name
    END,
    updated_at = NOW()
    WHERE email IN ('dean@iitrpr.ac.in', 'academics@iitrpr.ac.in', 'rnd@iitrpr.ac.in')
  `
  );

  const seedAccounts: Array<{
    email: string;
    fullName: string;
    role: AppRole;
    password: string;
    department?: string;
  }> = [
    {
      email: "admin@iitrpr.ac.in",
      fullName: "System Admin",
      role: "SYSTEM_ADMIN",
      password: "123456",
    },
    {
      email: "academics@iitrpr.ac.in",
      fullName: "Academics",
      role: "FORWARDING_AUTHORITY_ACADEMICS",
      password: "123456",
    },
    {
      email: "establishment@iitrpr.ac.in",
      fullName: "Establishment",
      role: "ESTABLISHMENT",
      password: "123456",
    },
    {
      email: "rnd@iitrpr.ac.in",
      fullName: "R&D",
      role: "FORWARDING_AUTHORITY_R_AND_D",
      password: "123456",
    },
    {
      email: "it.admin@iitrpr.ac.in",
      fullName: "IT Admin",
      role: "IT_ADMIN",
      password: "123456",
    },
    {
      email: "hostel.warden@iitrpr.ac.in",
      fullName: "Hostel Warden",
      role: "HOSTEL_WARDEN",
      password: "123456",
    },
    {
      email: "supervisor@iitrpr.ac.in",
      fullName: "Supervisor",
      role: "SUPERVISOR",
      password: "123456",
    },
    {
      email: "section.head@iitrpr.ac.in",
      fullName: "Section Head",
      role: "SECTION_HEAD",
      password: "123456",
      department: "CSE",
    },
    {
      email: "section.head.ee@iitrpr.ac.in",
      fullName: "Section Head (EE)",
      role: "SECTION_HEAD",
      password: "123456",
      department: "EE",
    },
    {
      email: "hod@iitrpr.ac.in",
      fullName: "Head of Department",
      role: "HOD",
      password: "123456",
      department: "CSE",
    },
    {
      email: "hod.ee@iitrpr.ac.in",
      fullName: "Head of Department (EE)",
      role: "HOD",
      password: "123456",
      department: "EE",
    },
    {
      email: "registrar@iitrpr.ac.in",
      fullName: "Registrar",
      role: "REGISTRAR",
      password: "123456",
    },
    {
      email: "dean@iitrpr.ac.in",
      fullName: "Dean",
      role: "DEAN_FAA",
      password: "123456",
    },
    {
      email: "director@iitrpr.ac.in",
      fullName: "Director",
      role: "DIRECTOR",
      password: "123456",
    },
    {
      email: "deputy.dean@iitrpr.ac.in",
      fullName: "Deputy Dean",
      role: "DEPUTY_DEAN",
      password: "123456",
    },
    {
      email: "student.affairs@iitrpr.ac.in",
      fullName: "Student Affairs",
      role: "STUDENT_AFFAIRS_HOSTEL_MGMT",
      password: "123456",
    },
    {
      email: "security.office@iitrpr.ac.in",
      fullName: "Security Office",
      role: "SECURITY_OFFICE",
      password: "123456",
    },
    {
      email: "guesthouse.incharge@iitrpr.ac.in",
      fullName: "Guest House In-charge",
      role: "GUEST_HOUSE_INCHARGE",
      password: "123456",
    },
    {
      email: "guesthouse.chairman@iitrpr.ac.in",
      fullName: "Chairman GH Committee",
      role: "GUEST_HOUSE_COMMITTEE_CHAIR",
      password: "123456",
    },
  ];

  for (const account of seedAccounts) {
    await pool.query(
      `
      INSERT INTO app_users (id, email, password_hash, full_name, department, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET department = EXCLUDED.department
    `,
      [
        randomUUID(),
        normalizeEmail(account.email),
        hashPassword(account.password),
        account.fullName,
        account.department ?? null,
        account.role,
      ]
    );
  }

  // Create dynamic workflows table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      stages JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const coreWorkflows = [
    {
      id: "email-id",
      name: "Email ID Request",
      description: "Standard flow for institutional email creation.",
      stages: JSON.stringify([
        { stage: 1, role: "FORWARDING_AUTHORITY_ACADEMICS,FORWARDING_AUTHORITY_R_AND_D,ESTABLISHMENT" },
        { stage: 2, role: "IT_ADMIN" }
      ]),
    },
    {
      id: "identity-card",
      name: "Identity Card",
      description: "Multi-level verification for issuing physical ID cards.",
      stages: JSON.stringify([
        { stage: 1, role: "HOD,SECTION_HEAD" },
        { stage: 2, role: "ESTABLISHMENT" },
        { stage: 3, role: "REGISTRAR,DEAN_FAA" }
      ]),
    },
    {
      id: "vehicle-sticker",
      name: "Vehicle Sticker",
      description: "Campus vehicle access authorization.",
      stages: JSON.stringify([
        { stage: 1, role: "SUPERVISOR,HOD" },
        { stage: 2, role: "SECURITY_OFFICE" }
      ]),
    },
    {
      id: "guest-house",
      name: "Guest House Booking",
      description: "Three-stage approval for guest limits and capacity.",
      stages: JSON.stringify([
        { stage: 1, role: "DEAN_FAA,DEPUTY_DEAN,HOD,STUDENT_AFFAIRS_HOSTEL_MGMT,DIRECTOR" },
        { stage: 2, role: "GUEST_HOUSE_INCHARGE" },
        { stage: 3, role: "GUEST_HOUSE_COMMITTEE_CHAIR" }
      ]),
    },
    {
      id: "hostel-undertaking",
      name: "Hostel Undertaking",
      description: "Single-step warden acknowledgment.",
      stages: JSON.stringify([
        { stage: 1, role: "HOSTEL_WARDEN" }
      ]),
    }
  ];

  for (const wf of coreWorkflows) {
    await pool.query(
      `
      INSERT INTO app_workflows (id, name, description, stages)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
      `,
      [wf.id, wf.name, wf.description, wf.stages]
    );
  }

  schemaReady = true;
}

function mapRow(row: {
  id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  role: string | null;
  created_at: Date;
  updated_at: Date;
}): PersistedUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    department: row.department,
    role: normalizeLegacyRole(row.role),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapRecord(record: UserRecord): PersistedUser {
  return {
    id: record.id,
    email: record.email,
    fullName: record.fullName ?? null,
    department: record.department ?? null,
    role: record.role,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function findUserByEmail(email: string) {
  if (!hasDatabaseUrl()) {
    return findUserByEmailInMemory(email);
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) {
    return findUserByEmailInMemory(email);
  }

  const result = await pool.query(
    `
    SELECT id, email, full_name, department, role, created_at, updated_at
    FROM app_users
    WHERE email = $1
    LIMIT 1
  `,
    [normalizeEmail(email)]
  );

  if (result.rowCount === 0) return null;
  return mapRow(result.rows[0]);
}

export async function authenticateUser(input: {
  mode: AuthMode;
  email: string;
  password: string;
  fullName?: string | null;
  forceSystemAdmin?: boolean;
}) {
  if (!hasDatabaseUrl()) {
    return authenticateUserInMemory(input);
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) {
    return authenticateUserInMemory(input);
  }
  const normalizedEmail = normalizeEmail(input.email);

  const existing = await pool.query(
    `
    SELECT id, email, password_hash, full_name, department, role, created_at, updated_at
    FROM app_users
    WHERE email = $1
    LIMIT 1
  `,
    [normalizedEmail]
  );

  if (input.mode === "login") {
    if (!existing.rowCount || !existing.rows[0]) {
      if (normalizedEmail.endsWith("@iitrpr.ac.in")) {
        // Auto sign-up the user on first login with their internal email
        input.mode = "signup";
      } else {
        throw new Error("Account not found. Please sign up first.");
      }
    } else {
      const row = existing.rows[0] as {
        id: string;
        email: string;
        password_hash: string;
        full_name: string | null;
        department: string | null;
        role: AppRole | null;
        created_at: Date;
        updated_at: Date;
      };

      if (!verifyPassword(input.password, row.password_hash)) {
        throw new Error("Invalid password.");
      }

      const nextFullName = input.fullName?.trim() || row.full_name;
      const nextRole = input.forceSystemAdmin ? "SYSTEM_ADMIN" : row.role;

      const updated = await pool.query(
        `
        UPDATE app_users
        SET full_name = $2,
            role = $3,
            updated_at = NOW()
        WHERE email = $1
        RETURNING id, email, full_name, department, role, created_at, updated_at
      `,
        [normalizedEmail, nextFullName, nextRole]
      );

      return { user: mapRow(updated.rows[0]), isNew: false };
    }
  }



  if (existing.rowCount && existing.rows[0]) {
    throw new Error("Account already exists. Please log in.");
  }

  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const defaultRole: AppRole | null = input.forceSystemAdmin ? "SYSTEM_ADMIN" : null;

  const inserted = await pool.query(
    `
    INSERT INTO app_users (id, email, password_hash, full_name, department, role)
    VALUES ($1, $2, $3, $4, NULL, $5)
    RETURNING id, email, full_name, department, role, created_at, updated_at
  `,
    [
      randomUUID(),
      normalizedEmail,
      hashPassword(input.password),
      input.fullName?.trim() || null,
      defaultRole,
    ]
  );

  return { user: mapRow(inserted.rows[0]), isNew: true };
}

export async function updateUserPassword(email: string, newPassword: string) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  if (!hasDatabaseUrl()) {
    return updateUserPasswordInMemory(email, newPassword);
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) {
    return updateUserPasswordInMemory(email, newPassword);
  }

  const normalizedEmail = normalizeEmail(email);
  const result = await pool.query(
    `
    UPDATE app_users
    SET password_hash = $2,
        updated_at = NOW()
    WHERE email = $1
    RETURNING id
  `,
    [normalizedEmail, hashPassword(newPassword)]
  );

  if (result.rowCount === 0) {
    throw new Error("Account not found.");
  }
}

export async function listUsers() {
  if (!hasDatabaseUrl()) {
    return listUsersInMemory().map(mapRecord);
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) {
    return listUsersInMemory().map(mapRecord);
  }

  const result = await pool.query(
    `
    SELECT id, email, full_name, department, role, created_at, updated_at
    FROM app_users
    ORDER BY role ASC NULLS FIRST, created_at DESC
  `
  );

  return result.rows.map((row) =>
    mapRow(
      row as {
        id: string;
        email: string;
        full_name: string | null;
        department: string | null;
        role: AppRole | null;
        created_at: Date;
        updated_at: Date;
      }
    )
  );
}

export async function updateUserRole(userId: string, role: AppRole) {
  if (!hasDatabaseUrl()) {
    return updateUserRoleInMemory(userId, role);
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) {
    return updateUserRoleInMemory(userId, role);
  }

  const updated = await pool.query(
    `
    UPDATE app_users
    SET role = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, full_name, department, role, created_at, updated_at
  `,
    [userId, role]
  );

  if (updated.rowCount === 0) {
    throw new Error("User not found.");
  }

  return mapRow(updated.rows[0]);
}

export function isStudentRoleRequestTagged(user: Pick<PersistedUser, "department" | "role">) {
  return user.role === null && user.department === STUDENT_ROLE_REQUEST_TAG;
}

export async function setStudentRoleRequestTag(userId: string, isStudentRequest: boolean) {
  if (!hasDatabaseUrl()) {
    const users = listUsersInMemory();
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error("User not found.");
    }

    if (isStudentRequest) {
      user.department = STUDENT_ROLE_REQUEST_TAG;
    } else if (user.department === STUDENT_ROLE_REQUEST_TAG) {
      user.department = null;
    }
    user.updatedAt = new Date();
    return user;
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) {
    const users = listUsersInMemory();
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error("User not found.");
    }

    if (isStudentRequest) {
      user.department = STUDENT_ROLE_REQUEST_TAG;
    } else if (user.department === STUDENT_ROLE_REQUEST_TAG) {
      user.department = null;
    }
    user.updatedAt = new Date();
    return user;
  }

  const updated = await pool.query(
    `
    UPDATE app_users
    SET department = CASE 
                       WHEN $2::boolean THEN $3
                       WHEN department = $3 THEN NULL
                       ELSE department
                     END,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, full_name, department, role, created_at, updated_at
  `,
    [userId, isStudentRequest, STUDENT_ROLE_REQUEST_TAG]
  );

  if (updated.rowCount === 0) {
    throw new Error("User not found.");
  }

  return mapRow(updated.rows[0]);
}

export async function setPreferredRoleForUser(userId: string, roleCode: string) {
  if (!roleCode) return;

  if (!hasDatabaseUrl()) {
    const users = listUsersInMemory();
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error("User not found.");
    }

    user.department = `PREFERRED_ROLE:${roleCode}`;
    user.updatedAt = new Date();
    return user;
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) {
    const users = listUsersInMemory();
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error("User not found.");
    }

    user.department = `PREFERRED_ROLE:${roleCode}`;
    user.updatedAt = new Date();
    return user;
  }

  const updated = await pool.query(
    `
    UPDATE app_users
    SET department = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, full_name, department, role, created_at, updated_at
  `,
    [userId, `PREFERRED_ROLE:${roleCode}`]
  );

  if (updated.rowCount === 0) {
    throw new Error("User not found.");
  }

  return mapRow(updated.rows[0]);
}

export function getPreferredRole(user: Pick<PersistedUser, "department">): string | null {
  if (!user.department || !user.department.startsWith("PREFERRED_ROLE:")) {
    return null;
  }
  return user.department.substring("PREFERRED_ROLE:".length);
}

export async function deleteUser(userId: string) {
  if (!hasDatabaseUrl()) {
    return deleteUserInMemory(userId);
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) {
    return deleteUserInMemory(userId);
  }

  const deleted = await pool.query(
    `
    DELETE FROM app_users
    WHERE id = $1
    RETURNING id, email, full_name, department, role, created_at, updated_at
  `,
    [userId]
  );

  if (deleted.rowCount === 0) {
    throw new Error("User not found.");
  }

  return mapRow(deleted.rows[0]);
}
