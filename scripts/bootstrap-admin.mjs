import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'admin@iitrpr.ac.in'
const ADMIN_PASSWORD = '123456'

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIndex = line.indexOf('=')
    if (eqIndex < 0) continue

    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

async function main() {
  const root = process.cwd()
  loadEnvFile(path.join(root, '.env.local'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: listedUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) throw listError

  const existingAuthUser = listedUsers.users.find((u) => (u.email || '').toLowerCase() === ADMIN_EMAIL)

  let authUserId = existingAuthUser?.id

  if (!authUserId) {
    const { data: createdAuth, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'System Admin' },
    })

    if (createAuthError || !createdAuth.user) {
      throw createAuthError || new Error('Failed to create auth user')
    }

    authUserId = createdAuth.user.id
  }

  const { data: appUser, error: appUserError } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        auth_id: authUserId,
        email: ADMIN_EMAIL,
        full_name: 'System Admin',
        user_type: 'admin',
      },
      { onConflict: 'auth_id' }
    )
    .select('*')
    .single()

  if (appUserError || !appUser) {
    throw appUserError || new Error('Failed to create app user')
  }

  const { data: roleData } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('name', 'Super Admin')
    .maybeSingle()

  let roleId = roleData?.id

  if (!roleId) {
    const { data: createdRole, error: roleError } = await supabaseAdmin
      .from('roles')
      .insert({
        name: 'Super Admin',
        description: 'Full system access',
        permissions: { all: true },
      })
      .select('id')
      .single()

    if (roleError || !createdRole) {
      throw roleError || new Error('Failed to create Super Admin role')
    }

    roleId = createdRole.id
  }

  const { error: roleAssignError } = await supabaseAdmin
    .from('user_roles')
    .upsert(
      {
        user_id: appUser.id,
        role_id: roleId,
        department_id: null,
      },
      { onConflict: 'user_id,role_id,department_id' }
    )

  if (roleAssignError) throw roleAssignError

  console.log('Admin user is ready:')
  console.log(`Email: ${ADMIN_EMAIL}`)
  console.log(`Password: ${ADMIN_PASSWORD}`)
}

main().catch((error) => {
  console.error('Failed to bootstrap admin user:', error)
  process.exit(1)
})
