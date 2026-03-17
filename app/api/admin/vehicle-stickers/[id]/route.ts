import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest, getOrCreateAppUser, getUserRoleNames, isAdminUser } from '@/lib/adminAccess'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{ id: string }>
}

type VehicleApprovalLevel = 1 | 2 | 3 | 4 | 5

function normalizeRoleName(role?: string): string {
  return (role || '').toLowerCase().replace(/[._&\-\s]/g, '')
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

function approvalStageForLevel(level: VehicleApprovalLevel): 'SUPERVISOR' | 'HOD' | 'HOSTEL_WARDEN' | 'STUDENT_AFFAIRS' | 'SECURITY' {
  if (level === 1) return 'SUPERVISOR'
  if (level === 2) return 'HOD'
  if (level === 3) return 'HOSTEL_WARDEN'
  if (level === 4) return 'STUDENT_AFFAIRS'
  return 'SECURITY'
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthUserFromRequest(request)
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const appUser = await getOrCreateAppUser(auth.user)
    const admin = await isAdminUser(appUser.id, auth.user.email)
    if (admin) {
      return NextResponse.json({ error: 'Only designated stakeholders can process vehicle sticker approvals.' }, { status: 403 })
    }

    const roleNames = await getUserRoleNames(appUser.id)
    const approvalLevel = resolveVehicleApprovalLevel(roleNames)
    if (!approvalLevel) {
      return NextResponse.json({ error: 'Your role is not assigned to vehicle sticker approval workflow.' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()

    const action = String(body?.action || '').toUpperCase()
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use APPROVE or REJECT.' }, { status: 400 })
    }

    const remarks = typeof body?.remarks === 'string' ? body.remarks.trim() : ''
    if (!remarks) {
      return NextResponse.json({ error: 'Remark is required for approve/reject.' }, { status: 400 })
    }

    const expectedStatuses = expectedVehicleStatusesForLevel(approvalLevel)
    const isReject = action === 'REJECT'

    const nextStatus = isReject
      ? 'REJECTED'
      : approvalLevel === 1
        ? 'PENDING_HOD'
        : approvalLevel === 2
          ? 'PENDING_HOSTEL_WARDEN'
          : approvalLevel === 3
            ? 'PENDING_AFFAIRS'
            : approvalLevel === 4
              ? 'PENDING_SECURITY'
              : 'STICKER_ISSUED'

    const nextStage = isReject
      ? `REJECTED_LEVEL_${approvalLevel}`
      : approvalLevel === 1
        ? 'LEVEL_2'
        : approvalLevel === 2
          ? 'LEVEL_3'
          : approvalLevel === 3
            ? 'LEVEL_4'
            : approvalLevel === 4
              ? 'LEVEL_5'
              : 'COMPLETED'

    const nextLevel = isReject
      ? approvalLevel
      : approvalLevel === 5
        ? 5
        : approvalLevel + 1

    const updatePayload = {
      status: nextStatus,
      approval_remark: remarks,
      approval_processed_by_user_id: appUser.id,
      approval_processed_by_name: appUser.full_name,
      approval_processed_at: new Date().toISOString(),
      current_approval_stage: nextStage,
      approval_level: nextLevel,
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('vehicle_sticker_applications')
      .update(updatePayload)
      .eq('id', id)
      .in('status', expectedStatuses)
      .select('*')
      .maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json({ error: 'Request is currently at a different stage and cannot be processed by your role.' }, { status: 409 })
    }

    const { error: auditError } = await supabaseAdmin
      .from('vehicle_sticker_approvals')
      .insert({
        application_id: id,
        approval_stage: approvalStageForLevel(approvalLevel),
        approved_by: appUser.id,
        status: isReject ? 'REJECTED' : 'APPROVED',
        comments: remarks,
        approved_date: new Date().toISOString(),
      })

    if (auditError) {
      console.warn('Failed to insert vehicle approval audit row:', auditError.message)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error processing vehicle sticker approval:', error)
    return NextResponse.json({ error: 'Failed to process vehicle sticker approval' }, { status: 500 })
  }
}
