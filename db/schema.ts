// ============================================================================
// DATABASE SCHEMA - TypeScript Definitions
// ============================================================================

// ============================================================================
// CORE TYPES
// ============================================================================

export type UserType = 'employee' | 'student' | 'faculty' | 'admin'
export type EmploymentType = 'Permanent' | 'Temporary' | 'Contract' | 'Project Staff' | 'Tech Staff' | 'Administrative'
export type EngagementType = 'Student' | 'Faculty' | 'Non-staff' | 'Tech staff' | 'Administrative'
export type Gender = 'Male' | 'Female' | 'Other'
export type ApplicantType = 'Student' | 'Staff'
export type VehicleType = '2W' | '4W'
export type HostelCategory = 'Boys' | 'Girls' | 'Mixed' | 'Faculty'
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'BLOCKED'
export type OccupancyType = 'Single' | 'Double' | 'Triple' | 'Multi'
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED'
export type BillingTo = 'Department' | 'Institute Fund' | 'Guest' | 'Project'

// ============================================================================
// CORE TABLES
// ============================================================================

export interface User {
  id: string
  email: string
  full_name: string
  user_type: UserType
  mobile_number?: string
  alternate_email?: string
  date_of_birth?: string
  blood_group?: string
  gender?: Gender
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  code?: string
  department_head_id?: string
  created_at: string
}

export interface Employee {
  id: string
  user_id: string
  employee_code: string
  designation: string
  employment_type: EmploymentType
  department_id: string
  date_of_joining: string
  date_of_exit?: string
  permanent_address?: string
  reporting_officer_id?: string
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  user_id: string
  entry_number: string
  course_name: string
  department_id: string
  date_of_joining: string
  date_of_exit?: string
  hostel_allocated: boolean
  parent_name?: string
  parent_mobile?: string
  parent_email?: string
  local_guardian_name?: string
  local_guardian_mobile?: string
  local_guardian_email?: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  description?: string
  permissions: Record<string, boolean>
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  department_id?: string
  assigned_at: string
}

// ============================================================================
// EMAIL ID REQUEST TYPES
// ============================================================================

export type EmailRequestStatus = 
  | 'SUBMITTED'
  | 'PENDING_LEVEL_1'
  | 'PENDING_LEVEL_2'
  | 'PENDING_LEVEL_3'
  | 'PENDING_OFFICER'
  | 'APPROVED_BY_OFFICER'
  | 'PENDING_AUTHORITY'
  | 'APPROVED_BY_AUTHORITY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CLOSED'

export type ApprovalStage = 'REPORTING_OFFICER' | 'FORWARDING_AUTHORITY' | 'IT_ADMIN' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3'
export type ApprovalStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'CLARIFICATION_NEEDED'

export interface EmailIdRequest {
  id: string
  applicant_id: string
  applicant_name: string
  applicant_title: string
  applicant_initials: string
  first_name: string
  last_name: string
  gender: Gender
  permanent_address: string
  organisation_id: string
  nature_of_engagement: EngagementType
  role: string
  department_section: string
  project_name?: string
  joining_date?: string
  anticipated_end_date?: string
  reporting_officer_name?: string
  reporting_officer_email?: string
  mobile_number: string
  alternate_email?: string
  consent_accepted: boolean
  forwarding_authority?: 'Academics' | 'Establishment' | 'Research & Development'
  authorised_signatory_name?: string
  authority_approval_date?: string
  approval_processed_by_user_id?: string
  approval_processed_by_name?: string
  approval_processed_at?: string
  approval_remark?: string
  current_approval_stage?: string
  approval_level?: number
  status: EmailRequestStatus
  assigned_email_id?: string
  email_created_date?: string
  email_removal_date?: string
  email_created_by?: string
  email_created_by_name?: string
  submitted_date: string
  submitted_by: string
  created_at: string
  updated_at: string
}

export interface EmailRequestApproval {
  id: string
  email_request_id: string
  approval_stage: ApprovalStage
  approved_by: string
  status: ApprovalStatus
  comments?: string
  approved_date: string
  created_at: string
}

export interface EmailPolicyAcknowledgment {
  id: string
  user_id: string
  email_request_id: string
  policy_version: string
  acknowledged: boolean
  acknowledged_date?: string
  created_at: string
}

// ============================================================================
// VEHICLE STICKER TYPES
// ============================================================================

export type VehicleApplicationStatus =
  | 'SUBMITTED'
  | 'PENDING_SUPERVISOR'
  | 'APPROVED_BY_SUPERVISOR'
  | 'PENDING_HOD'
  | 'APPROVED_BY_HOD'
  | 'PENDING_HOSTEL_WARDEN'
  | 'APPROVED_BY_HOSTEL_WARDEN'
  | 'PENDING_AFFAIRS'
  | 'APPROVED_BY_AFFAIRS'
  | 'PENDING_SECURITY'
  | 'STICKER_ISSUED'
  | 'REJECTED'
  | 'CLOSED'
  | 'EXPIRED'

export interface VehicleStickerApplication {
  id: string
  applicant_id: string
  applicant_name: string
  applicant_type: ApplicantType
  applicant_identifier?: string
  designation?: string
  department_section?: string
  address?: string
  phone_number: string
  email: string
  driving_license_number: string
  driving_license_valid_upto: string
  status: VehicleApplicationStatus
  approval_remark?: string
  approval_processed_by_user_id?: string
  approval_processed_by_name?: string
  approval_processed_at?: string
  current_approval_stage?: string
  approval_level?: number
  submitted_date: string
  submitted_by: string
  created_at: string
  updated_at: string
}

export interface ApplicationVehicle {
  id: string
  application_id: string
  sequence_number: number
  vehicle_registration_number: string
  vehicle_type_id: string
  make_model: string
  colour?: string
  primary_vehicle: boolean
  created_at: string
}

export interface VehicleSticker {
  id: string
  application_id: string
  vehicle_id: string
  sticker_number: string
  issue_date: string
  validity_period_days: number
  valid_until: string
  issued_by: string
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'LOST'
  created_at: string
  updated_at: string
}

export interface VehicleStickerApproval {
  id: string
  application_id: string
  approval_stage: 'SUPERVISOR' | 'HOD' | 'HOSTEL_WARDEN' | 'STUDENT_AFFAIRS' | 'SECURITY'
  approved_by: string
  status: ApprovalStatus
  comments?: string
  approved_date: string
  created_at: string
}

// ============================================================================
// HOSTEL TYPES
// ============================================================================

export type HostelFormStatus =
  | 'SUBMITTED'
  | 'UNDERTAKING_SIGNED'
  | 'UNDER_REVIEW'
  | 'PENDING_WARDEN'
  | 'APPROVED'
  | 'ROOM_ASSIGNED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'TERMINATED'

export interface Hostel {
  id: string
  name: string
  code?: string
  warden_id?: string
  category: HostelCategory
  total_rooms?: number
  description?: string
  created_at: string
}

export interface HostelRoom {
  id: string
  hostel_id: string
  room_number: string
  bed_capacity: number
  occupancy_type: OccupancyType
  status: RoomStatus
  created_at: string
}

export interface HostelInformationForm {
  id: string
  student_id: string
  hostel_id?: string
  room_id?: string
  student_name: string
  entry_number: string
  course_name: string
  department_id?: string
  email: string
  date_of_joining: string
  blood_group?: string
  category?: string
  emergency_contact_number?: string
  hef_amount: number
  mess_security: number
  mess_admission_fee: number
  mess_charges: number
  parent_name: string
  parent_office_address?: string
  parent_residence_address?: string
  parent_mobile_office?: string
  parent_mobile_residence?: string
  parent_telephone_office?: string
  parent_telephone_residence?: string
  parent_email_office?: string
  parent_email_residence?: string
  has_local_guardian: boolean
  guardian_name?: string
  guardian_office_address?: string
  guardian_residence_address?: string
  guardian_mobile_office?: string
  guardian_mobile_residence?: string
  guardian_telephone_office?: string
  guardian_telephone_residence?: string
  guardian_email_office?: string
  guardian_email_residence?: string
  undertaking_read: boolean
  undertaking_accepted: boolean
  undertaking_signed_date?: string
  status: HostelFormStatus
  submitted_date: string
  submitted_by: string
  created_at: string
  updated_at: string
}

export interface HostelInformationApproval {
  id: string
  hostel_form_id: string
  approval_stage: 'HOSTEL_MANAGEMENT' | 'WARDEN'
  approved_by: string
  status: ApprovalStatus
  comments?: string
  approved_date: string
  created_at: string
}

export interface HostelRoomAssignment {
  id: string
  hostel_form_id: string
  room_id: string
  assigned_date: string
  checkout_date?: string
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  reason?: string
  created_at: string
}

export interface HostelMessAssignment {
  id: string
  hostel_form_id: string
  mess_enabled: boolean
  mess_start_date?: string
  mess_end_date?: string
  created_at: string
}

// ============================================================================
// IDENTITY CARD FORM TYPES
// ============================================================================

export interface IdentityCardForm {
  id: string
  applicant_id: string
  applicant_name: string
  employee_code: string
  designation: string
  employment_type: 'PERMANENT' | 'TEMPORARY' | 'CONTRACT'
  contract_upto?: string
  department_section: string
  father_or_husband_name: string
  date_of_birth: string
  email_address: string
  date_of_joining: string
  blood_group: string
  present_address: string
  office_phone: string
  mobile_number: string
  request_type: 'FRESH' | 'RENEWAL' | 'DUPLICATE'
  renewal_reason?: string
  photo_document_url: string
  identity_card_type: 'EMPLOYEE_ID'
  status: 'SUBMITTED' | 'APPROVED_HOD' | 'APPROVED_DIRECTOR' | 'REJECTED' | 'ISSUED' | 'CANCELLED'
  approval_remark?: string
  approval_processed_by_user_id?: string
  approval_processed_by_name?: string
  approval_processed_at?: string
  current_approval_stage?: string
  approval_level?: number
  submitted_date: string
  submitted_by: string
  card_issued_date?: string
  card_number?: string
  created_at: string
  updated_at: string
}

export interface IdentityCardApproval {
  id: string
  identity_card_form_id: string
  approver_id: string
  approver_role: 'HOD' | 'DIRECTOR'
  status: 'APPROVED' | 'REJECTED'
  comments?: string
  approved_date?: string
  created_at: string
}

// ============================================================================
// UNDERTAKING FORM TYPES
// ============================================================================

export interface UndertakingForm {
  id: string
  applicant_id: string
  student_name: string
  entry_number?: string
  course_name: string
  department_name: string
  hostel_room_number: string
  email_address: string
  date_of_joining: string
  hef_amount: number
  mess_security_fee: number
  mess_admission_fee: number
  mess_charges: number
  blood_group: string
  category: string
  emergency_contact_number: string
  parent_office_address: string
  parent_residence_address: string
  parent_mobile_number: string
  parent_telephone_number: string
  parent_email_id: string
  local_guardian_office_address?: string
  local_guardian_residence_address?: string
  local_guardian_mobile_number?: string
  local_guardian_telephone_number?: string
  local_guardian_email_id?: string
  declaration_accepted: boolean
  form_date: string
  student_signature_name: string
  parent_signature_name: string
  status: 'SUBMITTED' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED'
  reviewer_remarks?: string
  reviewed_by_user_id?: string
  reviewed_by_name?: string
  reviewed_at?: string
  submitted_date: string
  submitted_by: string
  created_at: string
  updated_at: string
}

export interface UndertakingAcceptance {
  id: string
  undertaking_form_id: string
  accepted_by: string
  accepted_date: string
  acceptance_notes?: string
  created_at: string
}

// ============================================================================
// GUEST HOUSE TYPES
// ============================================================================

export type GuestHouseReservationStatus =
  | 'SUBMITTED'
  | 'PENDING_SUPERVISOR'
  | 'APPROVED_BY_SUPERVISOR'
  | 'PENDING_HOD'
  | 'APPROVED_BY_HOD'
  | 'PENDING_COMMITTEE'
  | 'APPROVED_BY_COMMITTEE'
  | 'PENDING_MANAGEMENT'
  | 'CONFIRMED'
  | 'CHECK_IN'
  | 'ACTIVE'
  | 'CHECK_OUT'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'WAITLISTED'

export interface GuestHouse {
  id: string
  name: string
  code?: string
  administrator_id?: string
  phone_number?: string
  email?: string
  address?: string
  description?: string
  total_rooms?: number
  active: boolean
  created_at: string
}

export interface GuestRoomCategory {
  id: string
  code: string
  name: string
  description?: string
  nightly_rate: number
  occupancy_capacity: number
  created_at: string
}

export interface GuestHouseRoom {
  id: string
  guest_house_id: string
  room_number: string
  category_id: string
  status: RoomStatus
  occupancy_capacity: number
  amenities: Record<string, any>
  created_at: string
}

export interface GuestHouseReservation {
  id: string
  reservation_number: string
  proposer_id: string
  proposer_name: string
  proposer_designation: string
  proposer_department: string
  proposer_identifier: string
  proposer_mobile: string
  guest_name: string
  guest_gender: Gender
  guest_address: string
  guest_contact_number: string
  number_of_guests: number
  number_of_rooms: number
  occupancy_type: 'Single' | 'Double'
  arrival_date: string
  arrival_time?: string
  departure_date: string
  departure_time?: string
  purpose_of_booking: string
  room_type: 'EXECUTIVE_SUITE' | 'BUSINESS_ROOM'
  room_category: 'A' | 'B' | 'B1' | 'B2'
  boarding_lodging_payable_by_guest: boolean
  project_budget_head?: string
  remarks?: string
  competent_authority_approval_attached: boolean
  application_date: string
  applicant_signature_name: string
  undertaking_accepted: boolean
  payment_status: PaymentStatus
  status: GuestHouseReservationStatus
  submitted_date: string
  submitted_by: string
  created_at: string
  updated_at: string
}

export interface GuestHouseApproval {
  id: string
  reservation_id: string
  approval_stage: 'SUPERVISOR' | 'HOD' | 'COMMITTEE' | 'MANAGEMENT'
  approved_by: string
  status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'CONDITIONAL_APPROVAL'
  comments?: string
  approved_date: string
  created_at: string
}

export interface GuestHouseCheckIn {
  id: string
  reservation_id: string
  actual_check_in_date?: string
  actual_check_out_date?: string
  room_condition_checkin?: string
  room_condition_checkout?: string
  damage_report?: string
  checked_in_by?: string
  checked_out_by?: string
  created_at: string
}

export interface GuestHouseAdditionalCharge {
  id: string
  reservation_id: string
  service_type: 'Extra Bed' | 'Meal' | 'Laundry' | 'Late Checkout' | 'Special Service'
  quantity: number
  unit_rate: number
  total_amount: number
  added_date: string
  created_at: string
}

// ============================================================================
// DATABASE SCHEMA COLLECTION
// ============================================================================

export interface Database {
  public: {
    Tables: {
      // Core
      users: { Row: User; Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>; Update: Partial<User> }
      departments: { Row: Department; Insert: Omit<Department, 'id' | 'created_at'>; Update: Partial<Department> }
      employees: { Row: Employee; Insert: Omit<Employee, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Employee> }
      students: { Row: Student; Insert: Omit<Student, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Student> }
      roles: { Row: Role; Insert: Omit<Role, 'id' | 'created_at'>; Update: Partial<Role> }
      user_roles: { Row: UserRole; Insert: Omit<UserRole, 'id' | 'assigned_at'>; Update: Partial<UserRole> }
      
      // Email ID Requests
      email_id_requests: { Row: EmailIdRequest; Insert: Omit<EmailIdRequest, 'id' | 'created_at' | 'updated_at'>; Update: Partial<EmailIdRequest> }
      email_request_approvals: { Row: EmailRequestApproval; Insert: Omit<EmailRequestApproval, 'id' | 'created_at'>; Update: Partial<EmailRequestApproval> }
      email_policy_acknowledgments: { Row: EmailPolicyAcknowledgment; Insert: Omit<EmailPolicyAcknowledgment, 'id' | 'created_at'>; Update: Partial<EmailPolicyAcknowledgment> }
      
      // Vehicle Stickers
      vehicle_sticker_applications: { Row: VehicleStickerApplication; Insert: Omit<VehicleStickerApplication, 'id' | 'created_at' | 'updated_at'>; Update: Partial<VehicleStickerApplication> }
      application_vehicles: { Row: ApplicationVehicle; Insert: Omit<ApplicationVehicle, 'id' | 'created_at'>; Update: Partial<ApplicationVehicle> }
      vehicle_stickers: { Row: VehicleSticker; Insert: Omit<VehicleSticker, 'id' | 'created_at' | 'updated_at'>; Update: Partial<VehicleSticker> }
      vehicle_sticker_approvals: { Row: VehicleStickerApproval; Insert: Omit<VehicleStickerApproval, 'id' | 'created_at'>; Update: Partial<VehicleStickerApproval> }
      
      // Hostel
      hostels: { Row: Hostel; Insert: Omit<Hostel, 'id' | 'created_at'>; Update: Partial<Hostel> }
      hostel_rooms: { Row: HostelRoom; Insert: Omit<HostelRoom, 'id' | 'created_at'>; Update: Partial<HostelRoom> }
      hostel_information_forms: { Row: HostelInformationForm; Insert: Omit<HostelInformationForm, 'id' | 'created_at' | 'updated_at'>; Update: Partial<HostelInformationForm> }
      hostel_information_approvals: { Row: HostelInformationApproval; Insert: Omit<HostelInformationApproval, 'id' | 'created_at'>; Update: Partial<HostelInformationApproval> }
      hostel_room_assignments: { Row: HostelRoomAssignment; Insert: Omit<HostelRoomAssignment, 'id' | 'created_at'>; Update: Partial<HostelRoomAssignment> }
      hostel_mess_assignments: { Row: HostelMessAssignment; Insert: Omit<HostelMessAssignment, 'id' | 'created_at'>; Update: Partial<HostelMessAssignment> }
      
      // Guest House
      guest_houses: { Row: GuestHouse; Insert: Omit<GuestHouse, 'id' | 'created_at'>; Update: Partial<GuestHouse> }
      guest_room_categories: { Row: GuestRoomCategory; Insert: Omit<GuestRoomCategory, 'id' | 'created_at'>; Update: Partial<GuestRoomCategory> }
      guest_house_rooms: { Row: GuestHouseRoom; Insert: Omit<GuestHouseRoom, 'id' | 'created_at'>; Update: Partial<GuestHouseRoom> }
      guest_house_reservations: { Row: GuestHouseReservation; Insert: Omit<GuestHouseReservation, 'id' | 'created_at' | 'updated_at'>; Update: Partial<GuestHouseReservation> }
      guest_house_approvals: { Row: GuestHouseApproval; Insert: Omit<GuestHouseApproval, 'id' | 'created_at'>; Update: Partial<GuestHouseApproval> }
      guest_house_check_ins: { Row: GuestHouseCheckIn; Insert: Omit<GuestHouseCheckIn, 'id' | 'created_at'>; Update: Partial<GuestHouseCheckIn> }
      guest_house_additional_charges: { Row: GuestHouseAdditionalCharge; Insert: Omit<GuestHouseAdditionalCharge, 'id' | 'created_at'>; Update: Partial<GuestHouseAdditionalCharge> }
      
      // Identity Card
      identity_card_forms: { Row: IdentityCardForm; Insert: Omit<IdentityCardForm, 'id' | 'created_at' | 'updated_at'>; Update: Partial<IdentityCardForm> }
      identity_card_approvals: { Row: IdentityCardApproval; Insert: Omit<IdentityCardApproval, 'id' | 'created_at'>; Update: Partial<IdentityCardApproval> }
      
      // Undertaking
      undertaking_forms: { Row: UndertakingForm; Insert: Omit<UndertakingForm, 'id' | 'created_at' | 'updated_at'>; Update: Partial<UndertakingForm> }
      undertaking_acceptances: { Row: UndertakingAcceptance; Insert: Omit<UndertakingAcceptance, 'id' | 'created_at'>; Update: Partial<UndertakingAcceptance> }
    }
  }
}
