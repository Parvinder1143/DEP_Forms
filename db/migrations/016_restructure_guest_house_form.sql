-- ============================================================================
-- Restructure guest_house_reservations for official guest house reservation form
-- ============================================================================

ALTER TABLE guest_house_reservations
  ADD COLUMN IF NOT EXISTS proposer_department VARCHAR(255),
  ADD COLUMN IF NOT EXISTS proposer_identifier VARCHAR(100),
  ADD COLUMN IF NOT EXISTS occupancy_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS arrival_date DATE,
  ADD COLUMN IF NOT EXISTS arrival_time TIME,
  ADD COLUMN IF NOT EXISTS departure_date DATE,
  ADD COLUMN IF NOT EXISTS departure_time TIME,
  ADD COLUMN IF NOT EXISTS purpose_of_booking TEXT,
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS room_category VARCHAR(20),
  ADD COLUMN IF NOT EXISTS boarding_lodging_payable_by_guest BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS project_budget_head TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS competent_authority_approval_attached BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS application_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS applicant_signature_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS undertaking_accepted BOOLEAN DEFAULT FALSE;

-- Backfill proposer department from department master where possible.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'guest_house_reservations'
      AND column_name = 'proposer_department_id'
  ) THEN
    EXECUTE $sql$
      UPDATE guest_house_reservations g
      SET proposer_department = COALESCE(g.proposer_department, d.name)
      FROM departments d
      WHERE g.proposer_department_id = d.id
        AND g.proposer_department IS NULL
    $sql$;
  END IF;
END $$;

-- Backfill key values from existing/new reservation columns.
UPDATE guest_house_reservations
SET
  proposer_designation = COALESCE(NULLIF(TRIM(proposer_designation), ''), 'NOT_PROVIDED'),
  proposer_department = COALESCE(NULLIF(TRIM(proposer_department), ''), 'NOT_PROVIDED'),
  proposer_identifier = COALESCE(NULLIF(TRIM(proposer_identifier), ''), 'NOT_PROVIDED'),
  proposer_mobile = COALESCE(NULLIF(TRIM(proposer_mobile), ''), 'NOT_PROVIDED'),
  guest_gender = COALESCE(NULLIF(TRIM(guest_gender), ''), 'Other'),
  guest_address = COALESCE(NULLIF(TRIM(guest_address), ''), 'NOT_PROVIDED'),
  guest_contact_number = COALESCE(NULLIF(TRIM(guest_contact_number), ''), 'NOT_PROVIDED'),
  occupancy_type = COALESCE(NULLIF(TRIM(occupancy_type), ''), 'Single'),
  purpose_of_booking = COALESCE(NULLIF(TRIM(purpose_of_booking), ''), 'NOT_PROVIDED'),
  room_type = COALESCE(NULLIF(TRIM(room_type), ''), 'BUSINESS_ROOM'),
  room_category = COALESCE(NULLIF(TRIM(room_category), ''), 'A'),
  boarding_lodging_payable_by_guest = COALESCE(boarding_lodging_payable_by_guest, FALSE),
  competent_authority_approval_attached = COALESCE(competent_authority_approval_attached, TRUE),
  application_date = COALESCE(application_date, submitted_date::date, CURRENT_DATE),
  applicant_signature_name = COALESCE(NULLIF(TRIM(applicant_signature_name), ''), proposer_name),
  undertaking_accepted = COALESCE(undertaking_accepted, TRUE)
WHERE proposer_designation IS NULL
   OR proposer_department IS NULL
   OR proposer_identifier IS NULL
   OR proposer_mobile IS NULL
   OR guest_gender IS NULL
   OR guest_address IS NULL
   OR guest_contact_number IS NULL
   OR occupancy_type IS NULL
   OR purpose_of_booking IS NULL
   OR room_type IS NULL
   OR room_category IS NULL
   OR competent_authority_approval_attached IS NULL
   OR application_date IS NULL
   OR applicant_signature_name IS NULL
   OR undertaking_accepted IS NULL;

-- Legacy date/purpose backfill, only when old columns still exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guest_house_reservations' AND column_name = 'check_in_date'
  ) THEN
    EXECUTE $sql$
      UPDATE guest_house_reservations
      SET arrival_date = COALESCE(arrival_date, check_in_date)
      WHERE arrival_date IS NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guest_house_reservations' AND column_name = 'check_in_time'
  ) THEN
    EXECUTE $sql$
      UPDATE guest_house_reservations
      SET arrival_time = COALESCE(arrival_time, check_in_time)
      WHERE arrival_time IS NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guest_house_reservations' AND column_name = 'check_out_date'
  ) THEN
    EXECUTE $sql$
      UPDATE guest_house_reservations
      SET departure_date = COALESCE(departure_date, check_out_date)
      WHERE departure_date IS NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guest_house_reservations' AND column_name = 'check_out_time'
  ) THEN
    EXECUTE $sql$
      UPDATE guest_house_reservations
      SET departure_time = COALESCE(departure_time, check_out_time)
      WHERE departure_time IS NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guest_house_reservations' AND column_name = 'purpose_description'
  ) THEN
    EXECUTE $sql$
      UPDATE guest_house_reservations
      SET purpose_of_booking = COALESCE(NULLIF(TRIM(purpose_of_booking), ''), NULLIF(TRIM(purpose_description), ''), 'NOT_PROVIDED')
      WHERE purpose_of_booking IS NULL OR NULLIF(TRIM(purpose_of_booking), '') IS NULL
    $sql$;
  END IF;
END $$;

-- Remove old indexes tied to dropped columns.
DROP INDEX IF EXISTS idx_guest_reservations_room_id;

-- Remove columns not needed in the official form.
ALTER TABLE guest_house_reservations
  DROP COLUMN IF EXISTS proposer_department_id,
  DROP COLUMN IF EXISTS proposer_email,
  DROP COLUMN IF EXISTS guest_email,
  DROP COLUMN IF EXISTS booking_purpose_id,
  DROP COLUMN IF EXISTS purpose_description,
  DROP COLUMN IF EXISTS check_in_date,
  DROP COLUMN IF EXISTS check_in_time,
  DROP COLUMN IF EXISTS check_out_date,
  DROP COLUMN IF EXISTS check_out_time,
  DROP COLUMN IF EXISTS room_id,
  DROP COLUMN IF EXISTS category_id,
  DROP COLUMN IF EXISTS special_requirements,
  DROP COLUMN IF EXISTS meal_requirements,
  DROP COLUMN IF EXISTS room_rate_per_night,
  DROP COLUMN IF EXISTS number_of_nights,
  DROP COLUMN IF EXISTS room_charges,
  DROP COLUMN IF EXISTS meal_charges,
  DROP COLUMN IF EXISTS service_charges,
  DROP COLUMN IF EXISTS damage_charges,
  DROP COLUMN IF EXISTS gst_percentage,
  DROP COLUMN IF EXISTS gst_amount,
  DROP COLUMN IF EXISTS total_charges,
  DROP COLUMN IF EXISTS billing_department_id,
  DROP COLUMN IF EXISTS billing_to,
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS payment_date,
  DROP COLUMN IF EXISTS confirmation_number;

-- Enforce required fields from the paper form.
ALTER TABLE guest_house_reservations
  ALTER COLUMN proposer_name SET NOT NULL,
  ALTER COLUMN proposer_designation SET NOT NULL,
  ALTER COLUMN proposer_department SET NOT NULL,
  ALTER COLUMN proposer_identifier SET NOT NULL,
  ALTER COLUMN proposer_mobile SET NOT NULL,
  ALTER COLUMN guest_name SET NOT NULL,
  ALTER COLUMN guest_gender SET NOT NULL,
  ALTER COLUMN guest_address SET NOT NULL,
  ALTER COLUMN guest_contact_number SET NOT NULL,
  ALTER COLUMN number_of_guests SET NOT NULL,
  ALTER COLUMN number_of_rooms SET NOT NULL,
  ALTER COLUMN occupancy_type SET NOT NULL,
  ALTER COLUMN arrival_date SET NOT NULL,
  ALTER COLUMN departure_date SET NOT NULL,
  ALTER COLUMN purpose_of_booking SET NOT NULL,
  ALTER COLUMN room_type SET NOT NULL,
  ALTER COLUMN room_category SET NOT NULL,
  ALTER COLUMN competent_authority_approval_attached SET NOT NULL,
  ALTER COLUMN application_date SET NOT NULL,
  ALTER COLUMN applicant_signature_name SET NOT NULL,
  ALTER COLUMN undertaking_accepted SET NOT NULL;

-- Keep values constrained to valid choices from the paper form.
ALTER TABLE guest_house_reservations
  DROP CONSTRAINT IF EXISTS chk_guest_res_guest_gender,
  ADD CONSTRAINT chk_guest_res_guest_gender
    CHECK (guest_gender IN ('Male', 'Female', 'Other')),
  DROP CONSTRAINT IF EXISTS chk_guest_res_occupancy_type,
  ADD CONSTRAINT chk_guest_res_occupancy_type
    CHECK (occupancy_type IN ('Single', 'Double')),
  DROP CONSTRAINT IF EXISTS chk_guest_res_room_type,
  ADD CONSTRAINT chk_guest_res_room_type
    CHECK (room_type IN ('EXECUTIVE_SUITE', 'BUSINESS_ROOM')),
  DROP CONSTRAINT IF EXISTS chk_guest_res_room_category,
  ADD CONSTRAINT chk_guest_res_room_category
    CHECK (room_category IN ('A', 'B', 'B1', 'B2')),
  DROP CONSTRAINT IF EXISTS chk_guest_res_room_category_by_type,
  ADD CONSTRAINT chk_guest_res_room_category_by_type
    CHECK (
      (room_type = 'EXECUTIVE_SUITE' AND room_category IN ('A', 'B'))
      OR (room_type = 'BUSINESS_ROOM' AND room_category IN ('A', 'B1', 'B2'))
    ),
  DROP CONSTRAINT IF EXISTS chk_guest_res_positive_counts,
  ADD CONSTRAINT chk_guest_res_positive_counts
    CHECK (number_of_guests > 0 AND number_of_rooms > 0),
  DROP CONSTRAINT IF EXISTS chk_guest_res_dates,
  ADD CONSTRAINT chk_guest_res_dates
    CHECK (arrival_date <= departure_date),
  DROP CONSTRAINT IF EXISTS chk_guest_res_undertaking_accepted,
  ADD CONSTRAINT chk_guest_res_undertaking_accepted
    CHECK (undertaking_accepted = TRUE),
  DROP CONSTRAINT IF EXISTS chk_guest_res_approval_attached,
  ADD CONSTRAINT chk_guest_res_approval_attached
    CHECK (competent_authority_approval_attached = TRUE);

-- Useful indexes for queue and reporting.
CREATE INDEX IF NOT EXISTS idx_guest_reservations_arrival_date ON guest_house_reservations(arrival_date);
CREATE INDEX IF NOT EXISTS idx_guest_reservations_proposer_name ON guest_house_reservations(proposer_name);
CREATE INDEX IF NOT EXISTS idx_guest_reservations_room_type ON guest_house_reservations(room_type);
