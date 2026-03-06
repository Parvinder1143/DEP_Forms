import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ADMIN_EMAIL = 'admin@iitrpr.ac.in'
const ADMIN_ROLES = ['Super Admin', 'Institute Admin']

type AppUser = {
  id: string
  email: string
  full_name: string
  user_type: string
  auth_id: string
}

export async function getAuthUserFromRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.split(' ')[1]
  if (!token) return { user: null, error: 'Missing token', status: 401 as const }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) return { user: null, error: 'Invalid token', status: 401 as const }

  return { user, error: null, status: 200 as const }
}

export async function getOrCreateAppUser(authUser: { id: string; email?: string | null; user_metadata?: any }) {
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .maybeSingle()

  if (existing) return existing as AppUser

  const { data: created, error } = await supabaseAdmin
    .from('users')
    .insert({
      auth_id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
      user_type: authUser.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'employee',
    })
    .select('*')
    .single()

  if (error) throw error
  return created as AppUser
}

export async function getUserRoleNames(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('roles!inner(name)')
    .eq('user_id', userId)

  if (error || !data) return []

  return data
    .map((row: any) => row.roles?.name)
    .filter((name: string | undefined): name is string => Boolean(name))
}

export function isAdminEmail(email?: string | null): boolean {
  return (email || '').toLowerCase() === ADMIN_EMAIL
}

export async function isAdminUser(userId: string, email?: string | null): Promise<boolean> {
  if (isAdminEmail(email)) return true

  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('roles!inner(name)')
    .eq('user_id', userId)
    .in('roles.name', ADMIN_ROLES)

  return Boolean(data && data.length > 0)
}
