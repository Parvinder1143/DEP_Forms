import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest, getOrCreateAppUser, getUserRoleNames, isAdminUser, isInstituteAdminEmail } from '@/lib/adminAccess'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function normalizeRoleName(role?: string): string {
  return (role || '').toLowerCase().replace(/[._&\-\s]/g, '')
}

function isStakeholderRole(role?: string): boolean {
  const normalized = normalizeRoleName(role)
  if (!normalized) return false

  return (
    normalized.includes('supervisor') ||
    normalized.includes('sectionhead') ||
    normalized.includes('departmenthead') ||
    normalized === 'hod' ||
    normalized.includes('deputyregistrar') ||
    normalized === 'registrar' ||
    normalized === 'dean' ||
    normalized.includes('hostelwarden') ||
    normalized.includes('studentaffairs') ||
    normalized.includes('securityofficer') ||
    normalized.includes('establish') ||
    normalized.includes('academic') ||
    (normalized.includes('research') && normalized.includes('development'))
  )
}

function isIdentityQueueRole(role?: string): boolean {
  const normalized = normalizeRoleName(role)
  if (!normalized) return false

  return (
    normalized.includes('sectionhead') ||
    normalized.includes('departmenthead') ||
    normalized === 'hod' ||
    normalized.includes('deputyregistrar') ||
    normalized === 'registrar' ||
    normalized === 'dean' ||
    normalized.includes('establish')
  )
}

type ApprovalLevel = 1 | 2 | 3
type VehicleApprovalLevel = 1 | 2 | 3 | 4 | 5

function resolveApprovalLevel(roleNames: string[]): ApprovalLevel | null {
  const normalized = roleNames.map((role) => normalizeRoleName(role))

  const isLevel3 = normalized.some((role) => role === 'registrar' || role === 'dean')
  if (isLevel3) return 3

  const isLevel2 = normalized.some((role) => role.includes('deputyregistrar') || role.includes('establish'))
  if (isLevel2) return 2

  const isLevel1 = normalized.some((role) => role.includes('sectionhead') || role.includes('departmenthead') || role === 'hod')
  if (isLevel1) return 1

  return null
}

function expectedStatusesForLevel(level: ApprovalLevel): string[] {
  if (level === 1) return ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_LEVEL_1']
  if (level === 2) return ['PENDING_LEVEL_2', 'PENDING_OFFICER', 'APPROVED_BY_OFFICER']
  return ['PENDING_LEVEL_3', 'PENDING_AUTHORITY', 'IN_PROGRESS']
}

function expectedIdentityStatusesForLevel(level: ApprovalLevel): string[] {
  if (level === 1) return ['SUBMITTED']
  if (level === 2) return ['APPROVED_HOD']
  return ['APPROVED_DIRECTOR']
}

function isVehicleQueueRole(role?: string): boolean {
  const normalized = normalizeRoleName(role)
  if (!normalized) return false

  return (
    normalized.includes('supervisor') ||
    normalized === 'hod' ||
    normalized.includes('departmenthead') ||
    normalized.includes('hostelwarden') ||
    normalized.includes('studentaffairs') ||
    normalized.includes('securityofficer')
  )
}

function resolveVehicleApprovalLevel(roleNames: string[]): VehicleApprovalLevel | null {
  const normalized = roleNames.map((role) => normalizeRoleName(role))

  if (normalized.some((role) => role.includes('securityofficer'))) return 5
  if (normalized.some((role) => role.includes('studentaffairs'))) return 4
  if (normalized.some((role) => role.includes('hostelwarden'))) return 3
  if (normalized.some((role) => role === 'hod' || role.includes('departmenthead'))) return 2
  if (normalized.some((role) => role.includes('supervisor'))) return 1

  return null
}

function expectedVehicleStatusesForLevel(level: VehicleApprovalLevel): string[] {
  if (level === 1) return ['SUBMITTED', 'PENDING_SUPERVISOR']
  if (level === 2) return ['PENDING_HOD', 'APPROVED_BY_SUPERVISOR']
  if (level === 3) return ['PENDING_HOSTEL_WARDEN', 'APPROVED_BY_HOD']
  if (level === 4) return ['PENDING_AFFAIRS', 'APPROVED_BY_HOSTEL_WARDEN']
  return ['PENDING_SECURITY', 'APPROVED_BY_AFFAIRS']
}

function getVehicleStageMessage(status?: string): string {
  const normalized = (status || '').toUpperCase()

  if (normalized === 'SUBMITTED' || normalized === 'PENDING_SUPERVISOR') {
    return 'Stage 1 pending: Supervisor approval required.'
  }
  if (normalized === 'PENDING_HOD' || normalized === 'APPROVED_BY_SUPERVISOR') {
    return 'Stage 2 pending: HOD/Department Head approval required.'
  }
  if (normalized === 'PENDING_HOSTEL_WARDEN' || normalized === 'APPROVED_BY_HOD') {
    return 'Stage 3 pending: Hostel Warden approval required.'
  }
  if (normalized === 'PENDING_AFFAIRS' || normalized === 'APPROVED_BY_HOSTEL_WARDEN') {
    return 'Stage 4 pending: Student Affairs approval required.'
  }
  if (normalized === 'PENDING_SECURITY' || normalized === 'APPROVED_BY_AFFAIRS') {
    return 'Stage 5 pending: Security Officer approval required.'
  }
  if (normalized === 'STICKER_ISSUED') {
    return 'All five approval stages completed and sticker issued.'
  }
  if (normalized === 'REJECTED') {
    return 'Application rejected at one of the approval stages.'
  }
  if (normalized === 'CLOSED') {
    return 'Application closed.'
  }
  if (normalized === 'EXPIRED') {
    return 'Sticker validity has expired.'
  }

  return 'Approval stage information unavailable.'
}

function getIdentityStageMessage(status?: string): string {
  const normalized = (status || '').toUpperCase()
  if (normalized === 'SUBMITTED') return 'Stage 1 pending: Section Head / HOD approval required.'
  if (normalized === 'APPROVED_HOD') return 'Stage 2 pending: Deputy Registrar / Establishment approval required.'
  if (normalized === 'APPROVED_DIRECTOR') return 'Stage 3 pending: Registrar / Dean approval required.'
  if (normalized === 'ISSUED') return 'All three approval stages completed.'
  if (normalized === 'REJECTED') return 'Request rejected at one of the approval stages.'
  if (normalized === 'CANCELLED') return 'Request cancelled.'
  return 'Approval stage information unavailable.'
}

function isInstituteAdminRole(role?: string): boolean {
  return normalizeRoleName(role) === 'instituteadmin'
}

function isSuperAdminRole(role?: string): boolean {
  return normalizeRoleName(role) === 'superadmin'
}

async function safeCount(table: string, statuses: string[]) {
  const query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true })
  const { count, error } = await (statuses.length ? query.in('status', statuses) : query)

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
    const isInstituteAdmin = roleNames.some((role) => isInstituteAdminRole(role)) || isInstituteAdminEmail(auth.user.email)
    const isSuperAdmin = roleNames.some((role) => isSuperAdminRole(role))
    const isWorkflowStakeholder = roleNames.some((role) => isStakeholderRole(role))
    const canViewIdentityQueue = roleNames.some((role) => isIdentityQueueRole(role)) && !admin && !isInstituteAdmin
    const canViewVehicleQueue = roleNames.some((role) => isVehicleQueueRole(role)) && !admin && !isInstituteAdmin
    const identityApprovalLevel = resolveApprovalLevel(roleNames)
    const vehicleApprovalLevel = resolveVehicleApprovalLevel(roleNames)
    const canApproveIdentityRequests = canViewIdentityQueue && Boolean(identityApprovalLevel)
    const canApproveVehicleRequests = canViewVehicleQueue && Boolean(vehicleApprovalLevel)
    const emailApprovalLevel = resolveApprovalLevel(roleNames)
    const canApproveEmailRequests = Boolean(emailApprovalLevel) && !admin && !isInstituteAdmin
    const canManageUndertakingRequests = isInstituteAdmin && !admin
    const canViewUndertakingDetails = isInstituteAdmin && !admin
    const canViewUndertakingQueue = admin || isInstituteAdmin

    if (!admin && !isWorkflowStakeholder && !isInstituteAdmin) {
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
      safeCount('email_id_requests', ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_LEVEL_1', 'PENDING_LEVEL_2', 'PENDING_LEVEL_3', 'PENDING_OFFICER', 'PENDING_AUTHORITY', 'IN_PROGRESS']),
      safeCount('vehicle_sticker_applications', ['SUBMITTED', 'PENDING_SUPERVISOR', 'PENDING_HOD', 'PENDING_HOSTEL_WARDEN', 'PENDING_AFFAIRS', 'PENDING_SECURITY', 'APPROVED_BY_SUPERVISOR', 'APPROVED_BY_HOD', 'APPROVED_BY_HOSTEL_WARDEN', 'APPROVED_BY_AFFAIRS']),
      safeCount('identity_card_forms', ['SUBMITTED']),
      safeCount('guest_house_reservations', ['SUBMITTED', 'PENDING_SUPERVISOR', 'PENDING_HOD', 'PENDING_COMMITTEE', 'PENDING_MANAGEMENT']),
      safeCount('undertaking_forms', ['SUBMITTED', 'REVIEWED']),
    ])

    const { data: emailQueueData } = await supabaseAdmin
      .from('email_id_requests')
      .select('id, applicant_name, applicant_title, applicant_initials, first_name, last_name, gender, permanent_address, organisation_id, nature_of_engagement, role, department_section, project_name, joining_date, anticipated_end_date, reporting_officer_name, reporting_officer_email, mobile_number, alternate_email, status, submitted_date, assigned_email_id, forwarding_authority, authorised_signatory_name, email_created_date, email_removal_date, email_created_by_name, approval_processed_by_name, approval_processed_at, approval_remark, current_approval_stage, approval_level')
      .order('submitted_date', { ascending: false })
      .limit(100)

    const identityQueueStatuses = ['SUBMITTED', 'APPROVED_HOD', 'APPROVED_DIRECTOR', 'REJECTED', 'ISSUED', 'CANCELLED']
    const undertakingQueueStatuses = ['SUBMITTED', 'REVIEWED', 'ACCEPTED', 'REJECTED']

    const undertakingSelect = canViewUndertakingDetails
      ? 'id, status, submitted_date, student_name, entry_number, course_name, department_name, hostel_room_number, email_address, date_of_joining, hef_amount, mess_security_fee, mess_admission_fee, mess_charges, blood_group, category, emergency_contact_number, parent_office_address, parent_residence_address, parent_mobile_number, parent_telephone_number, parent_email_id, local_guardian_office_address, local_guardian_residence_address, local_guardian_mobile_number, local_guardian_telephone_number, local_guardian_email_id, declaration_accepted, form_date, student_signature_name, parent_signature_name, reviewer_remarks, reviewed_by_name, reviewed_at'
      : 'id, student_name, status, submitted_date, reviewed_by_name, reviewed_at'

    const identitySelect = 'id, applicant_name, employee_code, designation, employment_type, contract_upto, department_section, father_or_husband_name, date_of_birth, email_address, date_of_joining, blood_group, present_address, office_phone, mobile_number, request_type, renewal_reason, photo_document_url, identity_card_type, status, submitted_date, card_issued_date, card_number, approval_remark, approval_processed_by_name, approval_processed_at, current_approval_stage, approval_level'

    const [vehicleQueueData, identityQueueData, guestQueueData, undertakingQueueData] = admin || canViewUndertakingQueue || canViewIdentityQueue || canViewVehicleQueue
      ? await Promise.all([
          admin || canViewVehicleQueue
            ? supabaseAdmin
                .from('vehicle_sticker_applications')
                .select('*')
                .order('submitted_date', { ascending: false })
                .limit(100)
            : Promise.resolve({ data: [] as any[] }),
          admin || canViewIdentityQueue
            ? supabaseAdmin
                .from('identity_card_forms')
                .select(identitySelect)
                .in('status', identityQueueStatuses)
                .order('submitted_date', { ascending: false })
                .limit(100)
            : Promise.resolve({ data: [] as any[] }),
          admin
            ? supabaseAdmin
                .from('guest_house_reservations')
                .select('id, guest_name, proposer_name, status, submitted_date, room_type, room_category')
                .order('submitted_date', { ascending: false })
                .limit(100)
            : Promise.resolve({ data: [] as any[] }),
          supabaseAdmin
            .from('undertaking_forms')
            .select(undertakingSelect)
            .in('status', undertakingQueueStatuses)
            .order('submitted_date', { ascending: false })
            .limit(100),
        ])
      : [
          { data: [] as any[] },
          { data: [] as any[] },
          { data: [] as any[] },
          { data: [] as any[] },
        ]

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

    const pendingStatuses = new Set(['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_LEVEL_1', 'PENDING_LEVEL_2', 'PENDING_LEVEL_3', 'PENDING_OFFICER', 'APPROVED_BY_OFFICER', 'PENDING_AUTHORITY', 'IN_PROGRESS'])
    const completedStatuses = new Set(['COMPLETED', 'REJECTED', 'APPROVED', 'CLOSED', 'ISSUED'])
    const stakeholderAllowedStatuses = canApproveEmailRequests
      ? new Set([...pendingStatuses, ...completedStatuses])
      : null

    const scopedEmailQueue = (emailQueueData || []).filter((item: any) => {
      if (!stakeholderAllowedStatuses) return true
      return stakeholderAllowedStatuses.has(item.status)
    })

    const latestPendingEmailForms = scopedEmailQueue
      .map((item: any) => ({
        ...item,
        can_take_action: canApproveEmailRequests && emailApprovalLevel
          ? expectedStatusesForLevel(emailApprovalLevel).includes(item.status)
          : false,
      }))
      .sort((a: any, b: any) => {

      const aGroup = pendingStatuses.has(a.status) ? 0 : completedStatuses.has(a.status) ? 1 : 2
      const bGroup = pendingStatuses.has(b.status) ? 0 : completedStatuses.has(b.status) ? 1 : 2

      if (aGroup !== bGroup) return aGroup - bGroup
      return new Date(b.submitted_date || 0).getTime() - new Date(a.submitted_date || 0).getTime()
    })

    const identityStakeholderStatuses = canApproveIdentityRequests && identityApprovalLevel
      ? new Set(['SUBMITTED', 'APPROVED_HOD', 'APPROVED_DIRECTOR', 'REJECTED', 'ISSUED', 'CANCELLED'])
      : null

    const scopedIdentityQueue = (identityQueueData?.data || []).filter((item: any) => {
      if (!identityStakeholderStatuses) return true
      return identityStakeholderStatuses.has(item.status)
    })

    const latestPendingIdentityForms = scopedIdentityQueue.map((item: any) => ({
      ...item,
      stage_message: getIdentityStageMessage(item.status),
      can_take_action: canApproveIdentityRequests && identityApprovalLevel
        ? expectedIdentityStatusesForLevel(identityApprovalLevel).includes(item.status)
        : false,
    }))

    const vehiclePendingStatuses = new Set(['SUBMITTED', 'PENDING_SUPERVISOR', 'APPROVED_BY_SUPERVISOR', 'PENDING_HOD', 'APPROVED_BY_HOD', 'PENDING_HOSTEL_WARDEN', 'APPROVED_BY_HOSTEL_WARDEN', 'PENDING_AFFAIRS', 'APPROVED_BY_AFFAIRS', 'PENDING_SECURITY'])
    const vehicleCompletedStatuses = new Set(['STICKER_ISSUED', 'REJECTED', 'CLOSED', 'EXPIRED'])
    const latestPendingVehicleForms = (vehicleQueueData?.data || [])
      .map((item: any) => ({
        ...item,
        stage_message: getVehicleStageMessage(item.status),
        can_take_action: canApproveVehicleRequests && vehicleApprovalLevel
          ? expectedVehicleStatusesForLevel(vehicleApprovalLevel).includes(item.status)
          : false,
      }))
      .sort((a: any, b: any) => {
        const aGroup = vehiclePendingStatuses.has(a.status) ? 0 : vehicleCompletedStatuses.has(a.status) ? 1 : 2
        const bGroup = vehiclePendingStatuses.has(b.status) ? 0 : vehicleCompletedStatuses.has(b.status) ? 1 : 2

        if (aGroup !== bGroup) return aGroup - bGroup
        return new Date(b.submitted_date || 0).getTime() - new Date(a.submitted_date || 0).getTime()
      })

    return NextResponse.json({
      currentUser: {
        id: appUser.id,
        roles: roleNames,
        isPlatformAdmin: admin,
        isSuperAdmin,
        isInstituteAdmin,
        isEmailStakeholder: isWorkflowStakeholder,
        emailApprovalLevel,
        canApproveEmailRequests,
        identityApprovalLevel,
        canApproveIdentityRequests,
        canViewIdentityQueue,
        vehicleApprovalLevel,
        canApproveVehicleRequests,
        canViewVehicleQueue,
        canManageUndertakingRequests,
        canViewUndertakingDetails,
        canViewUndertakingQueue,
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
        latestPendingEmailForms,
        latestPendingVehicleForms,
        latestPendingIdentityForms,
        latestPendingGuestForms: guestQueueData?.data || [],
        latestPendingUndertakingForms: undertakingQueueData?.data || [],
      },
      users,
    })
  } catch (error) {
    console.error('Error fetching admin overview:', error)
    return NextResponse.json({ error: 'Failed to fetch admin overview' }, { status: 500 })
  }
}
