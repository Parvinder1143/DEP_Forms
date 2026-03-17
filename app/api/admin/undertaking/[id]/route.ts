import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest, getOrCreateAppUser, getUserRoleNames, isAdminUser, isInstituteAdminEmail } from '@/lib/adminAccess'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function normalizeRoleName(role?: string): string {
  return (role || '').toLowerCase().replace(/[._&\-\s]/g, '')
}

function isInstituteAdminRole(role?: string): boolean {
  return normalizeRoleName(role) === 'instituteadmin'
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
    const roleNames = await getUserRoleNames(appUser.id)
    const instituteAdmin = roleNames.some((role) => isInstituteAdminRole(role)) || isInstituteAdminEmail(auth.user.email)

    // Undertaking stakeholder: only Institute Admin (not system admin).
    if (!instituteAdmin || admin) {
      return NextResponse.json({ error: 'Only Institute Admin can process undertaking requests.' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()

    const action = typeof body?.action === 'string' ? body.action.toUpperCase() : ''
    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Action must be ACCEPT or REJECT.' }, { status: 400 })
    }

    const remarks = typeof body?.remarks === 'string' ? body.remarks.trim() : ''
    if (!remarks) {
      return NextResponse.json({ error: 'Remark is required.' }, { status: 400 })
    }

    const targetStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('undertaking_forms')
      .update({
        status: targetStatus,
        reviewer_remarks: remarks,
        reviewed_by_user_id: appUser.id,
        reviewed_by_name: appUser.full_name,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .in('status', ['SUBMITTED', 'REVIEWED'])
      .select('*')
      .maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updated) {
      return NextResponse.json({ error: 'Request is already processed and can no longer be changed.' }, { status: 409 })
    }

    if (targetStatus === 'ACCEPTED') {
      await supabaseAdmin
        .from('undertaking_acceptances')
        .insert({
          undertaking_form_id: id,
          accepted_by: appUser.id,
          accepted_date: new Date().toISOString(),
          acceptance_notes: remarks,
        })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error processing undertaking request:', error)
    return NextResponse.json({ error: 'Failed to process undertaking request' }, { status: 500 })
  }
}
