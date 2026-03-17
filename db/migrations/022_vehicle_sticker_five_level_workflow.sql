-- ============================================================================
-- VEHICLE STICKER FIVE-LEVEL WORKFLOW
-- ============================================================================

ALTER TABLE vehicle_sticker_applications
  ADD COLUMN IF NOT EXISTS approval_remark TEXT,
  ADD COLUMN IF NOT EXISTS approval_processed_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approval_processed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS approval_processed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS current_approval_stage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS approval_level INT DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_vehicle_apps_approval_level
  ON vehicle_sticker_applications(approval_level);

CREATE INDEX IF NOT EXISTS idx_vehicle_apps_current_approval_stage
  ON vehicle_sticker_applications(current_approval_stage);

INSERT INTO vehicle_sticker_statuses (code, label, description) VALUES
('PENDING_HOSTEL_WARDEN', 'Pending Hostel Warden', 'Awaiting Hostel Warden review'),
('APPROVED_BY_HOSTEL_WARDEN', 'Approved by Hostel Warden', 'Hostel Warden approved')
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  existing_constraint TEXT;
BEGIN
  SELECT c.conname
  INTO existing_constraint
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'vehicle_sticker_approvals'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%approval_stage%';

  IF existing_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE vehicle_sticker_approvals DROP CONSTRAINT %I', existing_constraint);
  END IF;
END $$;

ALTER TABLE vehicle_sticker_approvals
  ADD CONSTRAINT vehicle_sticker_approvals_stage_check
  CHECK (approval_stage IN ('SUPERVISOR', 'HOD', 'HOSTEL_WARDEN', 'STUDENT_AFFAIRS', 'SECURITY'));
