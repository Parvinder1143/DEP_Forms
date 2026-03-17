-- ============================================================================
-- ROLE ASSIGNMENT REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_assignment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_auth_id UUID NOT NULL UNIQUE,
  requester_email TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  notes TEXT,
  decided_by_user_id UUID REFERENCES users(id),
  assigned_role_id UUID REFERENCES roles(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  decided_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_assignment_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_requests_requester_user_id ON role_assignment_requests(requester_user_id);

ALTER TABLE role_assignment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own role request" ON role_assignment_requests;
CREATE POLICY "Users can view own role request"
  ON role_assignment_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.id = role_assignment_requests.requester_user_id
    )
  );
