import { createReservation, getReservationsByProposer, generateReservationNumber } from '@/db/queries/guest_house'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requiredStringFields = [
      'guest_name',
      'guest_gender',
      'guest_address',
      'guest_contact_number',
      'occupancy_type',
      'arrival_date',
      'departure_date',
      'purpose_of_booking',
      'room_type',
      'room_category',
      'proposer_name',
      'proposer_designation',
      'proposer_department',
      'proposer_identifier',
      'proposer_mobile',
      'application_date',
      'applicant_signature_name',
    ] as const

    for (const field of requiredStringFields) {
      const value = data[field]
      if (typeof value !== 'string' || !value.trim()) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    if (typeof data.number_of_guests !== 'number' || data.number_of_guests < 1) {
      return NextResponse.json({ error: 'number_of_guests must be at least 1' }, { status: 400 })
    }

    if (typeof data.number_of_rooms !== 'number' || data.number_of_rooms < 1) {
      return NextResponse.json({ error: 'number_of_rooms must be at least 1' }, { status: 400 })
    }

    if (data.undertaking_accepted !== true) {
      return NextResponse.json({ error: 'Undertaking must be accepted before submission.' }, { status: 400 })
    }

    if (data.competent_authority_approval_attached !== true) {
      return NextResponse.json({ error: 'Competent authority approval must be attached.' }, { status: 400 })
    }

    const allowedGenders = new Set(['Male', 'Female', 'Other'])
    if (!allowedGenders.has(data.guest_gender)) {
      return NextResponse.json({ error: 'Invalid guest_gender value.' }, { status: 400 })
    }

    const allowedOccupancyTypes = new Set(['Single', 'Double'])
    if (!allowedOccupancyTypes.has(data.occupancy_type)) {
      return NextResponse.json({ error: 'Invalid occupancy_type value.' }, { status: 400 })
    }

    const allowedRoomTypes = new Set(['EXECUTIVE_SUITE', 'BUSINESS_ROOM'])
    if (!allowedRoomTypes.has(data.room_type)) {
      return NextResponse.json({ error: 'Invalid room_type value.' }, { status: 400 })
    }

    const allowedRoomCategories = new Set(['A', 'B', 'B1', 'B2'])
    if (!allowedRoomCategories.has(data.room_category)) {
      return NextResponse.json({ error: 'Invalid room_category value.' }, { status: 400 })
    }

    if (data.room_type === 'EXECUTIVE_SUITE' && !['A', 'B'].includes(data.room_category)) {
      return NextResponse.json({ error: 'Executive suite supports categories A or B only.' }, { status: 400 })
    }

    if (data.room_type === 'BUSINESS_ROOM' && !['A', 'B1', 'B2'].includes(data.room_category)) {
      return NextResponse.json({ error: 'Business room supports categories A, B1, or B2 only.' }, { status: 400 })
    }

    const reservationNumber = await generateReservationNumber()

    const reservation = await createReservation({
      reservation_number: reservationNumber,
      proposer_id: user.id,
      proposer_name: data.proposer_name.trim(),
      proposer_designation: data.proposer_designation.trim(),
      proposer_department: data.proposer_department.trim(),
      proposer_identifier: data.proposer_identifier.trim(),
      proposer_mobile: data.proposer_mobile.trim(),
      guest_name: data.guest_name.trim(),
      guest_gender: data.guest_gender,
      guest_address: data.guest_address.trim(),
      guest_contact_number: data.guest_contact_number.trim(),
      number_of_guests: data.number_of_guests,
      number_of_rooms: data.number_of_rooms,
      occupancy_type: data.occupancy_type,
      arrival_date: data.arrival_date,
      arrival_time: typeof data.arrival_time === 'string' && data.arrival_time.trim() ? data.arrival_time : undefined,
      departure_date: data.departure_date,
      departure_time: typeof data.departure_time === 'string' && data.departure_time.trim() ? data.departure_time : undefined,
      purpose_of_booking: data.purpose_of_booking.trim(),
      room_type: data.room_type,
      room_category: data.room_category,
      boarding_lodging_payable_by_guest: data.boarding_lodging_payable_by_guest === true,
      project_budget_head: typeof data.project_budget_head === 'string' && data.project_budget_head.trim() ? data.project_budget_head.trim() : undefined,
      remarks: typeof data.remarks === 'string' && data.remarks.trim() ? data.remarks.trim() : undefined,
      competent_authority_approval_attached: true,
      application_date: data.application_date,
      applicant_signature_name: data.applicant_signature_name.trim(),
      undertaking_accepted: true,
      payment_status: 'PENDING',
      status: 'SUBMITTED',
      submitted_date: new Date().toISOString(),
      submitted_by: user.id
    })

    return NextResponse.json(reservation, { status: 201 })
  } catch (error) {
    console.error('Error creating reservation:', error)
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reservations = await getReservationsByProposer(user.id)
    return NextResponse.json(reservations)
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 })
  }
}
