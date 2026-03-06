import { createIdentityCardForm, getIdentityCardFormsByApplicant } from '@/db/queries/identity_card'
import { isInstituteEmail } from '@/lib/access'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    if (
      !data.employee_name
      || !data.employee_code
      || !data.designation
      || !data.employment_type
      || !data.department_section
      || !data.father_or_husband_name
      || !data.date_of_birth
      || !data.date_of_joining
      || !data.blood_group
      || !data.present_address
      || !data.office_phone
      || !data.mobile_number
      || !data.email_address
      || !data.request_type
      || !data.photo_url
    ) {
      return NextResponse.json({ error: 'Please fill all required fields.' }, { status: 400 })
    }

    if ((data.employment_type === 'TEMPORARY' || data.employment_type === 'CONTRACT') && !data.contract_upto) {
      return NextResponse.json({ error: 'Contract upto date is required for temporary/contract employees.' }, { status: 400 })
    }

    if ((data.request_type === 'RENEWAL' || data.request_type === 'DUPLICATE') && !data.renewal_reason) {
      return NextResponse.json({ error: 'Reason is required for renewal/duplicate applications.' }, { status: 400 })
    }

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isInstituteEmail(user.email)) {
      return NextResponse.json({ error: 'Access denied for this form' }, { status: 403 })
    }

    const identityCard = await createIdentityCardForm({
      applicant_id: user.id,
      applicant_name: data.employee_name,
      employee_code: data.employee_code,
      designation: data.designation,
      employment_type: data.employment_type,
      contract_upto: data.contract_upto || undefined,
      department_section: data.department_section,
      father_or_husband_name: data.father_or_husband_name,
      date_of_birth: data.date_of_birth,
      email_address: data.email_address,
      date_of_joining: data.date_of_joining,
      blood_group: data.blood_group,
      present_address: data.present_address,
      office_phone: data.office_phone,
      mobile_number: data.mobile_number,
      request_type: data.request_type,
      renewal_reason: data.renewal_reason || undefined,
      photo_document_url: data.photo_url || undefined,
      identity_card_type: 'EMPLOYEE_ID',
      status: 'SUBMITTED',
      submitted_date: new Date().toISOString(),
      submitted_by: user.id
    })

    return NextResponse.json(identityCard, { status: 201 })
  } catch (error) {
    console.error('Error creating identity card form:', error)
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 })
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

    if (!isInstituteEmail(user.email)) {
      return NextResponse.json([], { status: 200 })
    }

    const forms = await getIdentityCardFormsByApplicant(user.id)
    return NextResponse.json(forms)
  } catch (error) {
    console.error('Error fetching identity card forms:', error)
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 })
  }
}
