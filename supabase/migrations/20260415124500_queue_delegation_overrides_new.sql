BEGIN;

ALTER TABLE IF EXISTS app_role_delegation_requests
  ADD COLUMN IF NOT EXISTS queue_delegations JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS app_role_delegation_requests
  ADD COLUMN IF NOT EXISTS submitted_queue_delegations JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE app_role_delegation_requests
SET submitted_queue_delegations = COALESCE(queue_delegations, '{}'::jsonb)
WHERE COALESCE(submitted_queue_delegations, '{}'::jsonb) = '{}'::jsonb
  AND COALESCE(queue_delegations, '{}'::jsonb) <> '{}'::jsonb;

CREATE TABLE IF NOT EXISTS app_role_delegation_queue_overrides (
  id TEXT PRIMARY KEY,
  source_request_id TEXT NOT NULL REFERENCES app_role_delegation_requests(id) ON DELETE CASCADE,
  queue_key TEXT NOT NULL,
  overridden_from_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  override_to_user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  trigger_request_id TEXT NOT NULL REFERENCES app_role_delegation_requests(id) ON DELETE CASCADE,
  admin_user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegation_queue_overrides_source_queue
  ON app_role_delegation_queue_overrides (source_request_id, queue_key);

CREATE INDEX IF NOT EXISTS idx_delegation_queue_overrides_active_window
  ON app_role_delegation_queue_overrides (starts_at, ends_at);

COMMIT;
