import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { VehicleStickerApplication, ApplicationVehicle, VehicleSticker, VehicleStickerApproval } from '@/db/schema'

// ============================================================================
// VEHICLE STICKER APPLICATION QUERIES
// ============================================================================

export async function getVehicleApplication(id: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as VehicleStickerApplication
}

export async function getVehicleApplicationsByApplicant(applicantId: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_applications')
    .select('*')
    .eq('applicant_id', applicantId)
    .order('submitted_date', { ascending: false })

  if (error) throw error
  return data as VehicleStickerApplication[]
}

export async function getVehicleApplicationsByStatus(status: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_applications')
    .select('*')
    .eq('status', status)
    .order('submitted_date', { ascending: false })

  if (error) throw error
  return data as VehicleStickerApplication[]
}

export async function getPendingVehicleApplications() {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_applications')
    .select('*')
    .in('status', ['SUBMITTED', 'PENDING_SUPERVISOR', 'PENDING_HOD', 'PENDING_HOSTEL_WARDEN', 'PENDING_AFFAIRS', 'PENDING_SECURITY'])
    .order('submitted_date', { ascending: true })

  if (error) throw error
  return data as VehicleStickerApplication[]
}

export async function createVehicleApplication(app: Omit<VehicleStickerApplication, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_applications')
    .insert(app)
    .select()
    .single()

  if (error) throw error
  return data as VehicleStickerApplication
}

export async function updateVehicleApplicationStatus(id: string, status: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_applications')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as VehicleStickerApplication
}

export async function updateVehicleApplication(id: string, updates: Partial<VehicleStickerApplication>) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_applications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as VehicleStickerApplication
}

// ============================================================================
// APPLICATION VEHICLE QUERIES
// ============================================================================

export async function getApplicationVehicles(applicationId: string) {
  const { data, error } = await supabaseAdmin
    .from('application_vehicles')
    .select('*')
    .eq('application_id', applicationId)
    .order('sequence_number', { ascending: true })

  if (error) throw error
  return data as ApplicationVehicle[]
}

export async function getApplicationVehicle(id: string) {
  const { data, error } = await supabaseAdmin
    .from('application_vehicles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as ApplicationVehicle
}

export async function getPrimaryVehicle(applicationId: string) {
  const { data, error } = await supabaseAdmin
    .from('application_vehicles')
    .select('*')
    .eq('application_id', applicationId)
    .eq('primary_vehicle', true)
    .single()

  if (error) throw error
  return data as ApplicationVehicle
}

export async function addVehicleToApplication(vehicle: Omit<ApplicationVehicle, 'id' | 'created_at'>) {
  const { data, error } = await supabaseAdmin
    .from('application_vehicles')
    .insert(vehicle)
    .select()
    .single()

  if (error) throw error
  return data as ApplicationVehicle
}

export async function updateApplicationVehicle(id: string, updates: Partial<ApplicationVehicle>) {
  const { data, error } = await supabaseAdmin
    .from('application_vehicles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ApplicationVehicle
}

export async function removeVehicleFromApplication(id: string) {
  const { error } = await supabaseAdmin
    .from('application_vehicles')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// VEHICLE STICKER QUERIES
// ============================================================================

export async function getVehicleSticker(id: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_stickers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as VehicleSticker
}

export async function getVehicleStickerByNumber(stickerNumber: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_stickers')
    .select('*')
    .eq('sticker_number', stickerNumber)
    .single()

  if (error) throw error
  return data as VehicleSticker
}

export async function getStickersByApplication(applicationId: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_stickers')
    .select('*')
    .eq('application_id', applicationId)

  if (error) throw error
  return data as VehicleSticker[]
}

export async function getActiveStickers() {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabaseAdmin
    .from('vehicle_stickers')
    .select('*')
    .eq('status', 'ACTIVE')
    .gt('valid_until', today)

  if (error) throw error
  return data as VehicleSticker[]
}

export async function getExpiredStickers() {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabaseAdmin
    .from('vehicle_stickers')
    .select('*')
    .lt('valid_until', today)
    .eq('status', 'ACTIVE')

  if (error) throw error
  return data as VehicleSticker[]
}

export async function createVehicleSticker(sticker: Omit<VehicleSticker, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_stickers')
    .insert(sticker)
    .select()
    .single()

  if (error) throw error
  return data as VehicleSticker
}

export async function updateVehicleStickerStatus(id: string, status: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_stickers')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as VehicleSticker
}

export async function revokeVehicleSticker(id: string) {
  return updateVehicleStickerStatus(id, 'REVOKED')
}

export async function reportStickerLost(id: string) {
  return updateVehicleStickerStatus(id, 'LOST')
}

// ============================================================================
// VEHICLE STICKER APPROVAL QUERIES
// ============================================================================

export async function getVehicleApprovalsByApplication(applicationId: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_approvals')
    .select('*')
    .eq('application_id', applicationId)
    .order('approved_date', { ascending: true })

  if (error) throw error
  return data as VehicleStickerApproval[]
}

export async function getVehicleApprovalByStage(applicationId: string, stage: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_approvals')
    .select('*')
    .eq('application_id', applicationId)
    .eq('approval_stage', stage)
    .single()

  if (error) throw error
  return data as VehicleStickerApproval
}

export async function getPendingVehicleApprovalsForUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_approvals')
    .select('*')
    .eq('approved_by', userId)
    .eq('status', 'PENDING')

  if (error) throw error
  return data as VehicleStickerApproval[]
}

export async function createVehicleApproval(approval: Omit<VehicleStickerApproval, 'id' | 'created_at'>) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_approvals')
    .insert(approval)
    .select()
    .single()

  if (error) throw error
  return data as VehicleStickerApproval
}

export async function updateVehicleApprovalStatus(id: string, status: string, comments?: string) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_sticker_approvals')
    .update({ status, comments, approved_date: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as VehicleStickerApproval
}

export async function approveVehicleApplication(applicationId: string, approvedBy: string, stage: string, comments?: string) {
  return createVehicleApproval({
    application_id: applicationId,
    approval_stage: stage as any,
    approved_by: approvedBy,
    approved_date: new Date().toISOString(),
    status: 'APPROVED',
    comments
  })
}

export async function rejectVehicleApplication(applicationId: string, approvedBy: string, stage: string, comments?: string) {
  return createVehicleApproval({
    application_id: applicationId,
    approval_stage: stage as any,
    approved_by: approvedBy,
    approved_date: new Date().toISOString(),
    status: 'REJECTED',
    comments
  })
}

// ============================================================================
// VEHICLE WORKFLOW HELPERS
// ============================================================================

export async function generateStickerNumber(): Promise<string> {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `STK-${timestamp}-${random}`
}

export async function getVehicleApplicationWithDetails(id: string) {
  const application = await getVehicleApplication(id)
  const vehicles = await getApplicationVehicles(id)
  const approvals = await getVehicleApprovalsByApplication(id)
  const stickers = await getStickersByApplication(id)

  return {
    application,
    vehicles,
    approvals,
    stickers
  }
}

export async function getVehicleTypeIdsByCodes(codes: Array<'2W' | '4W'>) {
  const uniqueCodes = Array.from(new Set(codes))
  const { data, error } = await supabaseAdmin
    .from('vehicle_types')
    .select('id, code')
    .in('code', uniqueCodes)

  if (error) throw error

  const byCode = new Map<string, string>()
  for (const item of data || []) {
    byCode.set(item.code, item.id)
  }

  return byCode
}
