-- ============================================================================
-- GUEST HOUSE RESERVATION TABLES
-- ============================================================================

-- Guest house statuses
CREATE TABLE IF NOT EXISTS guest_house_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Room categories
CREATE TABLE IF NOT EXISTS guest_room_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  nightly_rate DECIMAL(10, 2) NOT NULL,
  occupancy_capacity INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Purpose of booking
CREATE TABLE IF NOT EXISTS booking_purposes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Approver categories (for room eligibility)
CREATE TABLE IF NOT EXISTS guest_approver_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  budget_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Guest houses
CREATE TABLE IF NOT EXISTS guest_houses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(20),
  administrator_id UUID REFERENCES users(id),
  phone_number VARCHAR(20),
  email TEXT,
  address TEXT,
  description TEXT,
  total_rooms INT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Guest house rooms
CREATE TABLE IF NOT EXISTS guest_house_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_house_id UUID NOT NULL REFERENCES guest_houses(id),
  room_number VARCHAR(20) NOT NULL,
  category_id UUID NOT NULL REFERENCES guest_room_categories(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED')),
  occupancy_capacity INT DEFAULT 2,
  amenities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(guest_house_id, room_number)
);

-- Guest house reservations
CREATE TABLE IF NOT EXISTS guest_house_reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Proposer/Applicant
  proposer_id UUID NOT NULL REFERENCES users(id),
  proposer_name TEXT NOT NULL,
  proposer_department_id UUID REFERENCES departments(id),
  proposer_designation VARCHAR(100),
  proposer_mobile VARCHAR(20),
  proposer_email TEXT NOT NULL,
  
  -- Guest Information
  guest_name TEXT NOT NULL,
  guest_gender VARCHAR(20),
  guest_address TEXT,
  guest_contact_number VARCHAR(20),
  guest_email TEXT,
  
  -- Reservation Details
  booking_purpose_id UUID NOT NULL REFERENCES booking_purposes(id),
  purpose_description TEXT,
  
  check_in_date DATE NOT NULL,
  check_in_time TIME,
  check_out_date DATE NOT NULL,
  check_out_time TIME,
  
  number_of_guests INT NOT NULL,
  number_of_rooms INT NOT NULL,
  
  -- Room Assignment
  room_id UUID REFERENCES guest_house_rooms(id),
  category_id UUID REFERENCES guest_room_categories(id),
  
  -- Special Requirements
  special_requirements TEXT,
  meal_requirements TEXT,
  
  -- Billing Information
  room_rate_per_night DECIMAL(10, 2),
  number_of_nights INT,
  room_charges DECIMAL(10, 2),
  meal_charges DECIMAL(10, 2) DEFAULT 0,
  service_charges DECIMAL(10, 2) DEFAULT 0,
  damage_charges DECIMAL(10, 2) DEFAULT 0,
  gst_percentage DECIMAL(5, 2) DEFAULT 0,
  gst_amount DECIMAL(10, 2) DEFAULT 0,
  total_charges DECIMAL(10, 2),
  
  -- Billing Details
  billing_department_id UUID REFERENCES departments(id),
  billing_to VARCHAR(100) CHECK (billing_to IN ('Department', 'Institute Fund', 'Guest', 'Project')),
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('PENDING', 'PARTIAL', 'COMPLETED')),
  payment_date TIMESTAMP,
  
  -- Status & Tracking
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' REFERENCES guest_house_statuses(code),
  confirmation_number VARCHAR(50),
  
  submitted_date TIMESTAMP DEFAULT NOW(),
  submitted_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Guest house reservation approvals
CREATE TABLE IF NOT EXISTS guest_house_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES guest_house_reservations(id) ON DELETE CASCADE,
  approval_stage VARCHAR(100) NOT NULL CHECK (approval_stage IN ('SUPERVISOR', 'HOD', 'COMMITTEE', 'MANAGEMENT')),
  approved_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('APPROVED', 'REJECTED', 'PENDING', 'CONDITIONAL_APPROVAL')),
  comments TEXT,
  approved_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Guest check-in/check-out records
CREATE TABLE IF NOT EXISTS guest_house_check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES guest_house_reservations(id),
  actual_check_in_date TIMESTAMP,
  actual_check_out_date TIMESTAMP,
  room_condition_checkin TEXT,
  room_condition_checkout TEXT,
  damage_report TEXT,
  checked_in_by UUID REFERENCES users(id),
  checked_out_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Additional services & charges
CREATE TABLE IF NOT EXISTS guest_house_additional_charges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL REFERENCES guest_house_reservations(id),
  service_type VARCHAR(100) NOT NULL CHECK (service_type IN ('Extra Bed', 'Meal', 'Laundry', 'Late Checkout', 'Special Service')),
  quantity INT DEFAULT 1,
  unit_rate DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  added_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_guest_reservations_status ON guest_house_reservations(status);
CREATE INDEX IF NOT EXISTS idx_guest_reservations_proposer_id ON guest_house_reservations(proposer_id);
CREATE INDEX IF NOT EXISTS idx_guest_reservations_room_id ON guest_house_reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_guest_reservations_check_in ON guest_house_reservations(check_in_date);
CREATE INDEX IF NOT EXISTS idx_guest_rooms_guest_house_id ON guest_house_rooms(guest_house_id);
CREATE INDEX IF NOT EXISTS idx_guest_rooms_status ON guest_house_rooms(status);
CREATE INDEX IF NOT EXISTS idx_guest_approvals_reservation_id ON guest_house_approvals(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_checkins_reservation_id ON guest_house_check_ins(reservation_id);

-- Enable RLS
ALTER TABLE guest_house_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_house_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_house_check_ins ENABLE ROW LEVEL SECURITY;

-- Populate guest house statuses
INSERT INTO guest_house_statuses (code, label, description) VALUES
('SUBMITTED', 'Submitted', 'Reservation request submitted'),
('PENDING_SUPERVISOR', 'Pending Supervisor', 'Awaiting supervisor review'),
('APPROVED_BY_SUPERVISOR', 'Supervisor Approved', 'Supervisor recommended'),
('PENDING_HOD', 'Pending HOD', 'Awaiting department head approval'),
('APPROVED_BY_HOD', 'HOD Approved', 'Department head approved'),
('PENDING_COMMITTEE', 'Pending Committee', 'Awaiting committee review'),
('APPROVED_BY_COMMITTEE', 'Committee Approved', 'Committee approved'),
('PENDING_MANAGEMENT', 'Pending Management', 'Awaiting management confirmation'),
('CONFIRMED', 'Confirmed', 'Booking confirmed'),
('CHECK_IN', 'Check In', 'Guest checked in'),
('ACTIVE', 'Active', 'Guest staying'),
('CHECK_OUT', 'Check Out', 'Guest checkout initiated'),
('COMPLETED', 'Completed', 'Guest left, billing complete'),
('REJECTED', 'Rejected', 'Reservation rejected'),
('CANCELLED', 'Cancelled', 'Reservation cancelled'),
('NO_SHOW', 'No Show', 'Guest did not arrive'),
('WAITLISTED', 'Waitlisted', 'On waitlist for dates')
ON CONFLICT (code) DO NOTHING;

-- Populate room categories
INSERT INTO guest_room_categories (code, name, description, nightly_rate, occupancy_capacity) VALUES
('EXEC_SUITE', 'Executive Suite', 'Premium accommodation with full amenities', 700.00, 2),
('BUS_ROOM', 'Business Room', 'Standard business accommodation', 450.00, 2),
('STD_ROOM', 'Standard Room', 'Basic room with essential amenities', 300.00, 2)
ON CONFLICT (code) DO NOTHING;

-- Populate booking purposes
INSERT INTO booking_purposes (code, name, description) VALUES
('MEETING', 'Official Meeting', 'Official meetings and gatherings'),
('CONFERENCE', 'Conference', 'Conference and seminars'),
('WORKSHOP', 'Workshop', 'Training and workshops'),
('TRAINING', 'Training', 'Training programs'),
('COLLAB', 'Research Collaboration', 'Research collaboration visits'),
('FAMILY', 'Family Visit', 'Family member visits'),
('OTHER', 'Other', 'Other purposes')
ON CONFLICT (code) DO NOTHING;
