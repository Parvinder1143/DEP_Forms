import { NextRequest, NextResponse } from 'next/server'
import { isInstituteEmail } from '@/lib/access'
import { getAuthUserFromRequest, getOrCreateAppUser, getUserRoleNames, isAdminUser } from '@/lib/adminAccess'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUserFromRequest(request)
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const appUser = await getOrCreateAppUser(auth.user)
    const admin = await isAdminUser(appUser.id, auth.user.email)

    if (admin) {
      const { data, error } = await supabaseAdmin
        .from('role_assignment_requests')
        .select('*')
        .order('requested_at', { ascending: true })

      if (error) throw error
      return NextResponse.json({ requests: data || [] })
    }

    const roles = await getUserRoleNames(appUser.id)
    const { data: requestData } = await supabaseAdmin
      .from('role_assignment_requests')
      .select('*')
      .eq('requester_user_id', appUser.id)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      roles,
      request: requestData || null,
      hasAssignedRole: roles.length > 0,
      canRequestRole: isInstituteEmail(auth.user.email),
    })
  } catch (error) {
    console.error('Error fetching role requests:', error)
    return NextResponse.json({ error: 'Failed to fetch role request data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUserFromRequest(request)
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!isInstituteEmail(auth.user.email)) {
      return NextResponse.json({ error: 'Only IIT Ropar emails can request roles' }, { status: 403 })
    }

    const appUser = await getOrCreateAppUser(auth.user)

    const existingRoles = await getUserRoleNames(appUser.id)
    if (existingRoles.length > 0) {
      return NextResponse.json({ message: 'Role already assigned', roles: existingRoles }, { status: 200 })
    }

    const { data: existingRequest } = await supabaseAdmin
      .from('role_assignment_requests')
      .select('*')
      .eq('requester_user_id', appUser.id)
      .in('status', ['PENDING', 'APPROVED'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingRequest) {
      return NextResponse.json({ message: 'Role request already exists', request: existingRequest }, { status: 200 })
    }

    const { data, error } = await supabaseAdmin
      .from('role_assignment_requests')
      .insert({
        requester_user_id: appUser.id,
        requester_auth_id: auth.user.id,
        requester_email: auth.user.email,
        status: 'PENDING',
      })
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ message: 'Role request submitted', request: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating role request:', error)
    return NextResponse.json({ error: 'Failed to create role request' }, { status: 500 })
  }
}
