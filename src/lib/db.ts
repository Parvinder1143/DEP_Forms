import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  pgPool?: Pool | null;
};

export function getPgPool() {
  if (globalForPg.pgPool !== undefined) {
    return globalForPg.pgPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    globalForPg.pgPool = null;
    return globalForPg.pgPool;
  }

  const shouldUseSsl = !connectionString.includes("localhost");

  globalForPg.pgPool = new Pool({
    connectionString,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
  });

  return globalForPg.pgPool;
}
