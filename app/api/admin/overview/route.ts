import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest, getOrCreateAppUser, getUserRoleNames, isAdminUser } from '@/lib/adminAccess'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function safeCount(table: string, statuses: string[]) {
  const query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true })
  const { count, error } = await (statuses.length
    ? query.in('status', statuses)
    : query)

  if (error) return 0
  return count || 0
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUserFromRequest(request)
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const appUser = await getOrCreateAppUser(auth.user)
    const admin = await isAdminUser(appUser.id, auth.user.email)
    const roleNames = await getUserRoleNames(appUser.id)
    const stakeholderRoles = new Set(['Academics', 'Establishment', 'Research & Development'])
    const isEmailStakeholder = roleNames.some((role) => stakeholderRoles.has(role))
    const canApproveEmailRequests = isEmailStakeholder && !admin

    if (!admin && !isEmailStakeholder) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [
      pendingRoleRequests,
      pendingEmailForms,
      pendingVehicleForms,
      pendingIdentityForms,
      pendingGuestForms,
      pendingUndertakingForms,
    ] = await Promise.all([
      safeCount('role_assignment_requests', ['PENDING']),
      safeCount('email_id_requests', ['PENDING_OFFICER', 'PENDING_AUTHORITY', 'IN_PROGRESS', 'SUBMITTED']),
      safeCount('vehicle_sticker_applications', ['SUBMITTED', 'PENDING_SUPERVISOR', 'PENDING_HOD', 'PENDING_AFFAIRS', 'PENDING_SECURITY']),
      safeCount('identity_card_forms', ['SUBMITTED', 'PENDING_OFFICER', 'PENDING_SUPERVISOR']),
      safeCount('guest_house_reservations', ['SUBMITTED', 'PENDING_SUPERVISOR', 'PENDING_HOD', 'PENDING_COMMITTEE', 'PENDING_MANAGEMENT']),
      safeCount('undertaking_forms', ['SUBMITTED', 'PENDING_OFFICER', 'PENDING_SUPERVISOR']),
    ])

    const { data: latestPendingEmailForms } = await supabaseAdmin
      .from('email_id_requests')
      .select('id, applicant_name, status, submitted_date, assigned_email_id, forwarding_authority, authorised_signatory_name, email_created_date, email_removal_date, email_created_by_name, approval_processed_by_name, approval_processed_at')
      .order('submitted_date', { ascending: false })
      .limit(100)

    const { data: usersData } = admin
      ? await supabaseAdmin
          .from('users')
          .select('id, email, full_name, user_type, created_at')
          .order('created_at', { ascending: false })
      : { data: [] as Array<{ id: string; email: string; full_name: string; user_type: string; created_at: string }> }

    const { data: userRolesData } = admin
      ? await supabaseAdmin
          .from('user_roles')
          .select('user_id, roles(name)')
      : { data: [] as Array<{ user_id?: string; roles?: { name?: string } | null }> }

    const rolesByUserId = new Map<string, string[]>()
    for (const row of userRolesData || []) {
      const userId = (row as { user_id?: string }).user_id
      const roleName = (row as { roles?: { name?: string } | null }).roles?.name

      if (!userId || !roleName) continue

      const existing = rolesByUserId.get(userId) || []
      if (!existing.includes(roleName)) {
        existing.push(roleName)
        rolesByUserId.set(userId, existing)
      }
    }

    const users = (usersData || []).map((row: { id: string; email: string; full_name: string; user_type: string; created_at: string }) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      userType: row.user_type,
      createdAt: row.created_at,
      roles: rolesByUserId.get(row.id) || [],
    }))

    return NextResponse.json({
      currentUser: {
        id: appUser.id,
        roles: roleNames,
        isPlatformAdmin: admin,
        isEmailStakeholder,
        canApproveEmailRequests,
      },
      summary: {
        pendingRoleRequests,
        pendingFormsTotal:
          pendingEmailForms +
          pendingVehicleForms +
          pendingIdentityForms +
          pendingGuestForms +
          pendingUndertakingForms,
        pendingEmailForms,
        pendingVehicleForms,
        pendingIdentityForms,
        pendingGuestForms,
        pendingUndertakingForms,
      },
      queues: {
        latestPendingEmailForms: (latestPendingEmailForms || []).sort((a: any, b: any) => {
          const pendingStatuses = new Set(['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_OFFICER', 'APPROVED_BY_OFFICER', 'PENDING_AUTHORITY', 'IN_PROGRESS'])
          const completedStatuses = new Set(['COMPLETED'])

          const aGroup = pendingStatuses.has(a.status) ? 0 : completedStatuses.has(a.status) ? 1 : 2
          const bGroup = pendingStatuses.has(b.status) ? 0 : completedStatuses.has(b.status) ? 1 : 2

          if (aGroup !== bGroup) return aGroup - bGroup
          return new Date(b.submitted_date || 0).getTime() - new Date(a.submitted_date || 0).getTime()
        }),
      },
      users,
    })
  } catch (error) {
    console.error('Error fetching admin overview:', error)
    return NextResponse.json({ error: 'Failed to fetch admin overview' }, { status: 500 })
  }
}
