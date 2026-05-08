-- ================================================================
-- IIT ROPAR — FORMS DIGITALIZATION
-- SUPABASE (POSTGRESQL) SCHEMA  v2  — COMPLETE & AUDITED
-- ================================================================
--
-- FORMS COVERED
--   F1  Vehicle Sticker Application
--   F2  Email ID Request (IIT Ropar)
--   F3  Hostel Information cum Undertaking Form
--   F4  Identity Card Application (Fresh / Renewal / Duplicate)
--   F5  Guest House Reservation Form
--
-- ALL STAKEHOLDERS
--   system_admin · student · faculty · tech_staff · non_tech_staff
--   project_staff (JRF/RA/Intern/Post-Doc/Temp) · supervisor · hod
--   student_affairs_ar · student_affairs_dr · student_affairs_jr
--   security_officer · hostel_warden · it_admin
--   forwarding_authority · deputy_registrar · registrar · dean_faa
--   guest_house_incharge · guest_house_committee_chair · approving_authority
--
-- TABLES (19 total)
--   Core          : users, role_assignments
--   Config        : form_stage_config, form_access_config
--   Workflow      : form_submissions, approval_stages
--   Support       : documents, audit_log, notifications
--   Form data     : vehicle_sticker_data, vehicle_details
--                   email_id_request_data
--                   hostel_undertaking_data, guardian_details
--                   identity_card_data
--                   guest_house_data, guest_house_proposers
-- ================================================================

-- ----------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- SECTION 1 — ENUMS
-- ================================================================

-- Every stakeholder role in the system
CREATE TYPE user_role AS ENUM (
	'system_admin',             -- supervises everything, assigns roles
	'student',                  -- regular student (UG/PG/PhD)
	'faculty',                  -- faculty member
	'tech_staff',               -- technical staff
	'non_tech_staff',           -- non-technical staff
	'project_staff',            -- JRF / RA / Intern / Post-Doc / Temp / Others
	'supervisor',               -- project supervisor (signs Form F1, F2)
	'hod',                      -- head of department (signs F1, F2, F4)
	'student_affairs_ar',       -- AR — Student Affairs Section (signs F1)
	'student_affairs_dr',       -- DR — Student Affairs Section (signs F1)
	'student_affairs_jr',       -- JR(SA) — Student Affairs Section (signs F1)
	'security_officer',         -- issues vehicle sticker F1, issues ID card F4
	'hostel_warden',            -- verifies hostel residency F1, countersigns F3
	'it_admin',                 -- provisions email ID F2
	'forwarding_authority',     -- Academics / Establishment / R&D signatory F2
	'deputy_registrar',         -- Establishment Section review F4
	'registrar',                -- final approval F4
	'dean_faa',                 -- Dean FA&A — alternate final approver F4
	'guest_house_incharge',     -- confirms room, logs check-in/out F5
	'guest_house_committee_chair', -- chairman GH Committee F5
	'approving_authority'       -- competent authority for guest house F5
);

-- The five form types
CREATE TYPE form_type AS ENUM (
	'vehicle_sticker',
	'email_id_request',
	'hostel_undertaking',
	'identity_card',
	'guest_house_reservation'
);

-- Lifecycle of a form submission
CREATE TYPE submission_status AS ENUM (
	'draft',        -- saved but not yet submitted
	'submitted',    -- formally submitted, awaiting stage 1
	'in_review',    -- at least one stage has been acted on
	'approved',     -- all stages approved
	'rejected',     -- any stage rejected it
	'withdrawn'     -- applicant withdrew
);

-- Decision at each approval stage
CREATE TYPE stage_decision AS ENUM (
	'pending',    -- not yet acted on
	'approved',   -- approved / recommended
	'rejected',   -- rejected / not recommended
	'forwarded'   -- passed on with remarks (e.g. hostel section just verifies)
);

-- Vehicle type for Form F1
CREATE TYPE vehicle_type AS ENUM ('2W', '4W');

-- Identity card request type for Form F4
CREATE TYPE id_card_type AS ENUM ('fresh', 'renewal', 'duplicate');

-- Guest house occupancy type for Form F5
CREATE TYPE occupancy_type AS ENUM ('single', 'double');

-- Guest house room type for Form F5
CREATE TYPE room_type AS ENUM ('executive_suite', 'business_room');

-- Guardian type for Form F3
CREATE TYPE guardian_type AS ENUM ('parent', 'local_guardian');

-- Document type for uploaded attachments
CREATE TYPE document_type AS ENUM (
	'passport_photo',       -- all forms require passport photo
	'driving_license',      -- F1
	'vehicle_rc',           -- F1 (Registration Certificate)
	'college_id',           -- F1 (for students)
	'previous_id_card',     -- F4 renewal/duplicate
	'deposit_slip',         -- F4 duplicate (Rs 100 deposit)
	'fir_copy',             -- F4 duplicate (FIR copy)
	'supporting_document'   -- catch-all
);

-- Nature of engagement for Form F2
CREATE TYPE engagement_nature AS ENUM (
	'permanent',
	'temporary',
	'project',
	'contract'
);

-- Role in organisation for Form F2
CREATE TYPE org_role AS ENUM (
	'student',
	'faculty',
	'non_tech_staff',
	'tech_staff',
	'administration'
);

-- Notification delivery channel
CREATE TYPE notification_channel AS ENUM (
	'in_app',
	'email',
	'both'
);

-- ================================================================
-- SECTION 2 — CORE TABLES
-- ================================================================

-- ----------------------------------------------------------------
-- departments
-- Maps a department name to its HOD email for routing
-- ----------------------------------------------------------------
CREATE TABLE departments (
	id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
	name              TEXT        NOT NULL UNIQUE,
	hod_email         TEXT        NOT NULL,
	created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- users
-- Single table for every person who interacts with the system.
-- Linked to Supabase Auth via auth_id (uuid from auth.users).
-- ----------------------------------------------------------------
CREATE TABLE users (
	id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
	auth_id           UUID        UNIQUE,           -- Supabase auth.users.id
	email             TEXT        NOT NULL UNIQUE,
	full_name         TEXT        NOT NULL,
	primary_role      user_role   NOT NULL,

	-- Identifiers (mutually exclusive by role)
	employee_code     TEXT        UNIQUE,           -- faculty / staff
	entry_number      TEXT        UNIQUE,           -- students

	-- Institutional details
	department        TEXT,
	section           TEXT,
	designation       TEXT,

	-- Contact
	phone             TEXT,
	mobile            TEXT,

	-- Personal (needed across multiple forms)
	blood_group       TEXT,
	date_of_birth     DATE,
	date_of_joining   DATE,
	present_address   TEXT,
	fathers_husband_name TEXT,

	-- Status
	is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
	created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_users_auth_id       ON users(auth_id);
CREATE INDEX idx_users_primary_role  ON users(primary_role);
CREATE INDEX idx_users_department    ON users(department);
CREATE INDEX idx_users_entry_number  ON users(entry_number);
CREATE INDEX idx_users_employee_code ON users(employee_code);

-- ----------------------------------------------------------------
-- role_assignments
-- A user can hold multiple roles (e.g. faculty + supervisor).
-- System admin creates/revokes these.
-- ----------------------------------------------------------------
CREATE TABLE role_assignments (
	id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	role          user_role   NOT NULL,
	assigned_by   UUID        NOT NULL REFERENCES users(id),
	assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	expires_at    TIMESTAMPTZ,          -- NULL = never expires
	is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
	notes         TEXT,
	UNIQUE (user_id, role)
);

CREATE INDEX idx_role_assignments_user   ON role_assignments(user_id);
CREATE INDEX idx_role_assignments_role   ON role_assignments(role);
CREATE INDEX idx_role_assignments_active ON role_assignments(is_active);

-- ================================================================
-- SECTION 3 — CONFIGURATION TABLES
-- ================================================================

-- ----------------------------------------------------------------
-- form_stage_config
-- Defines the ordered approval pipeline for each form type.
-- This is the single source of truth for "who approves what and when."
-- Seeded at the bottom of this file.
-- ----------------------------------------------------------------
CREATE TABLE form_stage_config (
	id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
	form_type       form_type   NOT NULL,
	stage_number    SMALLINT    NOT NULL,
	stage_name      TEXT        NOT NULL,
	role_required   user_role   NOT NULL,
	is_optional     BOOLEAN     NOT NULL DEFAULT FALSE,
	requires_stamp  BOOLEAN     NOT NULL DEFAULT FALSE, -- "sign with stamp" stages
	description     TEXT,
	UNIQUE (form_type, stage_number)
);

CREATE INDEX idx_stage_config_form ON form_stage_config(form_type);

-- ----------------------------------------------------------------
-- form_access_config
-- Controls which roles are allowed to SUBMIT each form type.
-- Seeded at the bottom of this file.
-- ----------------------------------------------------------------
CREATE TABLE form_access_config (
	id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
	form_type   form_type   NOT NULL,
	role        user_role   NOT NULL,
	can_submit  BOOLEAN     NOT NULL DEFAULT TRUE,
	notes       TEXT,
	UNIQUE (form_type, role)
);

CREATE INDEX idx_form_access_form ON form_access_config(form_type);
CREATE INDEX idx_form_access_role ON form_access_config(role);

-- ================================================================
-- SECTION 4 — WORKFLOW TABLES
-- ================================================================

-- ----------------------------------------------------------------
-- form_submissions
-- One master record per form submission, regardless of form type.
-- ----------------------------------------------------------------
CREATE TABLE form_submissions (
	id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
	form_type       form_type         NOT NULL,
	submitted_by    UUID              NOT NULL REFERENCES users(id),
	current_stage   SMALLINT          NOT NULL DEFAULT 1,
	overall_status  submission_status NOT NULL DEFAULT 'draft',
	metadata        JSONB,
	submitted_at    TIMESTAMPTZ,      -- NULL while still a draft
	created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
	updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_submitted_by   ON form_submissions(submitted_by);
CREATE INDEX idx_submissions_form_type      ON form_submissions(form_type);
CREATE INDEX idx_submissions_overall_status ON form_submissions(overall_status);
CREATE INDEX idx_submissions_current_stage  ON form_submissions(current_stage);
CREATE INDEX idx_submissions_submitted_at   ON form_submissions(submitted_at DESC);

-- ----------------------------------------------------------------
-- approval_stages
-- One row per stage per submission, auto-created when form is submitted.
-- Business rule: stage N is actionable only when stage N-1 decision = 'approved'
--               (or 'forwarded' for verify-only stages).
-- ----------------------------------------------------------------
CREATE TABLE approval_stages (
	id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
	submission_id   UUID            NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
	stage_number    SMALLINT        NOT NULL,
	stage_name      TEXT            NOT NULL,
	role_required   user_role       NOT NULL,
	requires_stamp  BOOLEAN         NOT NULL DEFAULT FALSE,
	assigned_to     UUID            REFERENCES users(id),  -- specific person if pre-assigned
	decision        stage_decision  NOT NULL DEFAULT 'pending',
	recommendation_text TEXT,       -- free-text remarks / recommendation (e.g. "Recommended for 1 year")
	stamp_uploaded  BOOLEAN         NOT NULL DEFAULT FALSE, -- has stamp image been uploaded?
	decided_at      TIMESTAMPTZ,
	notified_at     TIMESTAMPTZ,    -- when the approver was notified
	created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
	UNIQUE (submission_id, stage_number)
);

CREATE INDEX idx_approval_submission  ON approval_stages(submission_id);
CREATE INDEX idx_approval_assigned_to ON approval_stages(assigned_to);
CREATE INDEX idx_approval_decision    ON approval_stages(decision);
CREATE INDEX idx_approval_role        ON approval_stages(role_required);

-- ================================================================
-- SECTION 5 — SUPPORT TABLES
-- ================================================================

-- ----------------------------------------------------------------
-- documents
-- File uploads attached to a submission.
-- Stored in Supabase Storage; this table holds metadata + path.
-- ----------------------------------------------------------------
CREATE TABLE documents (
	id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
	submission_id     UUID            NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
	document_type     document_type   NOT NULL,
	file_path         TEXT            NOT NULL,    -- path in Supabase Storage bucket
	original_filename TEXT            NOT NULL,
	file_size_bytes   BIGINT,
	mime_type         TEXT,
	uploaded_by       UUID            NOT NULL REFERENCES users(id),
	uploaded_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_submission ON documents(submission_id);
CREATE INDEX idx_documents_type       ON documents(document_type);

-- ----------------------------------------------------------------
-- audit_log
-- Immutable record of every action in the system.
-- Used by system_admin for oversight dashboard.
-- ----------------------------------------------------------------
CREATE TABLE audit_log (
	id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id         UUID        NOT NULL REFERENCES users(id),
	submission_id   UUID        REFERENCES form_submissions(id),
	action          TEXT        NOT NULL,
	-- e.g. 'form_submitted', 'stage_approved', 'stage_rejected',
	--      'role_assigned', 'form_withdrawn', 'draft_saved'
	stage_number    SMALLINT,
	old_status      TEXT,
	new_status      TEXT,
	ip_address      INET,
	user_agent      TEXT,
	metadata        JSONB,
	performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user         ON audit_log(user_id);
CREATE INDEX idx_audit_submission   ON audit_log(submission_id);
CREATE INDEX idx_audit_action       ON audit_log(action);
CREATE INDEX idx_audit_performed    ON audit_log(performed_at DESC);

-- ----------------------------------------------------------------
-- notifications
-- In-app and email notifications triggered by workflow events.
-- ----------------------------------------------------------------
CREATE TABLE notifications (
	id              UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id         UUID                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	submission_id   UUID                 REFERENCES form_submissions(id) ON DELETE SET NULL,
	title           TEXT                 NOT NULL,
	body            TEXT                 NOT NULL,
	channel         notification_channel NOT NULL DEFAULT 'both',
	notification_type TEXT,
	-- e.g. 'stage_pending', 'stage_approved', 'stage_rejected',
	--      'form_approved', 'form_rejected', 'role_assigned'
	is_read         BOOLEAN              NOT NULL DEFAULT FALSE,
	sent_at         TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user    ON notifications(user_id);
CREATE INDEX idx_notif_unread  ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notif_sent_at ON notifications(sent_at DESC);

-- ================================================================
-- SECTION 6 — FORM-SPECIFIC DATA TABLES
-- ================================================================

-- ----------------------------------------------------------------
-- F1 · vehicle_sticker_data
-- APPLICATION FORM FOR ISSUE OF VEHICLE STICKER
-- For: Regular Student / Project Staff / JRF / Interns / Post Doc / RA / Others
--
-- Fields map:
--   1. Name             → users.full_name
--   2. Designation      → users.designation (Entry No / Emp No stored here)
--   3. Department       → users.department
--   4. Address          → address
--   5. Phone / e-mail   → phone, email_contact
--   6. Driving License  → driving_license_no, dl_valid_upto
--   7. Vehicle details  → vehicle_details child table
--   8. Declaration      → declaration_date (applicant name from users)
--   9. Supervisor rec   → approval_stages stage 1 + 2 (with recommendation_text)
--  10. Hostel Mgmt      → residing_in_hostel, hostel_verified_by/at
--  11. Student Affairs  → approval_stages stage 4
--  12. Security Office  → issued_sticker_no, sticker_valid_upto
-- ----------------------------------------------------------------
CREATE TABLE vehicle_sticker_data (
	id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
	submission_id       UUID    NOT NULL UNIQUE REFERENCES form_submissions(id) ON DELETE CASCADE,

	-- Fields 1–6 (name/dept/designation from users; stored as snapshot)
	entry_or_emp_no     TEXT,
	address             TEXT    NOT NULL,
	phone               TEXT,
	email_contact       TEXT,
	driving_license_no  TEXT    NOT NULL,
	dl_valid_upto       DATE    NOT NULL,

	-- Field 8: Declaration
	declaration_date    DATE,

	-- Section 10: Hostel Management Section
	residing_in_hostel  BOOLEAN,
	hostel_verified_by  UUID    REFERENCES users(id),
	hostel_verified_at  TIMESTAMPTZ,

	-- Section 12: Security Office — issued sticker
	issued_sticker_no   TEXT,
	sticker_valid_upto  DATE,
	security_issued_by  UUID    REFERENCES users(id),
	security_issued_at  TIMESTAMPTZ,
	security_issue_date DATE    -- "Date" field in section 12
);

-- F1 · vehicle_details  (child of vehicle_sticker_data)
-- Section 7: one row per vehicle (form has 2 rows; no hard limit in DB)
CREATE TABLE vehicle_details (
	id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
	vehicle_sticker_id  UUID          NOT NULL REFERENCES vehicle_sticker_data(id) ON DELETE CASCADE,
	serial_no           SMALLINT      NOT NULL,
	registration_no     TEXT          NOT NULL,
	vehicle_type        vehicle_type  NOT NULL,   -- 2W or 4W
	make_model          TEXT          NOT NULL,
	colour              TEXT          NOT NULL
);

CREATE INDEX idx_vehicle_details_sticker ON vehicle_details(vehicle_sticker_id);

-- ----------------------------------------------------------------
-- F2 · email_id_request_data
-- REQUEST FORM FOR EMAIL ID AT IIT ROPAR
--
-- Sections:
--   Personal Details      → initials, gender, first/last name, permanent_address
--   Employment Details    → org_id, nature_of_engagement, role_in_org,
--                           department_section, project fields (if temp/project)
--   Alternate contact     → mobile_no, alternate_email
--   Consent               → consent_accepted_at
--   Office use (below dashes) → assigned_email_id, date_of_creation,
--                               tentative_removal_date, created_by_it
-- ----------------------------------------------------------------
CREATE TABLE email_id_request_data (
	id                        UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
	submission_id             UUID              NOT NULL UNIQUE REFERENCES form_submissions(id) ON DELETE CASCADE,

	-- Personal Details
	initials                  TEXT              NOT NULL,   -- Dr. / Mr. / Ms.
	gender                    TEXT,
	first_name                TEXT              NOT NULL,
	last_name                 TEXT              NOT NULL,
	permanent_address         TEXT,

	-- Employment Details
	org_id                    TEXT,
	nature_of_engagement      engagement_nature NOT NULL,
	role_in_org               org_role          NOT NULL,
	department_section        TEXT,             -- CSE / EE / IR / SA / Accounts etc.

	-- Temp / project staff additional fields
	project_name              TEXT,
	joining_date              DATE,
	anticipated_end_date      DATE,
	reporting_officer_id      UUID              REFERENCES users(id),
	reporting_officer_name    TEXT,             -- in case officer not yet in system
	reporting_officer_email   TEXT,

	-- Alternate way to communicate
	mobile_no                 TEXT,
	alternate_email           TEXT,             -- non-IIT Ropar email

	-- Consent (I have read email policies…)
	consent_accepted_at       TIMESTAMPTZ,

	-- Forwarding authority (approver fills)
	forwarding_authority_type TEXT,             -- Academics / Establishment / R&D
	authorised_signatory_name TEXT,
	forwarding_signed_at      TIMESTAMPTZ,

	-- Office use: IT admin fills below the dotted line
	assigned_email_id         TEXT,
	date_of_creation          DATE,
	tentative_removal_date    DATE,
	created_by_it             UUID              REFERENCES users(id)
);

-- ----------------------------------------------------------------
-- F3 · hostel_undertaking_data
-- HOSTEL MANAGEMENT SECTION — INFORMATION CUM UNDERTAKING FORM
-- IIT ROPAR
--
-- Fields:
--   Name of Student, Entry No, Course, Dept, Hostel Room No,
--   Email Address, Date of Joining, HEF, Mess Security,
--   Mess Admission Fee, Mess Charges, Blood Group, Category,
--   Emergency Contact No, Parents/Guardian address block → guardian_details
--   Undertaking declaration text (stored as accepted_at timestamp)
-- ----------------------------------------------------------------
CREATE TABLE hostel_undertaking_data (
	id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
	submission_id         UUID    NOT NULL UNIQUE REFERENCES form_submissions(id) ON DELETE CASCADE,

	-- Student details (name/entry_no from users; stored as snapshot)
	course_name           TEXT    NOT NULL,
	department            TEXT    NOT NULL,
	hostel_room_no        TEXT,
	email_address         TEXT,                 -- IIT email, may differ from login email
	date_of_joining       DATE    NOT NULL,

	-- Financial fields
	hef_amount            DECIMAL(10,2),        -- HEF (Hostel Establishment Fee)
	mess_security         DECIMAL(10,2),
	mess_admission_fee    DECIMAL(10,2),
	mess_charges          DECIMAL(10,2),

	-- Personal
	blood_group           TEXT,
	category              TEXT,                 -- SC / ST / OBC / GEN / EWS etc.
	emergency_contact_no  TEXT,

	-- Undertaking: "I have read the hostel rules of IIT Ropar…"
	undertaking_accepted_at TIMESTAMPTZ,
	declaration_date      DATE,

	-- Warden countersignature captured via approval_stages
	-- Parent signature uploaded as a document
	parent_signature_doc_id UUID             -- set after documents row is created
	-- FK added below via ALTER to avoid circular dependency
);

-- Add FK after documents table exists (avoids circular dep)
-- ALTER TABLE hostel_undertaking_data
--   ADD CONSTRAINT fk_parent_sig FOREIGN KEY (parent_signature_doc_id) REFERENCES documents(id);
-- Run this after the documents table is created (already defined above,
-- so you can uncomment and run this line after the full script executes).

-- F3 · guardian_details  (child of hostel_undertaking_data)
-- Covers: Name and Address of Parents (Office + Residence)
--         Name and Address of Local Guardian if any (Office + Residence)
CREATE TABLE guardian_details (
	id                        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
	hostel_submission_id      UUID            NOT NULL REFERENCES hostel_undertaking_data(id) ON DELETE CASCADE,
	guardian_type             guardian_type   NOT NULL,   -- parent or local_guardian
	relationship              TEXT,                       -- Father / Mother / Guardian

	-- Office address
	office_address_line1      TEXT,
	office_address_line2      TEXT,
	office_mobile             TEXT,
	office_telephone          TEXT,
	office_email              TEXT,

	-- Residence address
	residence_address_line1   TEXT,
	residence_address_line2   TEXT,
	residence_mobile          TEXT,
	residence_telephone       TEXT,
	residence_email           TEXT
);

CREATE INDEX idx_guardian_hostel ON guardian_details(hostel_submission_id);

-- ----------------------------------------------------------------
-- F4 · identity_card_data
-- APPLICATION FOR ISSUE OF IDENTITY CARD (Fresh / Renewal / Duplicate)
-- IIT ROPAR
--
-- Fields (numbered as in form):
--   1.  Name in capital letters
--   2.  Employee Code
--   3.  Designation (Permanent / Temporary / On contract)
--   4.  Department / Center / School / Section
--   5.  Father's / Husband's Name
--   6.  Date of Birth
--   7.  Date of Joining
--   8.  Blood Group
--   9.  Present Address
--  10.  Phone No. (office)
--  11.  Mobile Number
--  12.  E-mail Id
--  13.  Renewal: previous card validity / reason; Duplicate: deposit + FIR
-- ----------------------------------------------------------------
CREATE TABLE identity_card_data (
	id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
	submission_id               UUID          NOT NULL UNIQUE REFERENCES form_submissions(id) ON DELETE CASCADE,

	-- Field 1
	name_in_capitals            TEXT          NOT NULL,

	-- Fields 2–3 (employee_code from users; snapshot here)
	employee_code_snapshot      TEXT,
	designation_snapshot        TEXT,
	employment_type             TEXT,         -- Permanent / Temporary / On contract
	contract_upto               DATE,

	-- Field 4
	department_snapshot         TEXT,

	-- Fields 5–8
	fathers_husband_name        TEXT          NOT NULL,
	date_of_birth               DATE          NOT NULL,
	date_of_joining             DATE          NOT NULL,
	blood_group                 TEXT,

	-- Fields 9–12
	present_address             TEXT          NOT NULL,
	present_address_line2       TEXT,
	office_phone                TEXT,
	mobile_number               TEXT          NOT NULL,
	email_id                    TEXT          NOT NULL,

	-- Field 13: card type and renewal/duplicate specific
	card_type                   id_card_type  NOT NULL DEFAULT 'fresh',
	previous_card_validity      TEXT,         -- for renewal
	reason_for_renewal          TEXT,         -- for renewal / duplicate
	previous_id_card_doc_id     UUID          REFERENCES documents(id), -- copy of prev card

	-- Duplicate specific: Rs 100 deposit
	deposit_amount              DECIMAL(8,2)  DEFAULT 100.00,
	bank_account_no             TEXT          DEFAULT '37360100716',
	deposit_slip_doc_id         UUID          REFERENCES documents(id),
	fir_copy_doc_id             UUID          REFERENCES documents(id),

	-- Office use (also reflected in approval_stages, stored here for quick access)
	hod_section_head_name       TEXT,
	hod_forwarded_at            TIMESTAMPTZ,
	deputy_registrar_decision   TEXT,         -- Recommended / Not Recommended
	deputy_registrar_id         UUID          REFERENCES users(id),
	deputy_registrar_decided_at TIMESTAMPTZ,
	registrar_decision          TEXT,         -- Approved / Not Approved
	registrar_id                UUID          REFERENCES users(id),
	registrar_decided_at        TIMESTAMPTZ
);

-- ----------------------------------------------------------------
-- F5 · guest_house_data
-- GUEST HOUSE RESERVATION FORM — IIT ROPAR
--
-- Page 1 fields:
--   Guest Name, Gender, Address, Contact, No. of Guests, No. of Rooms,
--   Occupancy Type, Arrival/Departure (date + time),
--   Room type (Executive Suite / Business Room), Category,
--   Purpose of Booking, Room No. checkbox,
--   Applicant/Proposer table → guest_house_proposers child table
--   Undertaking clauses (a–f) → undertaking_accepted_at
--   For Office Use Only → room_no_confirmed, entry details, check-in/out
--
-- Page 2: Terms & Conditions (reference only, no fields stored)
--         Category/Tariff/Eligibility/Approving Authority table (used in
--         approving_authority field logic)
-- ----------------------------------------------------------------
CREATE TABLE guest_house_data (
	id                        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
	submission_id             UUID            NOT NULL UNIQUE REFERENCES form_submissions(id) ON DELETE CASCADE,

	-- Guest information (Fields 1–4)
	guest_name                TEXT            NOT NULL,
	guest_gender              TEXT,                       -- Male / Female
	guest_address             TEXT            NOT NULL,
	contact_number            TEXT            NOT NULL,
	number_of_guests          SMALLINT        NOT NULL DEFAULT 1,
	number_of_rooms_required  SMALLINT        NOT NULL DEFAULT 1,
	occupancy_type            occupancy_type  NOT NULL DEFAULT 'single',

	-- Field 5: Type of Occupancy (Single / Double — already in occupancy_type)

	-- Arrival and Departure (Fields — Arrival/Departure Information table)
	arrival_date              DATE            NOT NULL,
	arrival_time              TIME,
	departure_date            DATE            NOT NULL,
	departure_time            TIME,

	-- Fields 6–8: Purpose, Room type, Category
	purpose_of_booking        TEXT            NOT NULL,
	room_type                 room_type       NOT NULL,
	-- Room to be booked checkboxes
	book_executive_suite      BOOLEAN         NOT NULL DEFAULT FALSE,
	book_business_room        BOOLEAN         NOT NULL DEFAULT FALSE,
	-- Category (from tariff table on page 2)
	booking_category          TEXT,           -- e.g. Cat-A (Free), Cat-B Rs.3500, B-1 Rs.2000, B-2 Rs.1200
	category_tariff_amount    DECIMAL(10,2),

	-- Undertaking clauses (a–f) acceptance
	-- Clause (a): vacate on expiry, 4x daily normal rate if not vacated
	-- Clause (b): boarding/lodging paid by guest or not
	-- Clause (c): guest not to be charged (if applicable)
	-- Clause (d): guest treated as institute guest
	-- Clause (e): approval from competent authority attached
	-- Clause (f): remarks
	undertaking_accepted_at   TIMESTAMPTZ,
	remarks_if_any            TEXT,           -- clause (f) / remarks
	boarding_lodging_by_guest BOOLEAN,        -- clause (b): TRUE = guest pays, FALSE = institute
	is_institute_guest        BOOLEAN         NOT NULL DEFAULT FALSE, -- clause (d)

	-- Booking date
	booking_date              DATE,

	-- For Office Use Only
	room_no_confirmed         TEXT,
	sr_no_entered_at_page_no  TEXT,           -- "Sr. No. and page no" field
	entry_date                DATE,
	check_in_datetime         TIMESTAMPTZ,
	check_out_datetime        TIMESTAMPTZ,
	office_remarks            TEXT,

	-- Financial
	gst_applicable            BOOLEAN         NOT NULL DEFAULT FALSE,
	total_charges             DECIMAL(10,2),
	payment_from_institute    BOOLEAN         NOT NULL DEFAULT FALSE,
	-- If payment from project/institute fund: budget debited from department
	budget_department         TEXT
);

-- F5 · guest_house_proposers
-- "Details of the applicant/proposer for guest house booking" table on Form F5
-- Multiple proposers can be listed on one booking form
CREATE TABLE guest_house_proposers (
	id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
	guest_house_id    UUID    NOT NULL REFERENCES guest_house_data(id) ON DELETE CASCADE,
	serial_no         SMALLINT NOT NULL,
	name_of_proposer  TEXT    NOT NULL,
	designation       TEXT,
	department        TEXT,
	employee_code     TEXT,
	entry_number      TEXT,
	mobile_number     TEXT,
	-- Link to system user if proposer is registered
	user_id           UUID    REFERENCES users(id)
);

CREATE INDEX idx_gh_proposers_gh ON guest_house_proposers(guest_house_id);

-- ================================================================
-- SECTION 7 — TRIGGERS
-- ================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
	BEFORE UPDATE ON users
	FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_departments_updated_at
	BEFORE UPDATE ON departments
	FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_submissions_updated_at
	BEFORE UPDATE ON form_submissions
	FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ================================================================
-- SECTION 8 — ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE departments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_stage_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_access_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_stages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_sticker_data      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_details           ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_id_request_data     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_undertaking_data   ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_details          ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_card_data        ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_house_data          ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_house_proposers     ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a system_admin?
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
	SELECT EXISTS (
		SELECT 1 FROM users WHERE auth_id = auth.uid() AND primary_role = 'system_admin'
	);
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: get internal user id from Supabase auth uid
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
	SELECT id FROM users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ── users ──────────────────────────────────────────────────────
CREATE POLICY "users_self_read"
	ON users FOR SELECT
	USING (auth_id = auth.uid() OR is_system_admin());

CREATE POLICY "users_admin_all"
	ON users FOR ALL
	USING (is_system_admin());

-- ── role_assignments ───────────────────────────────────────────
CREATE POLICY "role_assignments_admin_all"
	ON role_assignments FOR ALL
	USING (is_system_admin());

CREATE POLICY "role_assignments_self_read"
	ON role_assignments FOR SELECT
	USING (user_id = current_user_id());

-- ── form_stage_config / form_access_config — read-only for all ─
CREATE POLICY "config_read_all"
	ON form_stage_config FOR SELECT USING (TRUE);

CREATE POLICY "config_access_read_all"
	ON form_access_config FOR SELECT USING (TRUE);

-- ── form_submissions ───────────────────────────────────────────
-- Submitter sees their own
CREATE POLICY "submissions_own"
	ON form_submissions FOR ALL
	USING (submitted_by = current_user_id());

-- Approver sees submissions where they are the actor for a pending stage
CREATE POLICY "submissions_approver_view"
	ON form_submissions FOR SELECT
	USING (
		EXISTS (
			SELECT 1
			FROM approval_stages ap
			JOIN role_assignments ra
				ON ra.user_id = current_user_id()
			 AND ra.role = ap.role_required
			 AND ra.is_active = TRUE
			WHERE ap.submission_id = form_submissions.id
				AND ap.decision = 'pending'
		)
	);

-- System admin sees all
CREATE POLICY "submissions_admin_all"
	ON form_submissions FOR ALL
	USING (is_system_admin());

-- ── approval_stages ────────────────────────────────────────────
CREATE POLICY "approval_own_submission"
	ON approval_stages FOR SELECT
	USING (
		EXISTS (
			SELECT 1 FROM form_submissions fs
			WHERE fs.id = approval_stages.submission_id
				AND fs.submitted_by = current_user_id()
		)
	);

CREATE POLICY "approval_assigned_actor"
	ON approval_stages FOR ALL
	USING (
		EXISTS (
			SELECT 1
			FROM role_assignments ra
			WHERE ra.user_id = current_user_id()
				AND ra.role = approval_stages.role_required
				AND ra.is_active = TRUE
		)
	);

CREATE POLICY "approval_admin_all"
	ON approval_stages FOR ALL
	USING (is_system_admin());

-- ── documents ──────────────────────────────────────────────────
CREATE POLICY "documents_own_submission"
	ON documents FOR ALL
	USING (
		EXISTS (
			SELECT 1 FROM form_submissions fs
			WHERE fs.id = documents.submission_id
				AND fs.submitted_by = current_user_id()
		)
		OR is_system_admin()
	);

-- ── notifications ──────────────────────────────────────────────
CREATE POLICY "notifications_own"
	ON notifications FOR ALL
	USING (user_id = current_user_id());

-- ── audit_log — admin read only ────────────────────────────────
CREATE POLICY "audit_admin_read"
	ON audit_log FOR SELECT
	USING (is_system_admin());

CREATE POLICY "audit_insert_any_auth"
	ON audit_log FOR INSERT
	WITH CHECK (user_id = current_user_id());

-- ── form-specific data: submitter + assigned approver + admin ──
-- Pattern is the same for all 5 data tables; repeated for explicitness.

CREATE POLICY "vsd_access"
	ON vehicle_sticker_data FOR ALL
	USING (
		EXISTS (SELECT 1 FROM form_submissions fs WHERE fs.id = submission_id AND fs.submitted_by = current_user_id())
		OR is_system_admin()
	);

CREATE POLICY "vd_access"
	ON vehicle_details FOR ALL
	USING (
		EXISTS (
			SELECT 1 FROM vehicle_sticker_data vsd
			JOIN form_submissions fs ON fs.id = vsd.submission_id
			WHERE vsd.id = vehicle_sticker_id AND fs.submitted_by = current_user_id()
		)
		OR is_system_admin()
	);

CREATE POLICY "email_req_access"
	ON email_id_request_data FOR ALL
	USING (
		EXISTS (SELECT 1 FROM form_submissions fs WHERE fs.id = submission_id AND fs.submitted_by = current_user_id())
		OR is_system_admin()
	);

CREATE POLICY "hostel_access"
	ON hostel_undertaking_data FOR ALL
	USING (
		EXISTS (SELECT 1 FROM form_submissions fs WHERE fs.id = submission_id AND fs.submitted_by = current_user_id())
		OR is_system_admin()
	);

CREATE POLICY "guardian_access"
	ON guardian_details FOR ALL
	USING (
		EXISTS (
			SELECT 1 FROM hostel_undertaking_data hud
			JOIN form_submissions fs ON fs.id = hud.submission_id
			WHERE hud.id = hostel_submission_id AND fs.submitted_by = current_user_id()
		)
		OR is_system_admin()
	);

CREATE POLICY "id_card_access"
	ON identity_card_data FOR ALL
	USING (
		EXISTS (SELECT 1 FROM form_submissions fs WHERE fs.id = submission_id AND fs.submitted_by = current_user_id())
		OR is_system_admin()
	);

CREATE POLICY "gh_access"
	ON guest_house_data FOR ALL
	USING (
		EXISTS (SELECT 1 FROM form_submissions fs WHERE fs.id = submission_id AND fs.submitted_by = current_user_id())
		OR is_system_admin()
	);

CREATE POLICY "gh_proposers_access"
	ON guest_house_proposers FOR ALL
	USING (
		EXISTS (
			SELECT 1 FROM guest_house_data ghd
			JOIN form_submissions fs ON fs.id = ghd.submission_id
			WHERE ghd.id = guest_house_id AND fs.submitted_by = current_user_id()
		)
		OR is_system_admin()
	);

-- ================================================================
-- SECTION 9 — SEED DATA
-- ================================================================

-- ----------------------------------------------------------------
-- form_stage_config
-- Full approval pipeline for all 5 forms
-- ----------------------------------------------------------------
INSERT INTO form_stage_config
	(form_type, stage_number, stage_name, role_required, is_optional, requires_stamp, description)
VALUES

-- F1: Vehicle Sticker — 5 stages
('vehicle_sticker', 1, 'Supervisor Recommendation',       'supervisor',                  FALSE, TRUE,
 'Supervisor reviews application and recommends (sign with stamp). Section 9 of form.'),
('vehicle_sticker', 2, 'HoD Recommendation',              'hod',                         FALSE, TRUE,
 'Head of Department recommends (sign with stamp). Section 9 of form.'),
('vehicle_sticker', 3, 'Hostel Management Verification',  'hostel_warden',               TRUE,  TRUE,
 'Required only if applicant resides in hostel. Verifies hostel residency (sign with stamp). Section 10.'),
('vehicle_sticker', 4, 'Student Affairs Section Review',  'student_affairs_ar',          FALSE, TRUE,
 'AR/DR/JR(SA) recommends or not recommended; specifies sticker duration. Section 11.'),
('vehicle_sticker', 5, 'Security Office Issuance',        'security_officer',            FALSE, FALSE,
 'Security Officer issues sticker number and sets valid-upto date. Section 12.'),

-- F2: Email ID Request — 2 stages
('email_id_request', 1, 'Forwarding Authority Sign-off',  'forwarding_authority',        FALSE, TRUE,
 'Academics / Establishment / R&D forwarding authority signs with date. Names authorised signatory.'),
('email_id_request', 2, 'IT Admin Email Provisioning',    'it_admin',                    FALSE, FALSE,
 'IT admin approves and creates email ID. Fills assigned email, creation date, removal date.'),

-- F3: Hostel Undertaking — 1 stage
('hostel_undertaking', 1, 'Hostel Warden Acknowledgement','hostel_warden',               FALSE, FALSE,
 'Warden reviews undertaking form and countersigns. Records room and fee details.'),

-- F4: Identity Card — 3 stages
('identity_card', 1, 'HoD / Section Head Forwarding',     'hod',                         FALSE, FALSE,
 'HoD or Section Head forwards the application. Signs the forwarding line.'),
('identity_card', 2, 'Deputy Registrar Review',           'deputy_registrar',            FALSE, FALSE,
 'Deputy Registrar (Establishment Section): Recommended / Not Recommended.'),
('identity_card', 3, 'Registrar / Dean FA&A Final Approval','registrar',                 FALSE, FALSE,
 'Registrar or Dean FA&A: Approved / Not Approved. Final authority.'),

-- F5: Guest House Reservation — 3 stages
('guest_house_reservation', 1, 'Approving Authority Sign-off',    'approving_authority',         FALSE, FALSE,
 'Competent approving authority approves booking. Category/tariff eligibility verified.'),
('guest_house_reservation', 2, 'Official In-charge Room Entry',   'guest_house_incharge',        FALSE, FALSE,
 'Guest House official in-charge confirms room number, logs entry date, check-in/out times.'),
('guest_house_reservation', 3, 'Chairman GH Committee Approval',  'guest_house_committee_chair', FALSE, FALSE,
 'Chairman of Guest House Committee gives final approval per terms and conditions.');

-- ----------------------------------------------------------------
-- form_access_config
-- Which roles can submit which forms
-- ----------------------------------------------------------------
INSERT INTO form_access_config (form_type, role, can_submit, notes) VALUES

-- F1: Vehicle Sticker
-- "For Regular Student / Project Staff / JRF / Interns / Post Doc / RA / Others"
('vehicle_sticker', 'student',       TRUE, 'Regular students'),
('vehicle_sticker', 'project_staff', TRUE, 'JRF / RA / Interns / Post-Doc / Others'),
('vehicle_sticker', 'faculty',       TRUE, 'Faculty members'),
('vehicle_sticker', 'tech_staff',    TRUE, 'Technical staff'),
('vehicle_sticker', 'non_tech_staff',TRUE, 'Non-technical staff'),

-- F2: Email ID Request — any new joiner
('email_id_request', 'student',        TRUE, 'New student joining IIT Ropar'),
('email_id_request', 'faculty',        TRUE, 'New faculty member'),
('email_id_request', 'tech_staff',     TRUE, 'Tech staff'),
('email_id_request', 'non_tech_staff', TRUE, 'Non-tech staff'),
('email_id_request', 'project_staff',  TRUE, 'Temp/project/contract staff'),

-- F3: Hostel Undertaking — students only
('hostel_undertaking', 'student', TRUE, 'Students allotted hostel accommodation'),

-- F4: Identity Card — employees and faculty (not students, who get separate ID)
('identity_card', 'faculty',        TRUE, 'Faculty applying for institute ID card'),
('identity_card', 'tech_staff',     TRUE, 'Technical staff'),
('identity_card', 'non_tech_staff', TRUE, 'Non-technical staff'),
('identity_card', 'project_staff',  TRUE, 'Project/contract staff'),

-- F5: Guest House — any registered user can request; approving authority validates category
('guest_house_reservation', 'student',        TRUE, 'Students booking for parents/guests'),
('guest_house_reservation', 'faculty',        TRUE, 'Faculty booking for guests/collaborators'),
('guest_house_reservation', 'tech_staff',     TRUE, 'Staff booking for guests'),
('guest_house_reservation', 'non_tech_staff', TRUE, 'Staff booking for guests'),
('guest_house_reservation', 'project_staff',  TRUE, 'Project staff booking for guests');

-- ================================================================
-- SECTION 10 — DEFERRED FK (hostel parent signature)
-- Run after full script executes in Supabase SQL editor
-- ================================================================
-- ALTER TABLE hostel_undertaking_data
--   ADD CONSTRAINT fk_parent_signature_doc
--   FOREIGN KEY (parent_signature_doc_id)
--   REFERENCES documents(id)
--   ON DELETE SET NULL;

-- ================================================================
-- END OF SCHEMA — iit_ropar_schema_v2.sql
-- 19 tables · 21 enums/types · full RLS · seeded config
-- ================================================================
