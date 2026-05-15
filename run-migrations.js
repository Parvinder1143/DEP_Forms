import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Error: DATABASE_URL environment variable is not set in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    const sqlPath = path.resolve(__dirname, 'supabase', 'all_migrations.sql');
    console.log(`Reading SQL from ${sqlPath}...`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migrations...');
    await client.query(sql);
    console.log('Migrations executed successfully!');
  } catch (error) {
    console.error('Error executing migrations:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
