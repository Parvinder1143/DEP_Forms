-- ============================================================================
-- VEHICLE STICKER APPLICATION TABLES
-- ============================================================================

-- Vehicle sticker statuses
CREATE TABLE IF NOT EXISTS vehicle_sticker_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle types
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle sticker applications
CREATE TABLE IF NOT EXISTS vehicle_sticker_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  applicant_type VARCHAR(50) NOT NULL CHECK (applicant_type IN ('Student', 'Staff')),
  
  -- For Students
  student_id UUID REFERENCES students(id),
  entry_number VARCHAR(50),
  hostel_resident BOOLEAN,
  
  -- For Staff
  employee_id UUID REFERENCES employees(id),
  employee_code VARCHAR(50),
  designation VARCHAR(100),
  
  -- Contact & Details
  department_id UUID REFERENCES departments(id),
  address TEXT,
  phone_number VARCHAR(20) NOT NULL,
  email TEXT NOT NULL,
  driving_license_number VARCHAR(50) NOT NULL,
  driving_license_valid_upto DATE NOT NULL,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' REFERENCES vehicle_sticker_statuses(code),
  
  -- Tracking
  submitted_date TIMESTAMP DEFAULT NOW(),
  submitted_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicles attached to applications
CREATE TABLE IF NOT EXISTS application_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES vehicle_sticker_applications(id) ON DELETE CASCADE,
  sequence_number INT NOT NULL,
  vehicle_registration_number VARCHAR(50) NOT NULL,
  vehicle_type_id UUID NOT NULL REFERENCES vehicle_types(id),
  make_model TEXT NOT NULL,
  colour VARCHAR(50),
  primary_vehicle BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(application_id, vehicle_registration_number)
);

-- Vehicle stickers (issued records)
CREATE TABLE IF NOT EXISTS vehicle_stickers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES vehicle_sticker_applications(id),
  vehicle_id UUID NOT NULL REFERENCES application_vehicles(id),
  sticker_number VARCHAR(50) UNIQUE NOT NULL,
  issue_date DATE NOT NULL,
  validity_period_days INT DEFAULT 365,
  valid_until DATE NOT NULL,
  issued_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'LOST')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vehicle sticker approvals (audit trail)
CREATE TABLE IF NOT EXISTS vehicle_sticker_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES vehicle_sticker_applications(id) ON DELETE CASCADE,
  approval_stage VARCHAR(100) NOT NULL CHECK (approval_stage IN ('SUPERVISOR', 'HOD', 'STUDENT_AFFAIRS', 'SECURITY')),
  approved_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('APPROVED', 'REJECTED', 'PENDING', 'CLARIFICATION_NEEDED')),
  comments TEXT,
  approved_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_apps_status ON vehicle_sticker_applications(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_apps_applicant_id ON vehicle_sticker_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_apps_student_id ON vehicle_sticker_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_apps_employee_id ON vehicle_sticker_applications(employee_id);
CREATE INDEX IF NOT EXISTS idx_app_vehicles_application_id ON application_vehicles(application_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_stickers_sticker_number ON vehicle_stickers(sticker_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_stickers_valid_until ON vehicle_stickers(valid_until);
CREATE INDEX IF NOT EXISTS idx_vehicle_approvals_application_id ON vehicle_sticker_approvals(application_id);

-- Enable RLS
ALTER TABLE vehicle_sticker_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_sticker_approvals ENABLE ROW LEVEL SECURITY;

-- Populate vehicle statuses
INSERT INTO vehicle_sticker_statuses (code, label, description) VALUES
('SUBMITTED', 'Submitted', 'Application submitted'),
('PENDING_SUPERVISOR', 'Pending Supervisor', 'Awaiting supervisor review (staff)'),
('APPROVED_BY_SUPERVISOR', 'Supervisor Approved', 'Supervisor approved'),
('PENDING_HOD', 'Pending HOD', 'Awaiting HoD review (staff)'),
('APPROVED_BY_HOD', 'HOD Approved', 'HoD approved'),
('PENDING_AFFAIRS', 'Pending Student Affairs', 'Awaiting Student Affairs review'),
('APPROVED_BY_AFFAIRS', 'Affairs Approved', 'Student Affairs approved'),
('PENDING_SECURITY', 'Pending Security', 'Awaiting Security Office'),
('STICKER_ISSUED', 'Sticker Issued', 'Vehicle sticker issued'),
('REJECTED', 'Rejected', 'Application rejected'),
('CLOSED', 'Closed', 'Application closed/cancelled'),
('EXPIRED', 'Expired', 'Sticker validity period ended')
ON CONFLICT (code) DO NOTHING;

-- Populate vehicle types
INSERT INTO vehicle_types (code, name, description) VALUES
('2W', 'Two Wheeler', 'Motorcycle / Scooter'),
('4W', 'Four Wheeler', 'Car / SUV / Van')
ON CONFLICT (code) DO NOTHING;
