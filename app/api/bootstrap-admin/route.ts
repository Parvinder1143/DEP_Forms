import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ADMIN_EMAIL = 'admin@iitrpr.ac.in'
const ADMIN_PASSWORD = '123456'

export async function POST(request: NextRequest) {
  try {
    const bootstrapKey = request.headers.get('x-bootstrap-key')
    if (!process.env.ADMIN_BOOTSTRAP_KEY || bootstrapKey !== process.env.ADMIN_BOOTSTRAP_KEY) {
      return NextResponse.json({ error: 'Unauthorized bootstrap request' }, { status: 401 })
    }

    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuth = existingAuthUsers.users.find((u) => (u.email || '').toLowerCase() === ADMIN_EMAIL)

    let authUserId = existingAuth?.id

    if (!authUserId) {
      const { data: createdAuth, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'System Admin' },
      })

      if (createAuthError || !createdAuth.user) {
        throw createAuthError || new Error('Failed to create admin auth user')
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
      throw appUserError || new Error('Failed to create app admin user')
    }

    const { data: roleData } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'Super Admin')
      .maybeSingle()

    let roleId = roleData?.id

    if (!roleId) {
      const { data: createdRole, error: createRoleError } = await supabaseAdmin
        .from('roles')
        .insert({
          name: 'Super Admin',
          description: 'Full system access',
          permissions: { all: true },
        })
        .select('id')
        .single()

      if (createRoleError || !createdRole) {
        throw createRoleError || new Error('Failed to create Super Admin role')
      }

      roleId = createdRole.id
    }

    const { error: assignRoleError } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        {
          user_id: appUser.id,
          role_id: roleId,
          department_id: null,
        },
        { onConflict: 'user_id,role_id,department_id' }
      )

    if (assignRoleError) throw assignRoleError

    return NextResponse.json({
      message: 'Admin user is ready',
      admin: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    })
  } catch (error) {
    console.error('Error bootstrapping admin user:', error)
    return NextResponse.json({ error: 'Failed to bootstrap admin user' }, { status: 500 })
  }
}
