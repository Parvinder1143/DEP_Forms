import { supabase } from '@/lib/supabase'
import { HostelInformationForm, HostelInformationApproval, HostelRoomAssignment, HostelMessAssignment } from '@/db/schema'

// ============================================================================
// HOSTEL INFORMATION FORM QUERIES
// ============================================================================

export async function getHostelForm(id: string) {
  const { data, error } = await supabase
    .from('hostel_information_forms')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as HostelInformationForm
}

export async function getHostelFormByStudent(studentId: string) {
  const { data, error } = await supabase
    .from('hostel_information_forms')
    .select('*')
    .eq('student_id', studentId)
    .single()

  if (error) throw error
  return data as HostelInformationForm
}

export async function getHostelFormsByStatus(status: string) {
  const { data, error } = await supabase
    .from('hostel_information_forms')
    .select('*')
    .eq('status', status)
    .order('submitted_date', { ascending: false })

  if (error) throw error
  return data as HostelInformationForm[]
}

export async function getHostelFormsByHostel(hostelId: string) {
  const { data, error } = await supabase
    .from('hostel_information_forms')
    .select('*')
    .eq('hostel_id', hostelId)

  if (error) throw error
  return data as HostelInformationForm[]
}

export async function getPendingHostelForms() {
  const { data, error } = await supabase
    .from('hostel_information_forms')
    .select('*')
    .in('status', ['SUBMITTED', 'UNDERTAKING_SIGNED', 'UNDER_REVIEW', 'PENDING_WARDEN'])
    .order('submitted_date', { ascending: true })

  if (error) throw error
  return data as HostelInformationForm[]
}

export async function createHostelForm(form: Omit<HostelInformationForm, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('hostel_information_forms')
    .insert(form)
    .select()
    .single()

  if (error) throw error
  return data as HostelInformationForm
}

export async function updateHostelFormStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('hostel_information_forms')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as HostelInformationForm
}

export async function signUndertaking(id: string) {
  const { data, error } = await supabase
    .from('hostel_information_forms')
    .update({
      undertaking_accepted: true,
      undertaking_signed_date: new Date().toISOString(),
      status: 'UNDERTAKING_SIGNED'
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as HostelInformationForm
}

export async function updateHostelForm(id: string, updates: Partial<HostelInformationForm>) {
  const { data, error } = await supabase
    .from('hostel_information_forms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as HostelInformationForm
}

// ============================================================================
// HOSTEL INFORMATION APPROVAL QUERIES
// ============================================================================

export async function getHostelApprovalsByForm(formId: string) {
  const { data, error } = await supabase
    .from('hostel_information_approvals')
    .select('*')
    .eq('hostel_form_id', formId)
    .order('approved_date', { ascending: true })

  if (error) throw error
  return data as HostelInformationApproval[]
}

export async function getHostelApprovalByStage(formId: string, stage: string) {
  const { data, error } = await supabase
    .from('hostel_information_approvals')
    .select('*')
    .eq('hostel_form_id', formId)
    .eq('approval_stage', stage)
    .single()

  if (error) throw error
  return data as HostelInformationApproval
}

export async function createHostelApproval(approval: Omit<HostelInformationApproval, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('hostel_information_approvals')
    .insert(approval)
    .select()
    .single()

  if (error) throw error
  return data as HostelInformationApproval
}

export async function updateHostelApprovalStatus(id: string, status: string, comments?: string) {
  const { data, error } = await supabase
    .from('hostel_information_approvals')
    .update({ status, comments, approved_date: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as HostelInformationApproval
}

export async function approveHostelForm(formId: string, approvedBy: string, stage: string, comments?: string) {
  return createHostelApproval({
    hostel_form_id: formId,
    approval_stage: stage as any,
    approved_by: approvedBy,
    approved_date: new Date().toISOString(),
    status: 'APPROVED',
    comments
  })
}

export async function rejectHostelForm(formId: string, approvedBy: string, stage: string, comments?: string) {
  return createHostelApproval({
    hostel_form_id: formId,
    approval_stage: stage as any,
    approved_by: approvedBy,
    approved_date: new Date().toISOString(),
    status: 'REJECTED',
    comments
  })
}

// ============================================================================
// HOSTEL ROOM ASSIGNMENT QUERIES
// ============================================================================

export async function getHostelRoomAssignment(id: string) {
  const { data, error } = await supabase
    .from('hostel_room_assignments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as HostelRoomAssignment
}

export async function getAssignmentByForm(formId: string) {
  const { data, error } = await supabase
    .from('hostel_room_assignments')
    .select('*')
    .eq('hostel_form_id', formId)
    .eq('status', 'ACTIVE')
    .single()

  if (error) throw error
  return data as HostelRoomAssignment
}

export async function getAssignmentsByRoom(roomId: string) {
  const { data, error } = await supabase
    .from('hostel_room_assignments')
    .select('*')
    .eq('room_id', roomId)
    .order('assigned_date', { ascending: false })

  if (error) throw error
  return data as HostelRoomAssignment[]
}

export async function createRoomAssignment(assignment: Omit<HostelRoomAssignment, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('hostel_room_assignments')
    .insert(assignment)
    .select()
    .single()

  if (error) throw error
  return data as HostelRoomAssignment
}

export async function assignRoomToStudent(formId: string, roomId: string) {
  return createRoomAssignment({
    hostel_form_id: formId,
    room_id: roomId,
    assigned_date: new Date().toISOString(),
    status: 'ACTIVE'
  })
}

export async function checkoutStudent(assignmentId: string, reason?: string) {
  const { data, error } = await supabase
    .from('hostel_room_assignments')
    .update({
      checkout_date: new Date().toISOString(),
      status: 'COMPLETED',
      reason
    })
    .eq('id', assignmentId)
    .select()
    .single()

  if (error) throw error
  return data as HostelRoomAssignment
}

// ============================================================================
// HOSTEL MESS ASSIGNMENT QUERIES
// ============================================================================

export async function getHostelMessAssignment(formId: string) {
  const { data, error } = await supabase
    .from('hostel_mess_assignments')
    .select('*')
    .eq('hostel_form_id', formId)
    .single()

  if (error) throw error
  return data as HostelMessAssignment
}

export async function createMessAssignment(assignment: Omit<HostelMessAssignment, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('hostel_mess_assignments')
    .insert(assignment)
    .select()
    .single()

  if (error) throw error
  return data as HostelMessAssignment
}

export async function enableMessForStudent(formId: string, startDate: string, endDate: string) {
  return createMessAssignment({
    hostel_form_id: formId,
    mess_enabled: true,
    mess_start_date: startDate,
    mess_end_date: endDate
  })
}

export async function disableMessForStudent(formId: string) {
  const { data, error } = await supabase
    .from('hostel_mess_assignments')
    .update({ mess_enabled: false })
    .eq('hostel_form_id', formId)
    .select()
    .single()

  if (error) throw error
  return data as HostelMessAssignment
}

// ============================================================================
// HOSTEL WORKFLOW HELPERS
// ============================================================================

export async function getHostelFormWithDetails(id: string) {
  const form = await getHostelForm(id)
  const approvals = await getHostelApprovalsByForm(id)
  const assignment = await getAssignmentByForm(id).catch(() => null)
  const mess = await getHostelMessAssignment(id).catch(() => null)

  return {
    form,
    approvals,
    assignment,
    mess
  }
}

export async function getStudentHostelStatus(studentId: string) {
  try {
    const form = await getHostelFormByStudent(studentId)
    const assignment = form ? await getAssignmentByForm(form.id).catch(() => null) : null

    return {
      hasForm: !!form,
      form,
      isCurrentlyResident: assignment?.status === 'ACTIVE',
      assignment
    }
  } catch (error) {
    return {
      hasForm: false,
      form: null,
      isCurrentlyResident: false,
      assignment: null
    }
  }
}
