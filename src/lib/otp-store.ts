import "server-only";

import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { getPgPool } from "@/lib/db";

const OTP_LENGTH = 6;
const OTP_MAX_ATTEMPTS = 5;

const memoryStore = new Map<
  string,
  {
    id: string;
    otpHash: string;
    otpSalt: string;
    attempts: number;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }
>();

let schemaReady = false;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function hashOtp(code: string, salt: string) {
  return scryptSync(code, salt, 32).toString("hex");
}

async function ensureSchema() {
  if (schemaReady) return;

  const pool = getPgPool();
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_login_otps (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      otp_salt TEXT NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS app_login_otps_email_idx
    ON app_login_otps (email, created_at DESC);
  `);

  schemaReady = true;
}

function generateOtpCode() {
  const max = 10 ** OTP_LENGTH;
  const code = randomInt(0, max).toString().padStart(OTP_LENGTH, "0");
  return code;
}

export async function createLoginOtp(input: { email: string; expiresMinutes: number }) {
  const email = normalizeEmail(input.email);
  const code = generateOtpCode();
  const salt = randomBytes(16).toString("hex");
  const otpHash = hashOtp(code, salt);
  const expiresAt = new Date(Date.now() + input.expiresMinutes * 60 * 1000);

  if (!hasDatabaseUrl()) {
    memoryStore.set(email, {
      id: randomUUID(),
      otpHash,
      otpSalt: salt,
      attempts: 0,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    });
    return { code };
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    memoryStore.set(email, {
      id: randomUUID(),
      otpHash,
      otpSalt: salt,
      attempts: 0,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    });
    return { code };
  }

  await pool.query(`DELETE FROM app_login_otps WHERE email = $1`, [email]);

  await pool.query(
    `
    INSERT INTO app_login_otps (id, email, otp_hash, otp_salt, attempts, expires_at)
    VALUES ($1, $2, $3, $4, 0, $5)
  `,
    [randomUUID(), email, otpHash, salt, expiresAt]
  );

  return { code };
}

export async function verifyLoginOtp(input: { email: string; code: string }) {
  const email = normalizeEmail(input.email);

  if (!hasDatabaseUrl()) {
    const record = memoryStore.get(email);
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      return { ok: false, reason: "expired" } as const;
    }

    const incoming = Buffer.from(hashOtp(input.code, record.otpSalt), "hex");
    const stored = Buffer.from(record.otpHash, "hex");
    if (incoming.length !== stored.length || !timingSafeEqual(incoming, stored)) {
      record.attempts += 1;
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        record.usedAt = new Date();
      }
      memoryStore.set(email, record);
      return { ok: false, reason: "invalid" } as const;
    }

    record.usedAt = new Date();
    memoryStore.set(email, record);
    return { ok: true } as const;
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    return { ok: false, reason: "expired" } as const;
  }

  const result = await pool.query(
    `
    SELECT id, otp_hash, otp_salt, attempts, expires_at, used_at
    FROM app_login_otps
    WHERE email = $1
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [email]
  );

  if (!result.rowCount) {
    return { ok: false, reason: "expired" } as const;
  }

  const record = result.rows[0] as {
    id: string;
    otp_hash: string;
    otp_salt: string;
    attempts: number;
    expires_at: Date;
    used_at: Date | null;
  };

  if (record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" } as const;
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "invalid" } as const;
  }

  const incoming = Buffer.from(hashOtp(input.code, record.otp_salt), "hex");
  const stored = Buffer.from(record.otp_hash, "hex");
  const matches = incoming.length === stored.length && timingSafeEqual(incoming, stored);

  if (!matches) {
    await pool.query(
      `
      UPDATE app_login_otps
      SET attempts = attempts + 1,
          used_at = CASE WHEN attempts + 1 >= $2 THEN NOW() ELSE used_at END
      WHERE id = $1
    `,
      [record.id, OTP_MAX_ATTEMPTS]
    );

    return { ok: false, reason: "invalid" } as const;
  }

  await pool.query(
    `
    UPDATE app_login_otps
    SET used_at = NOW()
    WHERE id = $1
  `,
    [record.id]
  );

  return { ok: true } as const;
}
