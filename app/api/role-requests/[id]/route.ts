import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromRequest, getOrCreateAppUser, isAdminUser } from '@/lib/adminAccess'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type PatchBody = {
  status: 'APPROVED' | 'REJECTED'
  roleName?: string
  notes?: string
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Missing role request id' }, { status: 400 })
    }

    const auth = await getAuthUserFromRequest(request)
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const adminUser = await getOrCreateAppUser(auth.user)
    const admin = await isAdminUser(adminUser.id, auth.user.email)

    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as PatchBody

    if (!['APPROVED', 'REJECTED'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: roleRequest, error: requestError } = await supabaseAdmin
      .from('role_assignment_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (requestError || !roleRequest) {
      return NextResponse.json({ error: 'Role request not found' }, { status: 404 })
    }

    let assignedRoleId: string | null = null

    if (body.status === 'APPROVED') {
      if (!body.roleName) {
        return NextResponse.json({ error: 'roleName is required for approval' }, { status: 400 })
      }

      const { data: existingRole } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('name', body.roleName)
        .maybeSingle()

      if (existingRole?.id) {
        assignedRoleId = existingRole.id
      } else {
        const { data: createdRole, error: createRoleError } = await supabaseAdmin
          .from('roles')
          .insert({
            name: body.roleName,
            description: `Auto-created role: ${body.roleName}`,
            permissions: {},
          })
          .select('id')
          .single()

        if (createRoleError || !createdRole) {
          throw createRoleError || new Error('Failed to create role')
        }

        assignedRoleId = createdRole.id
      }

      const { error: assignError } = await supabaseAdmin
        .from('user_roles')
        .upsert(
          {
            user_id: roleRequest.requester_user_id,
            role_id: assignedRoleId,
            department_id: null,
          },
          { onConflict: 'user_id,role_id,department_id' }
        )

      if (assignError) throw assignError
    }

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('role_assignment_requests')
      .update({
        status: body.status,
        notes: body.notes || null,
        decided_at: new Date().toISOString(),
        decided_by_user_id: adminUser.id,
        assigned_role_id: assignedRoleId,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ message: 'Role request updated', request: updatedRequest })
  } catch (error) {
    console.error('Error updating role request:', error)
    return NextResponse.json({ error: 'Failed to update role request' }, { status: 500 })
  }
}
