import { getPgPool } from "@/lib/db";
import {
  listDepartmentsInMemory,
  createDepartmentInMemory,
  updateDepartmentInMemory,
  deleteDepartmentInMemory,
  type DepartmentRecord,
} from "@/lib/mock-db";

let schemaReady = false;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

async function ensureSchemaAndSeed() {
  if (schemaReady) return;
  const pool = getPgPool();
  if (!pool) return;

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'departments'
      );
    `);
    
    if (!result.rows[0].exists) {
      // Create if doesn't exist for some reason
      await client.query(`
        CREATE TABLE IF NOT EXISTS departments (
          id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
          name              TEXT        NOT NULL UNIQUE,
          hod_email         TEXT        NOT NULL,
          created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      
      const seedDepartments = [
        { name: "Computer Science and Engineering", hodEmail: "hod.cse@iitrpr.ac.in" },
        { name: "Electrical Engineering", hodEmail: "hod.ee@iitrpr.ac.in" },
      ];

      for (const dept of seedDepartments) {
        await client.query(`
          INSERT INTO departments (name, hod_email)
          VALUES ($1, $2)
          ON CONFLICT (name) DO NOTHING
        `, [dept.name, dept.hodEmail]);
      }
    }
    
    schemaReady = true;
  } catch (err) {
    console.error("Error ensuring department schema:", err);
  } finally {
    client.release();
  }
}

function mapRow(row: any): DepartmentRecord {
  return {
    id: row.id,
    name: row.name,
    hodEmail: row.hod_email,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function listDepartments(): Promise<DepartmentRecord[]> {
  if (!hasDatabaseUrl()) {
    return listDepartmentsInMemory();
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) return listDepartmentsInMemory();

  const result = await pool.query(
    `SELECT id, name, hod_email, created_at, updated_at FROM departments ORDER BY name ASC`
  );
  return result.rows.map(mapRow);
}

export async function checkHodDepartmentAccess(userEmail: string, departmentName: string): Promise<boolean> {
  const departments = await listDepartments();
  const department = departments.find((d) => d.name.toLowerCase() === departmentName.toLowerCase());
  if (!department) return false;
  return department.hodEmail.toLowerCase() === userEmail.toLowerCase();
}

export async function createDepartment(name: string, hodEmail: string): Promise<DepartmentRecord> {
  if (!hasDatabaseUrl()) {
    return createDepartmentInMemory({ name, hodEmail });
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) return createDepartmentInMemory({ name, hodEmail });

  try {
    const result = await pool.query(
      `
      INSERT INTO departments (name, hod_email)
      VALUES ($1, $2)
      RETURNING id, name, hod_email, created_at, updated_at
      `,
      [name, hodEmail]
    );
    return mapRow(result.rows[0]);
  } catch (err: any) {
    if (err.code === "23505") { // unique_violation
      throw new Error("Department with this name already exists.");
    }
    throw err;
  }
}

export async function updateDepartment(id: string, name: string, hodEmail: string): Promise<DepartmentRecord> {
  if (!hasDatabaseUrl()) {
    return updateDepartmentInMemory(id, { name, hodEmail });
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) return updateDepartmentInMemory(id, { name, hodEmail });

  try {
    const result = await pool.query(
      `
      UPDATE departments
      SET name = $2, hod_email = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, hod_email, created_at, updated_at
      `,
      [id, name, hodEmail]
    );
    if (result.rowCount === 0) {
      throw new Error("Department not found.");
    }
    return mapRow(result.rows[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      throw new Error("Another department with this name already exists.");
    }
    throw err;
  }
}

export async function deleteDepartment(id: string): Promise<DepartmentRecord> {
  if (!hasDatabaseUrl()) {
    return deleteDepartmentInMemory(id);
  }

  await ensureSchemaAndSeed();
  const pool = getPgPool();
  if (!pool) return deleteDepartmentInMemory(id);

  const result = await pool.query(
    `
    DELETE FROM departments
    WHERE id = $1
    RETURNING id, name, hod_email, created_at, updated_at
    `,
    [id]
  );
  if (result.rowCount === 0) {
    throw new Error("Department not found.");
  }
  return mapRow(result.rows[0]);
}
