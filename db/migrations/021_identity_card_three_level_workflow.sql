-- ============================================================================
-- Identity card three-level stakeholder workflow metadata
-- ============================================================================

ALTER TABLE identity_card_forms
  ADD COLUMN IF NOT EXISTS approval_remark TEXT,
  ADD COLUMN IF NOT EXISTS approval_processed_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approval_processed_by_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS approval_processed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS current_approval_stage VARCHAR(50) DEFAULT 'LEVEL_1',
  ADD COLUMN IF NOT EXISTS approval_level SMALLINT DEFAULT 1;

UPDATE identity_card_forms
SET
  current_approval_stage = COALESCE(current_approval_stage, 'LEVEL_1'),
  approval_level = COALESCE(approval_level, 1)
WHERE current_approval_stage IS NULL
   OR approval_level IS NULL;

CREATE INDEX IF NOT EXISTS idx_identity_cards_approval_level ON identity_card_forms(approval_level);
CREATE INDEX IF NOT EXISTS idx_identity_cards_current_stage ON identity_card_forms(current_approval_stage);
CREATE INDEX IF NOT EXISTS idx_identity_cards_processed_by ON identity_card_forms(approval_processed_by_user_id);
