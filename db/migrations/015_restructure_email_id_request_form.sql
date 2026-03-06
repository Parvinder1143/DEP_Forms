-- ============================================================================
-- Restructure email_id_requests for updated IIT Ropar email request form
-- ============================================================================

ALTER TABLE email_id_requests
  ADD COLUMN IF NOT EXISTS applicant_title VARCHAR(10),
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS department_section VARCHAR(255),
  ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN DEFAULT FALSE;

-- Backfill new fields from existing data where possible.
UPDATE email_id_requests
SET
  applicant_title = COALESCE(applicant_title, 'Mr.'),
  first_name = COALESCE(first_name, NULLIF(TRIM(applicant_name), ''), 'UNKNOWN'),
  last_name = COALESCE(last_name, 'NA'),
  applicant_initials = COALESCE(NULLIF(TRIM(applicant_initials), ''), 'NA'),
  organisation_id = COALESCE(NULLIF(TRIM(organisation_id), ''), 'NOT_PROVIDED'),
  role = COALESCE(NULLIF(TRIM(role), ''), 'NOT_PROVIDED')
WHERE applicant_title IS NULL
   OR first_name IS NULL
   OR last_name IS NULL
   OR applicant_initials IS NULL
   OR organisation_id IS NULL
   OR role IS NULL;

-- Backfill department_section using department mapping where available.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'email_id_requests'
      AND column_name = 'department_id'
  ) THEN
    EXECUTE $sql$
      UPDATE email_id_requests e
      SET department_section = COALESCE(e.department_section, d.name)
      FROM departments d
      WHERE e.department_id = d.id
        AND e.department_section IS NULL
    $sql$;
  END IF;
END $$;

UPDATE email_id_requests
SET department_section = COALESCE(NULLIF(TRIM(department_section), ''), 'NOT_SPECIFIED')
WHERE department_section IS NULL
   OR NULLIF(TRIM(department_section), '') IS NULL;

-- Backfill consent using existing acknowledgment records when available.
UPDATE email_id_requests e
SET consent_accepted = a.acknowledged
FROM email_policy_acknowledgments a
WHERE a.email_request_id = e.id
  AND e.consent_accepted IS NULL;

UPDATE email_id_requests
SET consent_accepted = COALESCE(consent_accepted, TRUE)
WHERE consent_accepted IS NULL;

-- Rebuild applicant_name in a consistent format.
UPDATE email_id_requests
SET applicant_name = TRIM(CONCAT_WS(' ', applicant_title, applicant_initials, first_name, last_name))
WHERE applicant_name IS NULL
   OR NULLIF(TRIM(applicant_name), '') IS NULL;

-- Remove old index and legacy column no longer used by the form.
DROP INDEX IF EXISTS idx_email_requests_department_id;

ALTER TABLE email_id_requests
  DROP COLUMN IF EXISTS department_id;

-- Enforce required fields for the new form structure.
ALTER TABLE email_id_requests
  ALTER COLUMN applicant_title SET NOT NULL,
  ALTER COLUMN applicant_initials SET NOT NULL,
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL,
  ALTER COLUMN gender SET NOT NULL,
  ALTER COLUMN permanent_address SET NOT NULL,
  ALTER COLUMN organisation_id SET NOT NULL,
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN department_section SET NOT NULL,
  ALTER COLUMN joining_date DROP NOT NULL,
  ALTER COLUMN reporting_officer_name DROP NOT NULL,
  ALTER COLUMN reporting_officer_email DROP NOT NULL,
  ALTER COLUMN mobile_number SET NOT NULL,
  ALTER COLUMN consent_accepted SET NOT NULL,
  ALTER COLUMN consent_accepted SET DEFAULT TRUE;

-- Keep expected values constrained.
ALTER TABLE email_id_requests
  DROP CONSTRAINT IF EXISTS chk_email_requests_applicant_title,
  ADD CONSTRAINT chk_email_requests_applicant_title
    CHECK (applicant_title IN ('Dr.', 'Mr.', 'Ms.')),
  DROP CONSTRAINT IF EXISTS chk_email_requests_temp_fields_required,
  ADD CONSTRAINT chk_email_requests_temp_fields_required
    CHECK (
      nature_of_engagement <> 'Tech staff'
      OR (
        joining_date IS NOT NULL
        AND NULLIF(TRIM(COALESCE(reporting_officer_name, '')), '') IS NOT NULL
        AND NULLIF(TRIM(COALESCE(reporting_officer_email, '')), '') IS NOT NULL
      )
    ),
  DROP CONSTRAINT IF EXISTS chk_email_requests_consent_accepted,
  ADD CONSTRAINT chk_email_requests_consent_accepted
    CHECK (consent_accepted = TRUE);

-- Indexes for common lookups with the new schema.
CREATE INDEX IF NOT EXISTS idx_email_requests_department_section ON email_id_requests(department_section);
CREATE INDEX IF NOT EXISTS idx_email_requests_organisation_id ON email_id_requests(organisation_id);
