-- ============================================================================
-- Email request three-level stakeholder workflow
-- ============================================================================

-- Add workflow tracking fields on the request itself.
ALTER TABLE email_id_requests
  ADD COLUMN IF NOT EXISTS approval_remark TEXT,
  ADD COLUMN IF NOT EXISTS current_approval_stage VARCHAR(50) DEFAULT 'LEVEL_1',
  ADD COLUMN IF NOT EXISTS approval_level SMALLINT DEFAULT 1;

UPDATE email_id_requests
SET
  current_approval_stage = COALESCE(current_approval_stage, 'LEVEL_1'),
  approval_level = COALESCE(approval_level, 1)
WHERE current_approval_stage IS NULL
   OR approval_level IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_requests_current_approval_stage ON email_id_requests(current_approval_stage);
CREATE INDEX IF NOT EXISTS idx_email_requests_approval_level ON email_id_requests(approval_level);

-- Ensure status codes exist for the new 3-level path.
INSERT INTO email_request_statuses (code, label, description) VALUES
('PENDING_LEVEL_1', 'Pending Level 1 Review', 'Awaiting Section Head/HOD/Department Head approval'),
('PENDING_LEVEL_2', 'Pending Level 2 Review', 'Awaiting Deputy Registrar/Establishment approval'),
('PENDING_LEVEL_3', 'Pending Level 3 Review', 'Awaiting Registrar/Dean approval')
ON CONFLICT (code) DO NOTHING;

-- Extend approval stage enum-like check for audit trail rows.
ALTER TABLE email_request_approvals
  DROP CONSTRAINT IF EXISTS email_request_approvals_approval_stage_check,
  DROP CONSTRAINT IF EXISTS chk_email_request_approvals_stage;

ALTER TABLE email_request_approvals
  ADD CONSTRAINT chk_email_request_approvals_stage
  CHECK (
    approval_stage IN (
      'REPORTING_OFFICER',
      'FORWARDING_AUTHORITY',
      'IT_ADMIN',
      'LEVEL_1',
      'LEVEL_2',
      'LEVEL_3'
    )
  );
