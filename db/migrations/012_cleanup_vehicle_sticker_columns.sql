-- ============================================================================
-- Remove legacy columns no longer used by the vehicle sticker form
-- ============================================================================

-- Drop indexes tied to legacy identity-link columns.
DROP INDEX IF EXISTS idx_vehicle_apps_student_id;
DROP INDEX IF EXISTS idx_vehicle_apps_employee_id;

ALTER TABLE vehicle_sticker_applications
  DROP COLUMN IF EXISTS student_id,
  DROP COLUMN IF EXISTS entry_number,
  DROP COLUMN IF EXISTS hostel_resident,
  DROP COLUMN IF EXISTS employee_id,
  DROP COLUMN IF EXISTS employee_code,
  DROP COLUMN IF EXISTS department_id;
