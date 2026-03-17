-- ============================================================================
-- Restructure identity_card_forms for employee identity card application format
-- ============================================================================

ALTER TABLE identity_card_forms
  ADD COLUMN IF NOT EXISTS employee_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS designation VARCHAR(255),
  ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contract_upto DATE,
  ADD COLUMN IF NOT EXISTS department_section VARCHAR(255),
  ADD COLUMN IF NOT EXISTS father_or_husband_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS present_address TEXT,
  ADD COLUMN IF NOT EXISTS office_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS request_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS renewal_reason TEXT;

-- Backfill from legacy columns where possible.
UPDATE identity_card_forms
SET
  employee_code = COALESCE(employee_code, employee_id),
  designation = COALESCE(designation, designation_course),
  employment_type = COALESCE(employment_type, 'PERMANENT'),
  department_section = COALESCE(department_section, department_id),
  father_or_husband_name = COALESCE(father_or_husband_name, 'NOT PROVIDED'),
  date_of_birth = COALESCE(date_of_birth, date_of_joining),
  present_address = COALESCE(present_address, 'NOT PROVIDED'),
  office_phone = COALESCE(office_phone, contact_number),
  mobile_number = COALESCE(mobile_number, contact_number),
  request_type = COALESCE(request_type, 'FRESH')
WHERE employee_code IS NULL
   OR designation IS NULL
   OR employment_type IS NULL
   OR department_section IS NULL
   OR father_or_husband_name IS NULL
   OR date_of_birth IS NULL
   OR present_address IS NULL
   OR office_phone IS NULL
   OR mobile_number IS NULL
   OR request_type IS NULL;

UPDATE identity_card_forms
SET
  blood_group = COALESCE(blood_group, 'NA'),
  photo_document_url = COALESCE(photo_document_url, 'PENDING_UPLOAD'),
  identity_card_type = 'EMPLOYEE_ID'
WHERE blood_group IS NULL
   OR photo_document_url IS NULL
   OR identity_card_type <> 'EMPLOYEE_ID';

-- Remove old index tied to legacy column.
DROP INDEX IF EXISTS idx_identity_cards_department;

-- Remove legacy columns no longer needed by the employee identity-card form.
ALTER TABLE identity_card_forms
  DROP COLUMN IF EXISTS applicant_type,
  DROP COLUMN IF EXISTS contact_number,
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS entry_number,
  DROP COLUMN IF EXISTS department_id,
  DROP COLUMN IF EXISTS designation_course;

-- Enforce required fields for the new structure.
ALTER TABLE identity_card_forms
  ALTER COLUMN employee_code SET NOT NULL,
  ALTER COLUMN designation SET NOT NULL,
  ALTER COLUMN employment_type SET NOT NULL,
  ALTER COLUMN department_section SET NOT NULL,
  ALTER COLUMN father_or_husband_name SET NOT NULL,
  ALTER COLUMN date_of_birth SET NOT NULL,
  ALTER COLUMN present_address SET NOT NULL,
  ALTER COLUMN office_phone SET NOT NULL,
  ALTER COLUMN mobile_number SET NOT NULL,
  ALTER COLUMN request_type SET NOT NULL,
  ALTER COLUMN blood_group SET NOT NULL,
  ALTER COLUMN photo_document_url SET NOT NULL,
  ALTER COLUMN employment_type SET DEFAULT 'PERMANENT',
  ALTER COLUMN request_type SET DEFAULT 'FRESH',
  ALTER COLUMN identity_card_type SET DEFAULT 'EMPLOYEE_ID';

-- Keep only expected values for key fields.
ALTER TABLE identity_card_forms
  DROP CONSTRAINT IF EXISTS chk_identity_cards_employment_type,
  ADD CONSTRAINT chk_identity_cards_employment_type
    CHECK (employment_type IN ('PERMANENT', 'TEMPORARY', 'CONTRACT')),
  DROP CONSTRAINT IF EXISTS chk_identity_cards_request_type,
  ADD CONSTRAINT chk_identity_cards_request_type
    CHECK (request_type IN ('FRESH', 'RENEWAL', 'DUPLICATE')),
  DROP CONSTRAINT IF EXISTS chk_identity_cards_contract_upto_required,
  ADD CONSTRAINT chk_identity_cards_contract_upto_required
    CHECK (employment_type = 'PERMANENT' OR contract_upto IS NOT NULL),
  DROP CONSTRAINT IF EXISTS chk_identity_cards_renewal_reason_required,
  ADD CONSTRAINT chk_identity_cards_renewal_reason_required
    CHECK (request_type = 'FRESH' OR NULLIF(TRIM(COALESCE(renewal_reason, '')), '') IS NOT NULL);

-- New indexes for common lookups.
CREATE INDEX IF NOT EXISTS idx_identity_cards_employee_code ON identity_card_forms(employee_code);
CREATE INDEX IF NOT EXISTS idx_identity_cards_department_section ON identity_card_forms(department_section);
CREATE INDEX IF NOT EXISTS idx_identity_cards_request_type ON identity_card_forms(request_type);

-- ============================================================================
-- Storage setup for identity card photo uploads
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-card-photos', 'identity-card-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "identity card photo upload" ON storage.objects;
CREATE POLICY "identity card photo upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'identity-card-photos');

DROP POLICY IF EXISTS "identity card photo public read" ON storage.objects;
CREATE POLICY "identity card photo public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'identity-card-photos');
