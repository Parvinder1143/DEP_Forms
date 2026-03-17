import { supabase } from '@/lib/supabase'
import { EmailIdRequest, EmailRequestApproval, EmailPolicyAcknowledgment, EmailRequestStatus, ApprovalStatus } from '@/db/schema'

// ============================================================================
// EMAIL ID REQUEST QUERIES
// ============================================================================

export async function getEmailRequest(id: string) {
  const { data, error } = await supabase
    .from('email_id_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as EmailIdRequest
}

export async function getEmailRequestsByApplicant(applicantId: string) {
  const { data, error } = await supabase
    .from('email_id_requests')
    .select('*')
    .eq('applicant_id', applicantId)
    .order('submitted_date', { ascending: false })

  if (error) throw error
  return data as EmailIdRequest[]
}

export async function getEmailRequestsByStatus(status: EmailRequestStatus) {
  const { data, error } = await supabase
    .from('email_id_requests')
    .select('*')
    .eq('status', status)
    .order('submitted_date', { ascending: false })

  if (error) throw error
  return data as EmailIdRequest[]
}

export async function getEmailRequestsByDepartmentSection(departmentSection: string) {
  const { data, error } = await supabase
    .from('email_id_requests')
    .select('*')
    .eq('department_section', departmentSection)
    .order('submitted_date', { ascending: false })

  if (error) throw error
  return data as EmailIdRequest[]
}

export async function getEmailRequestByAssignedId(emailId: string) {
  const { data, error } = await supabase
    .from('email_id_requests')
    .select('*')
    .eq('assigned_email_id', emailId)
    .single()

  if (error) throw error
  return data as EmailIdRequest
}

export async function getPendingEmailRequests() {
  const { data, error } = await supabase
    .from('email_id_requests')
    .select('*')
    .in('status', ['SUBMITTED', 'PENDING_OFFICER', 'PENDING_AUTHORITY', 'IN_PROGRESS'])
    .order('submitted_date', { ascending: true })

  if (error) throw error
  return data as EmailIdRequest[]
}

export async function createEmailRequest(emailRequest: Omit<EmailIdRequest, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('email_id_requests')
    .insert(emailRequest)
    .select()
    .single()

  if (error) throw error
  return data as EmailIdRequest
}

export async function updateEmailRequestStatus(id: string, status: EmailRequestStatus) {
  const { data, error } = await supabase
    .from('email_id_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as EmailIdRequest
}

export async function assignEmailId(id: string, emailId: string, createdBy: string) {
  const { data, error } = await supabase
    .from('email_id_requests')
    .update({
      assigned_email_id: emailId,
      email_created_date: new Date().toISOString(),
      email_created_by: createdBy,
      status: 'COMPLETED'
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as EmailIdRequest
}

export async function setEmailRemovalDate(id: string, removalDate: string) {
  const { data, error } = await supabase
    .from('email_id_requests')
    .update({ email_removal_date: removalDate })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as EmailIdRequest
}

export async function updateEmailRequest(id: string, updates: Partial<EmailIdRequest>) {
  const { data, error } = await supabase
    .from('email_id_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as EmailIdRequest
}

export async function deleteEmailRequest(id: string) {
  const { error } = await supabase
    .from('email_id_requests')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// EMAIL REQUEST APPROVAL QUERIES
// ============================================================================

export async function getEmailApprovalsByRequest(requestId: string) {
  const { data, error } = await supabase
    .from('email_request_approvals')
    .select('*')
    .eq('email_request_id', requestId)
    .order('approved_date', { ascending: true })

  if (error) throw error
  return data as EmailRequestApproval[]
}

export async function getEmailApprovalByStage(requestId: string, stage: string) {
  const { data, error } = await supabase
    .from('email_request_approvals')
    .select('*')
    .eq('email_request_id', requestId)
    .eq('approval_stage', stage)
    .single()

  if (error) throw error
  return data as EmailRequestApproval
}

export async function getApprovalsByApprover(approvedBy: string) {
  const { data, error } = await supabase
    .from('email_request_approvals')
    .select('*')
    .eq('approved_by', approvedBy)
    .order('approved_date', { ascending: false })

  if (error) throw error
  return data as EmailRequestApproval[]
}

export async function getPendingApprovalsForUser(userId: string) {
  const { data, error } = await supabase
    .from('email_request_approvals')
    .select('*')
    .eq('approved_by', userId)
    .eq('status', 'PENDING')
    .order('approved_date', { ascending: true })

  if (error) throw error
  return data as EmailRequestApproval[]
}

export async function createEmailApproval(approval: Omit<EmailRequestApproval, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('email_request_approvals')
    .insert(approval)
    .select()
    .single()

  if (error) throw error
  return data as EmailRequestApproval
}

export async function updateEmailApprovalStatus(id: string, status: ApprovalStatus, comments?: string) {
  const { data, error } = await supabase
    .from('email_request_approvals')
    .update({ status, comments, approved_date: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as EmailRequestApproval
}

export async function approveEmailRequest(id: string, approvedBy: string, stage: string, comments?: string) {
  return createEmailApproval({
    email_request_id: id,
    approval_stage: stage as any,
    approved_by: approvedBy,
    approved_date: new Date().toISOString(),
    status: 'APPROVED',
    comments
  })
}

export async function rejectEmailRequest(id: string, approvedBy: string, stage: string, comments?: string) {
  return createEmailApproval({
    email_request_id: id,
    approval_stage: stage as any,
    approved_by: approvedBy,
    approved_date: new Date().toISOString(),
    status: 'REJECTED',
    comments
  })
}

// ============================================================================
// EMAIL POLICY ACKNOWLEDGMENT QUERIES
// ============================================================================

export async function getEmailPolicyAcknowledgment(userId: string) {
  const { data, error } = await supabase
    .from('email_policy_acknowledgments')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data as EmailPolicyAcknowledgment
}

export async function createEmailPolicyAcknowledgment(userId: string, emailRequestId: string) {
  const { data, error } = await supabase
    .from('email_policy_acknowledgments')
    .insert({
      user_id: userId,
      email_request_id: emailRequestId,
      policy_version: '2021-08-09',
      acknowledged: false
    })
    .select()
    .single()

  if (error) throw error
  return data as EmailPolicyAcknowledgment
}

export async function acknowledgeEmailPolicy(userId: string) {
  const { data, error } = await supabase
    .from('email_policy_acknowledgments')
    .update({
      acknowledged: true,
      acknowledged_date: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as EmailPolicyAcknowledgment
}

export async function hasAcknowledgedPolicy(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('email_policy_acknowledgments')
    .select('acknowledged')
    .eq('user_id', userId)
    .single()

  if (error) return false
  return data?.acknowledged || false
}

// ============================================================================
// EMAIL REQUEST WORKFLOW HELPERS
// ============================================================================

export async function getEmailRequestWithApprovals(id: string) {
  const request = await getEmailRequest(id)
  const approvals = await getEmailApprovalsByRequest(id)
  
  return {
    request,
    approvals
  }
}

export async function getEmailRequestApprovalStatus(id: string) {
  const approvals = await getEmailApprovalsByRequest(id)
  
  return {
    officer_status: approvals.find(a => a.approval_stage === 'REPORTING_OFFICER')?.status,
    authority_status: approvals.find(a => a.approval_stage === 'FORWARDING_AUTHORITY')?.status,
    it_status: approvals.find(a => a.approval_stage === 'IT_ADMIN')?.status
  }
}

export async function canMoveToNextStage(id: string, currentStage: string): Promise<boolean> {
  const approval = await getEmailApprovalByStage(id, currentStage)
  return approval?.status === 'APPROVED'
}
