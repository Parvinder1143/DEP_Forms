-- ============================================================================
-- Add undertaking review decision fields (Institute Admin workflow)
-- ============================================================================

ALTER TABLE undertaking_forms
  ADD COLUMN IF NOT EXISTS reviewer_remarks TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_by_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_undertaking_reviewed_by_user ON undertaking_forms(reviewed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_undertaking_reviewed_at ON undertaking_forms(reviewed_at);
