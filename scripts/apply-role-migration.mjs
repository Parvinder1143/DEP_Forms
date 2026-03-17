import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const idx = line.indexOf('=')
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

async function run() {
  const root = process.cwd()
  loadEnvFile(path.join(root, '.env.local'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const sql = fs.readFileSync(path.join(root, 'db', 'migrations', '010_role_assignment_requests.sql'), 'utf8')

  const { error } = await supabaseAdmin.rpc('exec', { sql })
  if (error) throw error

  console.log('Migration 010_role_assignment_requests.sql applied successfully')
}

run().catch((error) => {
  console.error('Failed to apply migration:', error)
  process.exit(1)
})
