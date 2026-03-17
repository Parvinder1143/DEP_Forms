import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getOrCreateAppUser } from '@/lib/adminAccess'
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

    const appUser = await getOrCreateAppUser(user)

    const requiredStringFields = [
      'applicant_title',
      'applicant_initials',
      'first_name',
      'last_name',
      'gender',
      'permanent_address',
      'organisation_id',
      'nature_of_engagement',
      'role',
      'department_section',
      'mobile_number',
    ] as const

    for (const field of requiredStringFields) {
      const value = data[field]
      if (typeof value !== 'string' || !value.trim()) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    if (data.consent_accepted !== true) {
      return NextResponse.json({ error: 'Consent must be accepted before submission.' }, { status: 400 })
    }

    const allowedEngagementTypes = new Set(['Student', 'Faculty', 'Non-staff', 'Tech staff', 'Administrative'])
    if (!allowedEngagementTypes.has(data.nature_of_engagement)) {
      return NextResponse.json({ error: 'Invalid nature_of_engagement value.' }, { status: 400 })
    }

    const allowedTitles = new Set(['Dr.', 'Mr.', 'Ms.'])
    if (!allowedTitles.has(data.applicant_title)) {
      return NextResponse.json({ error: 'Invalid applicant_title value.' }, { status: 400 })
    }

    const isTempOrProjectStaff = data.nature_of_engagement === 'Tech staff'
    if (isTempOrProjectStaff) {
      const tempOnlyRequiredFields = [
        'joining_date',
        'reporting_officer_name',
        'reporting_officer_email',
      ] as const

      for (const field of tempOnlyRequiredFields) {
        const value = data[field]
        if (typeof value !== 'string' || !value.trim()) {
          return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
        }
      }
    }

    const applicantName = [data.applicant_title, data.applicant_initials, data.first_name, data.last_name]
      .map((part: string) => part.trim())
      .filter(Boolean)
      .join(' ')

    const nowIso = new Date().toISOString()

    const safeJoiningDate = isTempOrProjectStaff && typeof data.joining_date === 'string' && data.joining_date.trim()
      ? data.joining_date
      : nowIso.slice(0, 10)
    const safeReportingOfficerName = isTempOrProjectStaff && typeof data.reporting_officer_name === 'string' && data.reporting_officer_name.trim()
      ? data.reporting_officer_name.trim()
      : 'NOT_REQUIRED'
    const safeReportingOfficerEmail = isTempOrProjectStaff && typeof data.reporting_officer_email === 'string' && data.reporting_officer_email.trim()
      ? data.reporting_officer_email.trim()
      : 'not.required@iitropar.ac.in'

    const newSchemaPayload = {
      applicant_id: appUser.id,
      applicant_name: applicantName,
      applicant_title: data.applicant_title.trim(),
      applicant_initials: data.applicant_initials.trim(),
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      gender: data.gender,
      permanent_address: data.permanent_address.trim(),
      organisation_id: data.organisation_id.trim(),
      nature_of_engagement: data.nature_of_engagement,
      role: data.role.trim(),
      department_section: data.department_section.trim(),
      project_name: isTempOrProjectStaff && typeof data.project_name === 'string' && data.project_name.trim()
        ? data.project_name.trim()
        : undefined,
      joining_date: safeJoiningDate,
      anticipated_end_date: isTempOrProjectStaff && typeof data.anticipated_end_date === 'string' && data.anticipated_end_date.trim()
        ? data.anticipated_end_date
        : undefined,
      reporting_officer_name: safeReportingOfficerName,
      reporting_officer_email: safeReportingOfficerEmail,
      mobile_number: data.mobile_number.trim(),
      alternate_email: typeof data.alternate_email === 'string' && data.alternate_email.trim() ? data.alternate_email.trim() : undefined,
      consent_accepted: true,
      status: 'SUBMITTED' as const,
      submitted_date: nowIso,
      submitted_by: appUser.id
    }

    let emailRequest: unknown = null

    const insertWithAdmin = async (payload: Record<string, unknown>) => {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('email_id_requests')
        .insert(payload)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return inserted
    }

    try {
      emailRequest = await insertWithAdmin(newSchemaPayload)
    } catch (dbError) {
      const msg = dbError instanceof Error ? dbError.message : String(dbError)
      const schemaMismatch = /column .* does not exist|has no field|schema cache|PGRST204/i.test(msg)

      if (!schemaMismatch) {
        throw dbError
      }

      // Backward-compatible fallback for older DB schema before migration 015.
      const oldSchemaPayload = {
        applicant_id: appUser.id,
        applicant_name: applicantName,
        applicant_initials: data.applicant_initials.trim(),
        gender: data.gender,
        permanent_address: data.permanent_address.trim(),
        organisation_id: data.organisation_id.trim(),
        nature_of_engagement: data.nature_of_engagement,
        role: data.role.trim(),
        department_id: null,
        project_name: isTempOrProjectStaff && typeof data.project_name === 'string' && data.project_name.trim()
          ? data.project_name.trim()
          : undefined,
        joining_date: safeJoiningDate,
        anticipated_end_date: isTempOrProjectStaff && typeof data.anticipated_end_date === 'string' && data.anticipated_end_date.trim()
          ? data.anticipated_end_date
          : undefined,
        reporting_officer_name: safeReportingOfficerName,
        reporting_officer_email: safeReportingOfficerEmail,
        mobile_number: data.mobile_number.trim(),
        alternate_email: typeof data.alternate_email === 'string' && data.alternate_email.trim() ? data.alternate_email.trim() : undefined,
        status: 'SUBMITTED' as const,
        submitted_date: nowIso,
        submitted_by: appUser.id,
      }

      emailRequest = await insertWithAdmin(oldSchemaPayload)
    }

    return NextResponse.json(emailRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating email request:', error)
    const message = error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message)
      : 'Failed to create request'
    return NextResponse.json({ error: message }, { status: 500 })
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

    const appUser = await getOrCreateAppUser(user)

    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('email_id_requests')
      .select('*')
      .eq('applicant_id', appUser.id)
      .order('submitted_date', { ascending: false })

    if (requestsError) {
      throw requestsError
    }

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching email requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
