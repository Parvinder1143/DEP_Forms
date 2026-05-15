-- Add auth/role tables and ownership links for email ID workflow.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'AppRole' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "AppRole" AS ENUM (
      'STUDENT',
      'EMPLOYEE',
      'FORWARDING_AUTHORITY',
      'IT_ADMIN',
      'SYSTEM_ADMIN'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "fullName" TEXT,
  "role" "AppRole"
);

ALTER TABLE "EmailIdForm"
  ADD COLUMN IF NOT EXISTS "submittedById" TEXT;

UPDATE "EmailIdForm"
SET "submittedById" = u."id"
FROM "User" u
WHERE "EmailIdForm"."submittedById" IS NULL
  AND lower(u."email") = lower("EmailIdForm"."alternateEmail");

-- Create placeholder accounts for legacy rows where mapping is not possible.
INSERT INTO "User" ("id", "email", "createdAt", "updatedAt")
SELECT
  concat('legacy_', replace("id", '-', '_')),
  concat('legacy+', "id", '@iitrpr.ac.in'),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "EmailIdForm"
WHERE "submittedById" IS NULL
ON CONFLICT ("email") DO NOTHING;

UPDATE "EmailIdForm"
SET "submittedById" = concat('legacy_', replace("id", '-', '_'))
WHERE "submittedById" IS NULL;

ALTER TABLE "EmailIdForm"
  ALTER COLUMN "submittedById" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'EmailIdForm_submittedById_fkey'
  ) THEN
    ALTER TABLE "EmailIdForm"
      ADD CONSTRAINT "EmailIdForm_submittedById_fkey"
      FOREIGN KEY ("submittedById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "EmailIdForm_submittedById_idx"
  ON "EmailIdForm"("submittedById");
