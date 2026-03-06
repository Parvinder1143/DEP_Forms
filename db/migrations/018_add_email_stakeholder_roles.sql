-- ============================================================================
-- Add stakeholder roles for email request forwarding authorities
-- ============================================================================

INSERT INTO roles (name, description, permissions)
VALUES
  ('Academics', 'Academic forwarding authority for email requests', '{"approve_email_requests": true}'::jsonb),
  ('Establishment', 'Establishment forwarding authority for email requests', '{"approve_email_requests": true}'::jsonb),
  ('Research & Development', 'R&D forwarding authority for email requests', '{"approve_email_requests": true}'::jsonb)
ON CONFLICT (name)
DO UPDATE SET
  description = EXCLUDED.description,
  permissions = COALESCE(roles.permissions, '{}'::jsonb) || EXCLUDED.permissions;
