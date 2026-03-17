import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir).sort()

  for (const file of files) {
    if (!file.endsWith('.sql')) continue

    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf-8')

    try {
      console.log(`⏳ Running ${file}...`)
      const { error } = await supabase.rpc('exec', { sql })

      if (error) {
        console.error(`❌ ${file} failed:`, error.message)
      } else {
        console.log(`✅ ${file} completed`)
      }
    } catch (err: any) {
      console.error(`❌ ${file} error:`, err.message)
    }
  }

  console.log('\n✨ Migrations complete!')
}

runMigrations()
