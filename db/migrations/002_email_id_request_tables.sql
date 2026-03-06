-- ============================================================================
-- EMAIL ID REQUEST TABLES
-- ============================================================================

-- Email request status transitions
CREATE TABLE IF NOT EXISTS email_request_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email ID Requests
CREATE TABLE IF NOT EXISTS email_id_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  applicant_initials VARCHAR(10),
  gender VARCHAR(20),
  permanent_address TEXT NOT NULL,
  
  -- Employment/Engagement Details
  organisation_id VARCHAR(50),
  nature_of_engagement VARCHAR(100) NOT NULL CHECK (nature_of_engagement IN ('Student', 'Faculty', 'Non-staff', 'Tech staff', 'Administrative')),
  role VARCHAR(100),
  department_id UUID REFERENCES departments(id),
  project_name TEXT,
  
  -- Dates
  joining_date DATE NOT NULL,
  anticipated_end_date DATE,
  
  -- Contact Details
  reporting_officer_name TEXT NOT NULL,
  reporting_officer_email TEXT NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  alternate_email TEXT,
  
  -- Form Level
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' REFERENCES email_request_statuses(code),
  assigned_email_id TEXT UNIQUE,
  email_created_date TIMESTAMP,
  email_removal_date DATE,
  email_created_by UUID REFERENCES users(id),
  
  -- Tracking
  submitted_date TIMESTAMP DEFAULT NOW(),
  submitted_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email request approvals (audit trail)
CREATE TABLE IF NOT EXISTS email_request_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_request_id UUID NOT NULL REFERENCES email_id_requests(id) ON DELETE CASCADE,
  approval_stage VARCHAR(100) NOT NULL CHECK (approval_stage IN ('REPORTING_OFFICER', 'FORWARDING_AUTHORITY', 'IT_ADMIN')),
  approved_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('APPROVED', 'REJECTED', 'PENDING', 'CLARIFICATION_NEEDED')),
  comments TEXT,
  approved_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email policy acknowledgment
CREATE TABLE IF NOT EXISTS email_policy_acknowledgments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_request_id UUID NOT NULL REFERENCES email_id_requests(id),
  policy_version VARCHAR(20) NOT NULL DEFAULT '2021-08-09',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_requests_status ON email_id_requests(status);
CREATE INDEX IF NOT EXISTS idx_email_requests_applicant_id ON email_id_requests(applicant_id);
CREATE INDEX IF NOT EXISTS idx_email_requests_assigned_email ON email_id_requests(assigned_email_id);
CREATE INDEX IF NOT EXISTS idx_email_requests_department_id ON email_id_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_email_approvals_request_id ON email_request_approvals(email_request_id);
CREATE INDEX IF NOT EXISTS idx_email_approvals_approved_by ON email_request_approvals(approved_by);

-- Enable RLS
ALTER TABLE email_id_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_request_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_policy_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Populate email request statuses
INSERT INTO email_request_statuses (code, label, description) VALUES
('SUBMITTED', 'Submitted', 'Form submitted by applicant'),
('PENDING_OFFICER', 'Pending Officer Review', 'Awaiting reporting officer review'),
('APPROVED_BY_OFFICER', 'Officer Approved', 'Reporting officer approved'),
('PENDING_AUTHORITY', 'Pending Authority Review', 'Awaiting forwarding authority review'),
('APPROVED_BY_AUTHORITY', 'Authority Approved', 'Forwarding authority approved'),
('IN_PROGRESS', 'In Progress', 'IT creating email ID'),
('COMPLETED', 'Completed', 'Email ID activated'),
('REJECTED', 'Rejected', 'Application rejected'),
('CLOSED', 'Closed', 'Application closed/cancelled')
ON CONFLICT (code) DO NOTHING;
