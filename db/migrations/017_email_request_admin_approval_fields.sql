-- ============================================================================
-- Add forwarding authority + admin approval return fields for email requests
-- ============================================================================

ALTER TABLE email_id_requests
  ADD COLUMN IF NOT EXISTS forwarding_authority VARCHAR(50),
  ADD COLUMN IF NOT EXISTS authorised_signatory_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS authority_approval_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS email_created_by_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS approval_processed_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approval_processed_by_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS approval_processed_at TIMESTAMP;

ALTER TABLE email_id_requests
  DROP CONSTRAINT IF EXISTS chk_email_requests_forwarding_authority,
  ADD CONSTRAINT chk_email_requests_forwarding_authority
    CHECK (
      forwarding_authority IS NULL
      OR forwarding_authority IN ('Academics', 'Establishment', 'Research & Development')
    );

CREATE INDEX IF NOT EXISTS idx_email_requests_forwarding_authority ON email_id_requests(forwarding_authority);
CREATE INDEX IF NOT EXISTS idx_email_requests_authority_approval_date ON email_id_requests(authority_approval_date);
CREATE INDEX IF NOT EXISTS idx_email_requests_approval_processed_by_user_id ON email_id_requests(approval_processed_by_user_id);
