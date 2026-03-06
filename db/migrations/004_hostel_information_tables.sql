-- ============================================================================
-- HOSTEL INFORMATION & UNDERTAKING TABLES
-- ============================================================================

-- Hostel information statuses
CREATE TABLE IF NOT EXISTS hostel_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hostels
CREATE TABLE IF NOT EXISTS hostels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  code VARCHAR(20),
  warden_id UUID REFERENCES users(id),
  category VARCHAR(50) NOT NULL CHECK (category IN ('Boys', 'Girls', 'Mixed', 'Faculty')),
  total_rooms INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hostel rooms
CREATE TABLE IF NOT EXISTS hostel_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_id UUID NOT NULL REFERENCES hostels(id),
  room_number VARCHAR(20) NOT NULL,
  bed_capacity INT DEFAULT 1,
  occupancy_type VARCHAR(50) NOT NULL CHECK (occupancy_type IN ('Single', 'Double', 'Triple', 'Multi')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(hostel_id, room_number)
);

-- Hostel information forms
CREATE TABLE IF NOT EXISTS hostel_information_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  hostel_id UUID REFERENCES hostels(id),
  room_id UUID REFERENCES hostel_rooms(id),
  
  -- Student Details (Denormalized for form)
  student_name TEXT NOT NULL,
  entry_number VARCHAR(50) NOT NULL,
  course_name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  email TEXT NOT NULL,
  date_of_joining DATE NOT NULL,
  
  -- Blood & Health Info
  blood_group VARCHAR(5),
  category VARCHAR(50),
  emergency_contact_number VARCHAR(20),
  
  -- Financial Information
  hef_amount DECIMAL(10, 2) DEFAULT 0,
  mess_security DECIMAL(10, 2) DEFAULT 0,
  mess_admission_fee DECIMAL(10, 2) DEFAULT 0,
  mess_charges DECIMAL(10, 2) DEFAULT 0,
  
  -- Parent Information
  parent_name TEXT NOT NULL,
  parent_office_address TEXT,
  parent_residence_address TEXT,
  parent_mobile_office VARCHAR(20),
  parent_mobile_residence VARCHAR(20),
  parent_telephone_office VARCHAR(20),
  parent_telephone_residence VARCHAR(20),
  parent_email_office TEXT,
  parent_email_residence TEXT,
  
  -- Local Guardian Information
  has_local_guardian BOOLEAN DEFAULT FALSE,
  guardian_name TEXT,
  guardian_office_address TEXT,
  guardian_residence_address TEXT,
  guardian_mobile_office VARCHAR(20),
  guardian_mobile_residence VARCHAR(20),
  guardian_telephone_office VARCHAR(20),
  guardian_telephone_residence VARCHAR(20),
  guardian_email_office TEXT,
  guardian_email_residence TEXT,
  
  -- Undertaking
  undertaking_read BOOLEAN NOT NULL DEFAULT FALSE,
  undertaking_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  undertaking_signed_date TIMESTAMP,
  
  -- Form Status
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' REFERENCES hostel_statuses(code),
  
  -- Tracking
  submitted_date TIMESTAMP DEFAULT NOW(),
  submitted_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hostel information approvals (audit trail)
CREATE TABLE IF NOT EXISTS hostel_information_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_form_id UUID NOT NULL REFERENCES hostel_information_forms(id) ON DELETE CASCADE,
  approval_stage VARCHAR(100) NOT NULL CHECK (approval_stage IN ('HOSTEL_MANAGEMENT', 'WARDEN')),
  approved_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('APPROVED', 'REJECTED', 'PENDING', 'CLARIFICATION_NEEDED')),
  comments TEXT,
  approved_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Room assignments (history)
CREATE TABLE IF NOT EXISTS hostel_room_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_form_id UUID NOT NULL REFERENCES hostel_information_forms(id),
  room_id UUID NOT NULL REFERENCES hostel_rooms(id),
  assigned_date TIMESTAMP DEFAULT NOW(),
  checkout_date TIMESTAMP,
  status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Mess assignments
CREATE TABLE IF NOT EXISTS hostel_mess_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_form_id UUID NOT NULL REFERENCES hostel_information_forms(id),
  mess_enabled BOOLEAN DEFAULT TRUE,
  mess_start_date DATE,
  mess_end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hostel_forms_status ON hostel_information_forms(status);
CREATE INDEX IF NOT EXISTS idx_hostel_forms_student_id ON hostel_information_forms(student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_forms_hostel_id ON hostel_information_forms(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_forms_room_id ON hostel_information_forms(room_id);
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_hostel_id ON hostel_rooms(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_status ON hostel_rooms(status);
CREATE INDEX IF NOT EXISTS idx_hostel_approvals_form_id ON hostel_information_approvals(hostel_form_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_form_id ON hostel_room_assignments(hostel_form_id);

-- Enable RLS
ALTER TABLE hostel_information_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_information_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_room_assignments ENABLE ROW LEVEL SECURITY;

-- Populate hostel statuses
INSERT INTO hostel_statuses (code, label, description) VALUES
('SUBMITTED', 'Submitted', 'Form submitted by student'),
('UNDERTAKING_SIGNED', 'Undertaking Signed', 'Undertaking signed by student'),
('UNDER_REVIEW', 'Under Review', 'Hostel Management reviewing'),
('PENDING_WARDEN', 'Pending Warden', 'Awaiting Warden approval'),
('APPROVED', 'Approved', 'Approved by Warden'),
('ROOM_ASSIGNED', 'Room Assigned', 'Room allocation confirmed'),
('COMPLETED', 'Completed', 'Active hostel resident'),
('REJECTED', 'Rejected', 'Application rejected'),
('SUSPENDED', 'Suspended', 'Suspended due to violations'),
('TERMINATED', 'Terminated', 'Accommodation terminated')
ON CONFLICT (code) DO NOTHING;
