const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE departments 
      ADD COLUMN IF NOT EXISTS hod_email VARCHAR(255) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('Successfully altered departments table.');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
