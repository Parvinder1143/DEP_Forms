-- ============================================================================
-- IDENTITY CARD FORM TABLES
-- ============================================================================

-- Identity card type enumeration
CREATE TYPE identity_card_type AS ENUM (
  'EMPLOYEE_ID',
  'STUDENT_ID',
  'FACULTY_ID'
);

-- Identity card status enumeration
CREATE TYPE identity_card_status AS ENUM (
  'SUBMITTED',
  'APPROVED_HOD',
  'APPROVED_DIRECTOR',
  'REJECTED',
  'ISSUED',
  'CANCELLED'
);

-- Identity Card Form Table
CREATE TABLE identity_card_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  applicant_type VARCHAR(50) NOT NULL, -- 'EMPLOYEE', 'STUDENT', 'FACULTY'
  applicant_name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  
  employee_id VARCHAR(100),
  entry_number VARCHAR(100),
  department_id VARCHAR(100) NOT NULL,
  designation_course VARCHAR(255) NOT NULL,
  date_of_joining DATE NOT NULL,
  
  blood_group VARCHAR(10),
  photo_document_url VARCHAR(500),
  
  identity_card_type identity_card_type NOT NULL,
  status identity_card_status DEFAULT 'SUBMITTED',
  
  submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_by UUID NOT NULL REFERENCES users(id),
  
  card_issued_date TIMESTAMP,
  card_number VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Identity Card Approval Table
CREATE TABLE identity_card_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_card_form_id UUID NOT NULL REFERENCES identity_card_forms(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id),
  approver_role VARCHAR(100) NOT NULL, -- 'HOD', 'DIRECTOR'
  status VARCHAR(20) NOT NULL, -- 'APPROVED', 'REJECTED'
  comments TEXT,
  approved_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_identity_cards_applicant ON identity_card_forms(applicant_id);
CREATE INDEX idx_identity_cards_status ON identity_card_forms(status);
CREATE INDEX idx_identity_cards_department ON identity_card_forms(department_id);
CREATE INDEX idx_identity_approvals_form ON identity_card_approvals(identity_card_form_id);
CREATE INDEX idx_identity_approvals_approver ON identity_card_approvals(approver_id);

-- Enable RLS (Row Level Security)
ALTER TABLE identity_card_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_card_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for identity_card_forms
CREATE POLICY "Users can view their own identity card forms"
  ON identity_card_forms FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "Users can insert their own identity card forms"
  ON identity_card_forms FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Users can update their own identity card forms"
  ON identity_card_forms FOR UPDATE
  USING (auth.uid() = applicant_id);

-- RLS Policies for identity_card_approvals
CREATE POLICY "Users can view approvals for their forms"
  ON identity_card_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM identity_card_forms
      WHERE identity_card_forms.id = identity_card_approvals.identity_card_form_id
      AND identity_card_forms.applicant_id = auth.uid()
    )
  );
