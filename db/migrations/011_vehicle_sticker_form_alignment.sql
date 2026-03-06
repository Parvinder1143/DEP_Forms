-- ============================================================================
-- Align vehicle sticker data model with official form fields
-- ============================================================================

ALTER TABLE vehicle_sticker_applications
  ADD COLUMN IF NOT EXISTS applicant_identifier VARCHAR(100),
  ADD COLUMN IF NOT EXISTS department_section TEXT;

-- Backfill generic identifier from existing staff/student columns when available.
UPDATE vehicle_sticker_applications
SET applicant_identifier = COALESCE(applicant_identifier, entry_number, employee_code)
WHERE applicant_identifier IS NULL;
