import {
  addVehicleToApplication,
  createVehicleApplication,
  getVehicleApplicationsByApplicant,
  getVehicleTypeIdsByCodes,
} from '@/db/queries/vehicle_stickers'
import { isInstituteEmail } from '@/lib/access'
import { getAuthUserFromRequest, getOrCreateAppUser } from '@/lib/adminAccess'
import { NextRequest, NextResponse } from 'next/server'

type VehiclePayload = {
  vehicle_registration_number: string
  vehicle_type: '2W' | '4W'
  make_model: string
  colour: string
}

function resolveApplicantType(category?: string): 'Student' | 'Staff' {
  return category === 'REGULAR_STUDENT' ? 'Student' : 'Staff'
}

function normalizeDateInput(value?: string): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Accept native date input format.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // Accept dd-mm-yyyy or dd/mm/yyyy and convert to yyyy-mm-dd.
  const match = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)
  if (match) {
    const [, dd, mm, yyyy] = match
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const vehicles = Array.isArray(data.vehicles) ? (data.vehicles as VehiclePayload[]) : []

    if (
      !data.full_name
      || !data.designation
      || !data.applicant_identifier
      || !data.department_section
      || !data.residential_address
      || !data.mobile_number
      || !data.email
      || !data.driving_license_number
      || !data.driving_license_validity
      || !vehicles.length
    ) {
      return NextResponse.json({ error: 'Please fill all required fields.' }, { status: 400 })
    }

    const hasInvalidVehicle = vehicles.some((vehicle) => (
      !vehicle.vehicle_registration_number
      || !vehicle.make_model
      || !vehicle.colour
      || !['2W', '4W'].includes(vehicle.vehicle_type)
    ))

    if (hasInvalidVehicle) {
      return NextResponse.json({ error: 'Each vehicle row must include registration number, type, make/model and colour.' }, { status: 400 })
    }

    const auth = await getAuthUserFromRequest(request)
    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const appUser = await getOrCreateAppUser(auth.user)

    if (!isInstituteEmail(auth.user.email)) {
      return NextResponse.json({ error: 'Access denied for this form' }, { status: 403 })
    }

    const normalizedLicenseDate = normalizeDateInput(data.driving_license_validity)
    if (!normalizedLicenseDate) {
      return NextResponse.json({ error: 'Invalid driving license validity date format.' }, { status: 400 })
    }

    const vehicleTypeMap = await getVehicleTypeIdsByCodes(vehicles.map((vehicle) => vehicle.vehicle_type))
    for (const vehicle of vehicles) {
      if (!vehicleTypeMap.get(vehicle.vehicle_type)) {
        return NextResponse.json({ error: `Vehicle type ${vehicle.vehicle_type} is not configured.` }, { status: 500 })
      }
    }

    const applicantType = resolveApplicantType(data.applicant_category)

    const application = await createVehicleApplication({
      applicant_id: appUser.id,
      applicant_name: data.full_name,
      applicant_type: applicantType,
      designation: data.designation,
      applicant_identifier: data.applicant_identifier,
      department_section: data.department_section,
      address: data.residential_address,
      phone_number: data.mobile_number,
      email: data.email,
      driving_license_number: data.driving_license_number,
      driving_license_valid_upto: normalizedLicenseDate,
      status: 'SUBMITTED',
      submitted_date: new Date().toISOString(),
      submitted_by: appUser.id
    })

    for (let index = 0; index < vehicles.length; index += 1) {
      const vehicle = vehicles[index]
      await addVehicleToApplication({
        application_id: application.id,
        sequence_number: index + 1,
        vehicle_registration_number: vehicle.vehicle_registration_number,
        vehicle_type_id: vehicleTypeMap.get(vehicle.vehicle_type) as string,
        make_model: vehicle.make_model,
        colour: vehicle.colour,
        primary_vehicle: index === 0,
      })
    }

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Error creating vehicle application:', error)
    return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
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

    const applications = await getVehicleApplicationsByApplicant(appUser.id)
    return NextResponse.json(applications)
  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}
