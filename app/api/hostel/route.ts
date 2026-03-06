import { createHostelForm, getHostelFormByStudent } from '@/db/queries/hostel'
import { isInstituteEmail } from '@/lib/access'
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

    if (!isInstituteEmail(user.email)) {
      return NextResponse.json({ error: 'Access denied for this form' }, { status: 403 })
    }

    const form = await createHostelForm({
      student_id: data.student_id,
      student_name: data.student_name,
      entry_number: data.entry_number,
      email: data.email,
      date_of_joining: new Date().toISOString().split('T')[0],
      course_name: data.course,
      parent_name: data.parent_name,
      parent_mobile_office: data.parent_contact,
      parent_email_office: data.parent_email || undefined,
      emergency_contact_number: data.emergency_contact_number,
      has_local_guardian: !!data.guardian_name,
      guardian_name: data.guardian_name || undefined,
      guardian_mobile_office: data.guardian_contact || undefined,
      guardian_email_office: data.guardian_email || undefined,
      hef_amount: 0,
      mess_security: 0,
      mess_admission_fee: 0,
      mess_charges: 0,
      undertaking_read: false,
      undertaking_accepted: false,
      status: 'SUBMITTED',
      submitted_date: new Date().toISOString(),
      submitted_by: user.id
    })

    return NextResponse.json(form, { status: 201 })
  } catch (error) {
    console.error('Error creating hostel form:', error)
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
    const studentId = new URL(request.url).searchParams.get('studentId')

    if (!isInstituteEmail(user.email)) {
      return NextResponse.json(null, { status: 200 })
    }

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
    }

    const form = await getHostelFormByStudent(studentId)
    return NextResponse.json(form)
  } catch (error) {
    console.error('Error fetching hostel form:', error)
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 })
  }
}
