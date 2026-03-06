-- ============================================================================
-- Restructure undertaking_forms for Hostel Information cum Undertaking format
-- ============================================================================

ALTER TABLE undertaking_forms
  ADD COLUMN IF NOT EXISTS student_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS course_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS department_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS hostel_room_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS date_of_joining DATE,
  ADD COLUMN IF NOT EXISTS hef_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS mess_security_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS mess_admission_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS mess_charges NUMERIC(10,2),  
  ADD COLUMN IF NOT EXISTS blood_group VARCHAR(20),
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS emergency_contact_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parent_office_address TEXT,
  ADD COLUMN IF NOT EXISTS parent_residence_address TEXT,
  ADD COLUMN IF NOT EXISTS parent_mobile_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parent_telephone_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parent_email_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS local_guardian_office_address TEXT,
  ADD COLUMN IF NOT EXISTS local_guardian_residence_address TEXT,
  ADD COLUMN IF NOT EXISTS local_guardian_mobile_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS local_guardian_telephone_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS local_guardian_email_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS declaration_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS form_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS student_signature_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS parent_signature_name VARCHAR(255);

-- Optional backfill from old data when available.
UPDATE undertaking_forms
SET
  student_name = COALESCE(student_name, applicant_name),
  department_name = COALESCE(department_name, department_id),
  declaration_accepted = COALESCE(declaration_accepted, acknowledge_terms, FALSE),
  form_date = COALESCE(form_date, declaration_date, CURRENT_DATE),
  student_signature_name = COALESCE(student_signature_name, applicant_name),
  parent_signature_name = COALESCE(parent_signature_name, 'PENDING')
WHERE student_name IS NULL
   OR department_name IS NULL
   OR form_date IS NULL
   OR student_signature_name IS NULL
   OR parent_signature_name IS NULL;

-- Remove old indexes tied to generic undertaking columns.
DROP INDEX IF EXISTS idx_undertaking_type;
DROP INDEX IF EXISTS idx_undertaking_department;

ALTER TABLE undertaking_forms
  DROP COLUMN IF EXISTS applicant_type,
  DROP COLUMN IF EXISTS applicant_name,
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS contact_number,
  DROP COLUMN IF EXISTS department_id,
  DROP COLUMN IF EXISTS undertaking_type,
  DROP COLUMN IF EXISTS undertaking_title,
  DROP COLUMN IF EXISTS undertaking_text,
  DROP COLUMN IF EXISTS acknowledge_terms,
  DROP COLUMN IF EXISTS signature_provided,
  DROP COLUMN IF EXISTS declaration_date,
  DROP COLUMN IF EXISTS reviewer_id,
  DROP COLUMN IF EXISTS reviewed_date,
  DROP COLUMN IF EXISTS reviewer_comments;

-- Enforce required fields for the new structure.
ALTER TABLE undertaking_forms
  ALTER COLUMN student_name SET NOT NULL,
  ALTER COLUMN entry_number SET NOT NULL,
  ALTER COLUMN course_name SET NOT NULL,
  ALTER COLUMN department_name SET NOT NULL,
  ALTER COLUMN hostel_room_number SET NOT NULL,
  ALTER COLUMN email_address SET NOT NULL,
  ALTER COLUMN date_of_joining SET NOT NULL,
  ALTER COLUMN hef_amount SET NOT NULL,
  ALTER COLUMN mess_security_fee SET NOT NULL,
  ALTER COLUMN mess_admission_fee SET NOT NULL,
  ALTER COLUMN mess_charges SET NOT NULL,
  ALTER COLUMN blood_group SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN emergency_contact_number SET NOT NULL,
  ALTER COLUMN parent_office_address SET NOT NULL,
  ALTER COLUMN parent_residence_address SET NOT NULL,
  ALTER COLUMN parent_mobile_number SET NOT NULL,
  ALTER COLUMN parent_telephone_number SET NOT NULL,
  ALTER COLUMN parent_email_id SET NOT NULL,
  ALTER COLUMN declaration_accepted SET NOT NULL,
  ALTER COLUMN form_date SET NOT NULL,
  ALTER COLUMN student_signature_name SET NOT NULL,
  ALTER COLUMN parent_signature_name SET NOT NULL;

-- Remove now-unused enum type if present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'undertaking_type') THEN
    DROP TYPE undertaking_type;
  END IF;
END $$;

-- Indexes for common filtering/search.
CREATE INDEX IF NOT EXISTS idx_undertaking_entry_number ON undertaking_forms(entry_number);
CREATE INDEX IF NOT EXISTS idx_undertaking_student_name ON undertaking_forms(student_name);
