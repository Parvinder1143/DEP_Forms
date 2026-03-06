import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest, getOrCreateAppUser, isAdminUser } from '@/lib/adminAccess'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

    const stakeholderRoles = new Set(['Academics', 'Establishment', 'Research & Development'])
    const isStakeholder = roleNames.some((role) => stakeholderRoles.has(role))

    // As requested: admin can monitor status, but only stakeholders perform approval action.
    if (!isStakeholder || admin) {
      return NextResponse.json({ error: 'Only designated stakeholders can approve email requests.' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()

    const allowedAuthorities = new Set(['Academics', 'Establishment', 'Research & Development'])
    if (!allowedAuthorities.has(body.forwarding_authority)) {
      return NextResponse.json({ error: 'Invalid forwarding authority selection.' }, { status: 400 })
    }

    const requiredStringFields = ['authorised_signatory_name', 'assigned_email_id', 'email_created_by_name'] as const
    for (const field of requiredStringFields) {
      const value = body[field]
      if (typeof value !== 'string' || !value.trim()) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const emailCreatedDate = typeof body.email_created_date === 'string' && body.email_created_date.trim()
      ? body.email_created_date
      : new Date().toISOString()

    const updatePayload = {
      forwarding_authority: body.forwarding_authority,
      authorised_signatory_name: body.authorised_signatory_name.trim(),
      authority_approval_date: new Date().toISOString(),
      approval_processed_by_user_id: appUser.id,
      approval_processed_by_name: appUser.full_name,
      approval_processed_at: new Date().toISOString(),
      assigned_email_id: body.assigned_email_id.trim(),
      email_created_date: emailCreatedDate,
      email_removal_date: typeof body.email_removal_date === 'string' && body.email_removal_date.trim()
        ? body.email_removal_date
        : null,
      email_created_by: appUser.id,
      email_created_by_name: body.email_created_by_name.trim(),
      status: 'COMPLETED',
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('email_id_requests')
      .update(updatePayload)
      .eq('id', id)
      .in('status', ['SUBMITTED', 'PENDING_OFFICER', 'PENDING_AUTHORITY', 'IN_PROGRESS'])
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
        approval_stage: 'FORWARDING_AUTHORITY',
        approved_by: appUser.id,
        status: 'APPROVED',
        comments: `Forwarded via ${body.forwarding_authority}`,
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
