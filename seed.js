const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function seed() {
  const connectionString = "postgresql://postgres.smrczpwlrpdvphesjvcx:abhi%40ropar23@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const file1 = fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '20260320000000_initial_schema.sql'), 'utf8');
    console.log("Running migration 1...");
    await pool.query(file1);
    console.log("Migration 1 complete.");

    const file2 = fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '20260320010000_email_id_auth_and_roles.sql'), 'utf8');
    console.log("Running migration 2...");
    await pool.query(file2);
    console.log("Migration 2 complete.");
    
  } catch (error) {
    console.error("Error seeding:", error);
  } finally {
    await pool.end();
  }
}

seed();
