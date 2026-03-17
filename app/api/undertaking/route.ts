import { createUndertakingForm, getUndertakingFormsByApplicant } from '@/db/queries/undertaking'
import { isInstituteEmail } from '@/lib/access'
import { getAuthUserFromRequest, getOrCreateAppUser } from '@/lib/adminAccess'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (
      !data.student_name
      || !data.entry_number
      || !data.course_name
      || !data.department_name
      || !data.hostel_room_number
      || !data.email_address
      || !data.date_of_joining
      || data.hef_amount === undefined
      || data.mess_security_fee === undefined
      || data.mess_admission_fee === undefined
      || data.mess_charges === undefined
      || !data.blood_group
      || !data.category
      || !data.emergency_contact_number
      || !data.parent_office_address
      || !data.parent_residence_address
      || !data.parent_mobile_number
      || !data.parent_telephone_number
      || !data.parent_email_id
      || !data.student_signature_name
      || !data.parent_signature_name
    ) {
      return NextResponse.json({ error: 'Please fill all required fields.' }, { status: 400 })
    }

    if (!data.declaration_accepted) {
      return NextResponse.json({ error: 'Declaration must be accepted before submission.' }, { status: 400 })
    }

    const auth = await getAuthUserFromRequest(request)
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const appUser = await getOrCreateAppUser(auth.user)

    if (!isInstituteEmail(auth.user.email)) {
      return NextResponse.json({ error: 'Access denied for this form' }, { status: 403 })
    }

    const hefAmount = Number(data.hef_amount)
    const messSecurityFee = Number(data.mess_security_fee)
    const messAdmissionFee = Number(data.mess_admission_fee)
    const messCharges = Number(data.mess_charges)

    if ([hefAmount, messSecurityFee, messAdmissionFee, messCharges].some((value) => Number.isNaN(value))) {
      return NextResponse.json({ error: 'Fee fields must be valid numbers.' }, { status: 400 })
    }

    const undertaking = await createUndertakingForm({
      applicant_id: appUser.id,
      student_name: data.student_name,
      entry_number: data.entry_number || undefined,
      course_name: data.course_name,
      department_name: data.department_name,
      hostel_room_number: data.hostel_room_number,
      email_address: data.email_address,
      date_of_joining: data.date_of_joining,
      hef_amount: hefAmount,
      mess_security_fee: messSecurityFee,
      mess_admission_fee: messAdmissionFee,
      mess_charges: messCharges,
      blood_group: data.blood_group,
      category: data.category,
      emergency_contact_number: data.emergency_contact_number,
      parent_office_address: data.parent_office_address,
      parent_residence_address: data.parent_residence_address,
      parent_mobile_number: data.parent_mobile_number,
      parent_telephone_number: data.parent_telephone_number,
      parent_email_id: data.parent_email_id,
      local_guardian_office_address: data.local_guardian_office_address || undefined,
      local_guardian_residence_address: data.local_guardian_residence_address || undefined,
      local_guardian_mobile_number: data.local_guardian_mobile_number || undefined,
      local_guardian_telephone_number: data.local_guardian_telephone_number || undefined,
      local_guardian_email_id: data.local_guardian_email_id || undefined,
      declaration_accepted: data.declaration_accepted || false,
      form_date: data.form_date || new Date().toISOString().split('T')[0],
      student_signature_name: data.student_signature_name,
      parent_signature_name: data.parent_signature_name,
      status: 'SUBMITTED',
      submitted_date: new Date().toISOString(),
      submitted_by: appUser.id
    })

    return NextResponse.json(undertaking, { status: 201 })
  } catch (error) {
    console.error('Error creating undertaking form:', error)
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUserFromRequest(request)
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const appUser = await getOrCreateAppUser(auth.user)

    if (!isInstituteEmail(auth.user.email)) {
      return NextResponse.json([], { status: 200 })
    }

    const forms = await getUndertakingFormsByApplicant(appUser.id)
    return NextResponse.json(forms)
  } catch (error) {
    console.error('Error fetching undertaking forms:', error)
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 })
  }
}
