-- Add optional queue-wise delegation mapping to unavailability requests.

ALTER TABLE IF EXISTS app_role_delegation_requests
  ADD COLUMN IF NOT EXISTS queue_delegations JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS app_role_delegation_requests
  ADD COLUMN IF NOT EXISTS submitted_queue_delegations JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE app_role_delegation_requests
SET submitted_queue_delegations = COALESCE(queue_delegations, '{}'::jsonb)
WHERE COALESCE(submitted_queue_delegations, '{}'::jsonb) = '{}'::jsonb
  AND COALESCE(queue_delegations, '{}'::jsonb) <> '{}'::jsonb;