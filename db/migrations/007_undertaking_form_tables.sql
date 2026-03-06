-- ============================================================================
-- UNDERTAKING FORM TABLES
-- ============================================================================

-- Undertaking type enumeration
CREATE TYPE undertaking_type AS ENUM (
  'HOSTEL_UNDERTAKING',
  'PARKING_UNDERTAKING',
  'LAB_SAFETY_UNDERTAKING',
  'CODE_OF_CONDUCT_UNDERTAKING',
  'CONFIDENTIALITY_UNDERTAKING',
  'GENERAL_UNDERTAKING'
);

-- Undertaking status enumeration
CREATE TYPE undertaking_status AS ENUM (
  'SUBMITTED',
  'REVIEWED',
  'ACCEPTED',
  'REJECTED'
);

-- Undertaking Form Table
CREATE TABLE undertaking_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applicant_type VARCHAR(50) NOT NULL, -- 'EMPLOYEE', 'STUDENT', 'FACULTY'
  applicant_name VARCHAR(255) NOT NULL,
  employee_id VARCHAR(100),
  entry_number VARCHAR(100),
  contact_number VARCHAR(20) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  department_id VARCHAR(100) NOT NULL,
  
  undertaking_type undertaking_type NOT NULL,
  undertaking_title VARCHAR(255) NOT NULL,
  undertaking_text TEXT NOT NULL,
  acknowledge_terms BOOLEAN DEFAULT FALSE,
  
  signature_provided BOOLEAN DEFAULT FALSE,
  declaration_date DATE NOT NULL,
  
  status undertaking_status DEFAULT 'SUBMITTED',
  submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_by UUID NOT NULL REFERENCES users(id),
  
  reviewer_id UUID REFERENCES users(id),
  reviewed_date TIMESTAMP,
  reviewer_comments TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Undertaking Acceptance Log Table
CREATE TABLE undertaking_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  undertaking_form_id UUID NOT NULL REFERENCES undertaking_forms(id) ON DELETE CASCADE,
  accepted_by UUID NOT NULL REFERENCES users(id),
  accepted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acceptance_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_undertaking_applicant ON undertaking_forms(applicant_id);
CREATE INDEX idx_undertaking_status ON undertaking_forms(status);
CREATE INDEX idx_undertaking_type ON undertaking_forms(undertaking_type);
CREATE INDEX idx_undertaking_department ON undertaking_forms(department_id);
CREATE INDEX idx_undertaking_acceptance ON undertaking_acceptances(undertaking_form_id);

-- Enable RLS (Row Level Security)
ALTER TABLE undertaking_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE undertaking_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for undertaking_forms
CREATE POLICY "Users can view their own undertaking forms"
  ON undertaking_forms FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "Users can insert their own undertaking forms"
  ON undertaking_forms FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can update their own undertaking forms"
  ON undertaking_forms FOR UPDATE
  USING (auth.uid() = applicant_id);

-- RLS Policies for undertaking_acceptances
CREATE POLICY "Users can view acceptances for their forms"
  ON undertaking_acceptances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM undertaking_forms
      WHERE undertaking_forms.id = undertaking_acceptances.undertaking_form_id
      AND undertaking_forms.applicant_id = auth.uid()
    )
  );
