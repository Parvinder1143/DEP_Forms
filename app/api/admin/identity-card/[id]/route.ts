import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest, getOrCreateAppUser, getUserRoleNames, isAdminUser } from '@/lib/adminAccess'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{ id: string }>
}

type ApprovalLevel = 1 | 2 | 3

function normalizeRoleName(role?: string): string {
  return (role || '').toLowerCase().replace(/[._&\-\s]/g, '')
}

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

function expectedIdentityStatusesForLevel(level: ApprovalLevel): string[] {
  if (level === 1) return ['SUBMITTED']
  if (level === 2) return ['APPROVED_HOD']
  return ['APPROVED_DIRECTOR']
}

function approverRoleForLevel(level: ApprovalLevel): string {
  if (level === 1) return 'HOD'
  if (level === 2) return 'ESTABLISHMENT'
  return 'REGISTRAR_DEAN'
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
      return NextResponse.json({ error: 'Only designated stakeholders can process identity card approvals.' }, { status: 403 })
    }

    const roleNames = await getUserRoleNames(appUser.id)
    const approvalLevel = resolveApprovalLevel(roleNames)
    if (!approvalLevel) {
      return NextResponse.json({ error: 'Your role is not assigned to identity card approval workflow.' }, { status: 403 })
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

    const expectedStatuses = expectedIdentityStatusesForLevel(approvalLevel)
    const isReject = action === 'REJECT'

    const nextStatus = isReject
      ? 'REJECTED'
      : approvalLevel === 1
        ? 'APPROVED_HOD'
        : approvalLevel === 2
          ? 'APPROVED_DIRECTOR'
          : 'ISSUED'

    const nextStage = isReject
      ? `REJECTED_LEVEL_${approvalLevel}`
      : approvalLevel === 1
        ? 'LEVEL_2'
        : approvalLevel === 2
          ? 'LEVEL_3'
          : 'COMPLETED'

    const nextLevel = isReject
      ? approvalLevel
      : approvalLevel === 1
        ? 2
        : approvalLevel === 2
          ? 3
          : 3

    const updatePayload = {
      status: nextStatus,
      approval_remark: remarks,
      approval_processed_by_user_id: appUser.id,
      approval_processed_by_name: appUser.full_name,
      approval_processed_at: new Date().toISOString(),
      current_approval_stage: nextStage,
      approval_level: nextLevel,
    }

    if (!isReject && approvalLevel === 3) {
      Object.assign(updatePayload, {
        card_issued_date: new Date().toISOString(),
      })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('identity_card_forms')
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
      .from('identity_card_approvals')
      .insert({
        identity_card_form_id: id,
        approver_id: appUser.id,
        approver_role: approverRoleForLevel(approvalLevel),
        status: isReject ? 'REJECTED' : 'APPROVED',
        comments: remarks,
        approved_date: new Date().toISOString(),
      })

    if (auditError) {
      console.warn('Failed to insert identity approval audit row:', auditError.message)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error processing identity card approval:', error)
    return NextResponse.json({ error: 'Failed to process identity card approval' }, { status: 500 })
  }
}
