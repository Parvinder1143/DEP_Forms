-- ============================================================================
-- UPDATE FORM TABLE RLS POLICIES (Safe version - checks if tables exist)
-- ============================================================================

-- Email Request Form RLS Policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_id_requests') THEN
    DROP POLICY IF EXISTS "Users can view their own email requests" ON email_id_requests;
    DROP POLICY IF EXISTS "Users can insert their own email requests" ON email_id_requests;
    
    CREATE POLICY "Users can view their own email requests"
      ON email_id_requests FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = email_id_requests.applicant_id
        )
      );

    CREATE POLICY "Users can insert their own email requests"
      ON email_id_requests FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = email_id_requests.applicant_id
        )
      );
  END IF;
END $$;

-- Vehicle Sticker Form RLS Policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_sticker_applications') THEN
    DROP POLICY IF EXISTS "Users can view their own vehicle sticker apps" ON vehicle_sticker_applications;
    DROP POLICY IF EXISTS "Users can insert their own vehicle sticker apps" ON vehicle_sticker_applications;
    
    CREATE POLICY "Users can view their own vehicle sticker apps"
      ON vehicle_sticker_applications FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = vehicle_sticker_applications.applicant_id
        )
      );

    CREATE POLICY "Users can insert their own vehicle sticker apps"
      ON vehicle_sticker_applications FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = vehicle_sticker_applications.applicant_id
        )
      );
  END IF;
END $$;

-- Hostel Form RLS Policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'hostel_information_forms') THEN
    DROP POLICY IF EXISTS "Users can view their own hostel forms" ON hostel_information_forms;
    DROP POLICY IF EXISTS "Users can insert their own hostel forms" ON hostel_information_forms;
    
    CREATE POLICY "Users can view their own hostel forms"
      ON hostel_information_forms FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = hostel_information_forms.submitted_by
        )
      );

    CREATE POLICY "Users can insert their own hostel forms"
      ON hostel_information_forms FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = hostel_information_forms.submitted_by
        )
      );
  END IF;
END $$;

-- Guest House Form RLS Policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'guest_house_reservations') THEN
    DROP POLICY IF EXISTS "Users can view their own guest house reservations" ON guest_house_reservations;
    DROP POLICY IF EXISTS "Users can insert their own guest house reservations" ON guest_house_reservations;
    
    CREATE POLICY "Users can view their own guest house reservations"
      ON guest_house_reservations FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = guest_house_reservations.proposer_id
        )
      );

    CREATE POLICY "Users can insert their own guest house reservations"
      ON guest_house_reservations FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = guest_house_reservations.proposer_id
        )
      );
  END IF;
END $$;

-- Identity Card Form RLS Policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'identity_card_forms') THEN
    DROP POLICY IF EXISTS "Users can view their own identity card forms" ON identity_card_forms;
    DROP POLICY IF EXISTS "Users can insert their own identity card forms" ON identity_card_forms;
    
    CREATE POLICY "Users can view their own identity card forms"
      ON identity_card_forms FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = identity_card_forms.applicant_id
        )
      );

    CREATE POLICY "Users can insert their own identity card forms"
      ON identity_card_forms FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = identity_card_forms.applicant_id
        )
      );
  END IF;
END $$;

-- Undertaking Form RLS Policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'undertaking_forms') THEN
    DROP POLICY IF EXISTS "Users can view their own undertaking forms" ON undertaking_forms;
    DROP POLICY IF EXISTS "Users can insert their own undertaking forms" ON undertaking_forms;
    
    CREATE POLICY "Users can view their own undertaking forms"
      ON undertaking_forms FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = undertaking_forms.applicant_id
        )
      );

    CREATE POLICY "Users can insert their own undertaking forms"
      ON undertaking_forms FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.auth_id = auth.uid()
          AND users.id = undertaking_forms.applicant_id
        )
      );
  END IF;
END $$;
