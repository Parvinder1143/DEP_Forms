import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest, getOrCreateAppUser, isAdminUser } from '@/lib/adminAccess'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function normalizeRoleName(role?: string): string {
  return (role || '').toLowerCase().replace(/[._&\-\s]/g, '')
}

function isStakeholderRole(role?: string): boolean {
  const normalized = normalizeRoleName(role)
  if (!normalized) return false

  return (
    normalized.includes('sectionhead') ||
    normalized.includes('departmenthead') ||
    normalized === 'hod' ||
    normalized.includes('deputyregistrar') ||
    normalized.includes('establish') ||
    normalized === 'registrar' ||
    normalized === 'dean'
  )
}

type ApprovalLevel = 1 | 2 | 3

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
  if (level === 1) {
    return ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_LEVEL_1']
  }
  if (level === 2) {
    return ['PENDING_LEVEL_2']
  }
  return ['PENDING_LEVEL_3']
}

function stageCodeForLevel(level: ApprovalLevel): 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' {
  if (level === 1) return 'LEVEL_1'
  if (level === 2) return 'LEVEL_2'
  return 'LEVEL_3'
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthUserFromRequest(request)
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const appUser = await getOrCreateAppUser(auth.user)
    const admin = await isAdminUser(appUser.id, auth.user.email)

    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('roles!inner(name)')
      .eq('user_id', appUser.id)

    if (roleError) {
      return NextResponse.json({ error: 'Failed to verify user roles' }, { status: 500 })
    }

    const roleNames = (roleRows || [])
      .map((row: any) => row.roles?.name)
      .filter((name: string | undefined): name is string => Boolean(name))

    const isStakeholder = roleNames.some((role) => isStakeholderRole(role))
    const approvalLevel = resolveApprovalLevel(roleNames)

    // As requested: admin can monitor status, but only stakeholders perform approval action.
    if (!isStakeholder || admin || !approvalLevel) {
      return NextResponse.json({ error: 'Only designated stakeholders can approve email requests.' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()

    const action = String(body?.action || 'APPROVE').toUpperCase()
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use APPROVE or REJECT.' }, { status: 400 })
    }

    const remarks = typeof body?.remarks === 'string' ? body.remarks.trim() : ''
    if (!remarks) {
      return NextResponse.json({ error: 'Remark is required for approve/reject.' }, { status: 400 })
    }

    const currentStage = stageCodeForLevel(approvalLevel)
    const allowedCurrentStatuses = expectedStatusesForLevel(approvalLevel)
    const isReject = action === 'REJECT'

    const nextStatus = isReject
      ? 'REJECTED'
      : approvalLevel === 1
        ? 'PENDING_LEVEL_2'
        : approvalLevel === 2
          ? 'PENDING_LEVEL_3'
          : 'COMPLETED'

    const nextLevel = isReject
      ? approvalLevel
      : approvalLevel === 1
        ? 2
        : approvalLevel === 2
          ? 3
          : 3

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      approval_processed_by_user_id: appUser.id,
      approval_processed_by_name: appUser.full_name,
      approval_processed_at: new Date().toISOString(),
      approval_remark: remarks,
      current_approval_stage: currentStage,
      approval_level: nextLevel,
    }

    // Allow final-stage stakeholder to optionally capture provisioning details.
    if (!isReject && approvalLevel === 3) {
      if (typeof body?.assigned_email_id === 'string' && body.assigned_email_id.trim()) {
        updatePayload.assigned_email_id = body.assigned_email_id.trim()
      }
      if (typeof body?.email_created_by_name === 'string' && body.email_created_by_name.trim()) {
        updatePayload.email_created_by_name = body.email_created_by_name.trim()
      }
      if (typeof body?.email_created_date === 'string' && body.email_created_date.trim()) {
        updatePayload.email_created_date = body.email_created_date
      }
      if (typeof body?.email_removal_date === 'string') {
        updatePayload.email_removal_date = body.email_removal_date.trim() ? body.email_removal_date : null
      }
      if (typeof body?.forwarding_authority === 'string' && body.forwarding_authority.trim()) {
        updatePayload.forwarding_authority = body.forwarding_authority.trim()
      }
      if (typeof body?.authorised_signatory_name === 'string' && body.authorised_signatory_name.trim()) {
        updatePayload.authorised_signatory_name = body.authorised_signatory_name.trim()
      }
      updatePayload.authority_approval_date = new Date().toISOString()
      updatePayload.email_created_by = appUser.id
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('email_id_requests')
      .update(updatePayload)
      .eq('id', id)
      .in('status', allowedCurrentStatuses)
      .select('*')
      .maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json({ error: 'Request is already processed and can no longer be approved.' }, { status: 409 })
    }

    const { error: approvalInsertError } = await supabaseAdmin
      .from('email_request_approvals')
      .insert({
        email_request_id: id,
        approval_stage: currentStage,
        approved_by: appUser.id,
        status: isReject ? 'REJECTED' : 'APPROVED',
        comments: remarks,
        approved_date: new Date().toISOString(),
      })

    if (approvalInsertError) {
      console.warn('Failed to insert approval audit row:', approvalInsertError.message)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error approving email request:', error)
    return NextResponse.json({ error: 'Failed to approve email request' }, { status: 500 })
  }
}
