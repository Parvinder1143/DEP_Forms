import { supabase } from '@/lib/supabase'
import { GuestHouseReservation, GuestHouseApproval, GuestHouseCheckIn, GuestHouseAdditionalCharge } from '@/db/schema'

// ============================================================================
// GUEST HOUSE RESERVATION QUERIES
// ============================================================================

export async function getReservation(id: string) {
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as GuestHouseReservation
}

export async function getReservationByNumber(reservationNumber: string) {
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .select('*')
    .eq('reservation_number', reservationNumber)
    .single()

  if (error) throw error
  return data as GuestHouseReservation
}

export async function getReservationsByProposer(proposerId: string) {
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .select('*')
    .eq('proposer_id', proposerId)
    .order('submitted_date', { ascending: false })

  if (error) throw error
  return data as GuestHouseReservation[]
}

export async function getReservationsByStatus(status: string) {
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .select('*')
    .eq('status', status)
    .order('arrival_date', { ascending: true })

  if (error) throw error
  return data as GuestHouseReservation[]
}

export async function getReservationsByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .select('*')
    .gte('arrival_date', startDate)
    .lte('departure_date', endDate)
    .order('arrival_date', { ascending: true })

  if (error) throw error
  return data as GuestHouseReservation[]
}

export async function getReservationsByGuestHouse(_guestHouseId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('guest_house_reservations')
    .select('*')

  if (startDate && endDate) {
    query = query
      .gte('arrival_date', startDate)
      .lte('departure_date', endDate)
  }

  const { data, error } = await query.order('arrival_date', { ascending: true })

  if (error) throw error
  return data as GuestHouseReservation[]
}

export async function getUpcomingReservations() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .select('*')
    .gte('arrival_date', today)
    .in('status', ['CONFIRMED', 'CHECK_IN', 'ACTIVE'])
    .order('arrival_date', { ascending: true })

  if (error) throw error
  return data as GuestHouseReservation[]
}

export async function getPendingReservations() {
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .select('*')
    .in('status', ['SUBMITTED', 'PENDING_SUPERVISOR', 'PENDING_HOD', 'PENDING_COMMITTEE', 'PENDING_MANAGEMENT'])
    .order('submitted_date', { ascending: true })

  if (error) throw error
  return data as GuestHouseReservation[]
}

export async function createReservation(reservation: Omit<GuestHouseReservation, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .insert(reservation)
    .select()
    .single()

  if (error) throw error
  return data as GuestHouseReservation
}

export async function updateReservationStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as GuestHouseReservation
}

export async function confirmReservation(id: string, confirmationNumber: string) {
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .update({
      status: 'CONFIRMED',
      confirmation_number: confirmationNumber
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as GuestHouseReservation
}

export async function updateReservation(id: string, updates: Partial<GuestHouseReservation>) {
  const { data, error } = await supabase
    .from('guest_house_reservations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as GuestHouseReservation
}

export async function cancelReservation(id: string) {
  return updateReservationStatus(id, 'CANCELLED')
}

// ============================================================================
// GUEST HOUSE APPROVAL QUERIES
// ============================================================================

export async function getReservationApprovals(reservationId: string) {
  const { data, error } = await supabase
    .from('guest_house_approvals')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('approved_date', { ascending: true })

  if (error) throw error
  return data as GuestHouseApproval[]
}

export async function getReservationApprovalByStage(reservationId: string, stage: string) {
  const { data, error } = await supabase
    .from('guest_house_approvals')
    .select('*')
    .eq('reservation_id', reservationId)
    .eq('approval_stage', stage)
    .single()

  if (error) throw error
  return data as GuestHouseApproval
}

export async function getPendingApprovalsForUser(userId: string) {
  const { data, error } = await supabase
    .from('guest_house_approvals')
    .select('*')
    .eq('approved_by', userId)
    .eq('status', 'PENDING')

  if (error) throw error
  return data as GuestHouseApproval[]
}

export async function createReservationApproval(approval: Omit<GuestHouseApproval, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('guest_house_approvals')
    .insert(approval)
    .select()
    .single()

  if (error) throw error
  return data as GuestHouseApproval
}

export async function updateApprovalStatus(id: string, status: string, comments?: string) {
  const { data, error } = await supabase
    .from('guest_house_approvals')
    .update({ status, comments, approved_date: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as GuestHouseApproval
}

export async function approveReservation(reservationId: string, approvedBy: string, stage: string, comments?: string) {
  return createReservationApproval({
    reservation_id: reservationId,
    approval_stage: stage as any,
    approved_by: approvedBy,
    approved_date: new Date().toISOString(),
    status: 'APPROVED',
    comments
  })
}

export async function rejectReservation(reservationId: string, approvedBy: string, stage: string, comments?: string) {
  return createReservationApproval({
    reservation_id: reservationId,
    approval_stage: stage as any,
    approved_by: approvedBy,
    approved_date: new Date().toISOString(),
    status: 'REJECTED',
    comments
  })
}

// ============================================================================
// GUEST HOUSE CHECK-IN/CHECK-OUT QUERIES
// ============================================================================

export async function getCheckInRecord(reservationId: string) {
  const { data, error } = await supabase
    .from('guest_house_check_ins')
    .select('*')
    .eq('reservation_id', reservationId)
    .single()

  if (error) throw error
  return data as GuestHouseCheckIn
}

export async function createCheckInRecord(checkin: Omit<GuestHouseCheckIn, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('guest_house_check_ins')
    .insert(checkin)
    .select()
    .single()

  if (error) throw error
  return data as GuestHouseCheckIn
}

export async function checkInGuest(reservationId: string, checkedInBy: string) {
  const { data, error } = await supabase
    .from('guest_house_check_ins')
    .insert({
      reservation_id: reservationId,
      actual_check_in_date: new Date().toISOString(),
      checked_in_by: checkedInBy
    })
    .select()
    .single()

  if (error) throw error
  return data as GuestHouseCheckIn
}

export async function checkOutGuest(reservationId: string, checkedOutBy: string, damageReport?: string) {
  const { data, error } = await supabase
    .from('guest_house_check_ins')
    .update({
      actual_check_out_date: new Date().toISOString(),
      checked_out_by: checkedOutBy,
      damage_report: damageReport
    })
    .eq('reservation_id', reservationId)
    .select()
    .single()

  if (error) throw error
  return data as GuestHouseCheckIn
}

// ============================================================================
// ADDITIONAL CHARGES QUERIES
// ============================================================================

export async function getAdditionalCharges(reservationId: string) {
  const { data, error } = await supabase
    .from('guest_house_additional_charges')
    .select('*')
    .eq('reservation_id', reservationId)

  if (error) throw error
  return data as GuestHouseAdditionalCharge[]
}

export async function addAdditionalCharge(charge: Omit<GuestHouseAdditionalCharge, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('guest_house_additional_charges')
    .insert(charge)
    .select()
    .single()

  if (error) throw error
  return data as GuestHouseAdditionalCharge
}

export async function getTotalAdditionalCharges(reservationId: string): Promise<number> {
  const charges = await getAdditionalCharges(reservationId)
  return charges.reduce((total, charge) => total + charge.total_amount, 0)
}

// ============================================================================
// GUEST HOUSE WORKFLOW HELPERS
// ============================================================================

export async function generateReservationNumber(): Promise<string> {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RES-${timestamp}-${random}`
}

export async function getReservationWithDetails(id: string) {
  const reservation = await getReservation(id)
  const approvals = await getReservationApprovals(id)
  const checkin = await getCheckInRecord(id).catch(() => null)
  const additionalCharges = await getAdditionalCharges(id)

  return {
    reservation,
    approvals,
    checkin,
    additionalCharges
  }
}

export async function calculateReservationCharges(roomRatePerNight: number, numberOfNights: number, mealCharges: number, serviceCharges: number, damageCharges: number, gstPercentage: number): Promise<{ gstAmount: number; totalAmount: number }> {
  const roomCharges = roomRatePerNight * numberOfNights
  const subtotal = roomCharges + mealCharges + serviceCharges + damageCharges
  const gstAmount = (subtotal * gstPercentage) / 100
  const totalAmount = subtotal + gstAmount

  return { gstAmount, totalAmount }
}
