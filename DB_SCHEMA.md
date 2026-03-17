# Database Schema Documentation

## Overview

This document provides comprehensive documentation of the DEP_FORMS database schema. The database manages five main forms:
1. **Email ID Request** - Provision of institutional email accounts
2. **Vehicle Sticker Application** - Vehicle pass issuance
3. **Hostel Information & Undertaking** - Hostel accommodation management
4. **Guest House Reservation** - Guest accommodation booking

---

## Table of Contents

1. [Core Tables](#core-tables)
2. [Email ID Request Tables](#email-id-request-tables)
3. [Vehicle Sticker Tables](#vehicle-sticker-tables)
4. [Hostel Information Tables](#hostel-information-tables)
5. [Guest House Tables](#guest-house-tables)
6. [Status & Enumeration Tables](#status--enumeration-tables)
7. [Relationships & Constraints](#relationships--constraints)
8. [Query Examples](#query-examples)

---

## Core Tables

### Users
Stores all users in the system (employees, students, faculty, admins).

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| email | TEXT | UNIQUE, NOT NULL | Email address |
| full_name | TEXT | NOT NULL | Full name |
| user_type | VARCHAR(50) | NOT NULL, CHECK | Type: employee, student, faculty, admin |
| mobile_number | VARCHAR(20) | | Phone number |
| alternate_email | TEXT | | Alternate email |
| date_of_birth | DATE | | Date of birth |
| blood_group | VARCHAR(5) | | Blood group (A+, B-, etc.) |
| gender | VARCHAR(20) | | Gender |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:** email, user_type

---

### Departments
Organizational structure.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Department ID |
| name | TEXT | UNIQUE, NOT NULL | Department name |
| code | VARCHAR(20) | | Department code (CSE, EE, etc.) |
| department_head_id | UUID | FK → users.id | Head of department |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

**Sample Data:**
- CSE - Computer Science & Engineering
- EE - Electrical Engineering
- ME - Mechanical Engineering
- CHEM - Chemistry
- AF - Accounts & Finance
- EST - Establishment
- IT - IT Office
- LIB - Library

---

### Employees
Employee information (linked to users).

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Employee ID |
| user_id | UUID | UNIQUE, FK → users.id | Reference to user |
| employee_code | VARCHAR(50) | UNIQUE, NOT NULL | Employee code |
| designation | VARCHAR(100) | NOT NULL | Job title |
| employment_type | VARCHAR(50) | NOT NULL, CHECK | Permanent, Temporary, Contract, Project Staff, Tech Staff, Administrative |
| department_id | UUID | FK → departments.id | Department |
| date_of_joining | DATE | NOT NULL | Joining date |
| date_of_exit | DATE | | Exit date (if applicable) |
| permanent_address | TEXT | | Permanent address |
| reporting_officer_id | UUID | FK → employees.id | Reporting officer |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:** employee_code, department_id, reporting_officer_id

---

### Students
Student information (linked to users).

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Student ID |
| user_id | UUID | UNIQUE, FK → users.id | Reference to user |
| entry_number | VARCHAR(50) | UNIQUE, NOT NULL | Entry/Roll number |
| course_name | VARCHAR(100) | NOT NULL | Course name |
| department_id | UUID | FK → departments.id | Department |
| date_of_joining | DATE | NOT NULL | Joining date |
| date_of_exit | DATE | | Exit date |
| hostel_allocated | BOOLEAN | DEFAULT FALSE | Hostel allocation status |
| parent_name | TEXT | | Parent name |
| parent_mobile | VARCHAR(20) | | Parent mobile |
| parent_email | TEXT | | Parent email |
| local_guardian_name | TEXT | | Local guardian name |
| local_guardian_mobile | VARCHAR(20) | | Guardian mobile |
| local_guardian_email | TEXT | | Guardian email |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update time |

**Indexes:** entry_number, department_id

---

### Roles
Role definitions for access control.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Role ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Role name |
| description | TEXT | | Role description |
| permissions | JSONB | DEFAULT '{}' | Permission set |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

**Sample Roles:**
- Super Admin
- Institute Admin
- Department Head
- Section Head
- Reporting Officer
- Hostel Warden
- IT Admin
- Security Officer
- Student Affairs
- Guest House Admin

---

### User Roles
Maps users to roles (many-to-many).

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Mapping ID |
| user_id | UUID | FK → users.id | User reference |
| role_id | UUID | FK → roles.id | Role reference |
| department_id | UUID | FK → departments.id | Department (optional) |
| assigned_at | TIMESTAMP | DEFAULT NOW() | Assignment date |

---

## Email ID Request Tables

### Email ID Requests
Main form for email ID requests.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Request ID |
| applicant_id | UUID | FK → users.id | Applicant |
| applicant_name | TEXT | NOT NULL | Applicant name |
| applicant_initials | VARCHAR(10) | | Initials (Dr./Mr./Ms.) |
| gender | VARCHAR(20) | | Gender |
| permanent_address | TEXT | NOT NULL | Permanent address |
| organisation_id | VARCHAR(50) | | Organization ID |
| nature_of_engagement | VARCHAR(100) | NOT NULL, CHECK | Student, Faculty, Non-staff, Tech staff, Administrative |
| role | VARCHAR(100) | | Job role |
| department_id | UUID | FK → departments.id | Department |
| project_name | TEXT | | Project name (if applicable) |
| joining_date | DATE | NOT NULL | Joining date |
| anticipated_end_date | DATE | | End date (for temporary) |
| reporting_officer_name | TEXT | NOT NULL | Reporting officer name |
| reporting_officer_email | TEXT | NOT NULL | Reporting officer email |
| mobile_number | VARCHAR(20) | NOT NULL | Mobile number |
| alternate_email | TEXT | | Alternate email |
| status | VARCHAR(50) | NOT NULL, FK | Current status |
| assigned_email_id | TEXT | UNIQUE | Assigned email |
| email_created_date | TIMESTAMP | | Creation date |
| email_removal_date | DATE | | Removal date |
| email_created_by | UUID | FK → users.id | Created by (IT admin) |
| submitted_date | TIMESTAMP | DEFAULT NOW() | Submission date |
| submitted_by | UUID | FK → users.id | Submitted by |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:** status, applicant_id, assigned_email_id, department_id

**Status Values:**
- SUBMITTED - Initial submission
- PENDING_OFFICER - Awaiting reporting officer review
- APPROVED_BY_OFFICER - Officer approved
- PENDING_AUTHORITY - Awaiting authority review
- APPROVED_BY_AUTHORITY - Authority approved
- IN_PROGRESS - IT creating email
- COMPLETED - Email activated
- REJECTED - Application rejected
- CLOSED - Application closed

---

### Email Request Approvals
Approval workflow tracking.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Approval ID |
| email_request_id | UUID | FK → email_id_requests.id | Request reference |
| approval_stage | VARCHAR(100) | NOT NULL, CHECK | REPORTING_OFFICER, FORWARDING_AUTHORITY, IT_ADMIN |
| approved_by | UUID | FK → users.id | Approver |
| status | VARCHAR(50) | NOT NULL, CHECK | APPROVED, REJECTED, PENDING, CLARIFICATION_NEEDED |
| comments | TEXT | | Remarks |
| approved_date | TIMESTAMP | DEFAULT NOW() | Approval date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

### Email Policy Acknowledgments
Policy acceptance tracking.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Acknowledgment ID |
| user_id | UUID | UNIQUE, FK → users.id | User |
| email_request_id | UUID | FK → email_id_requests.id | Email request |
| policy_version | VARCHAR(20) | DEFAULT '2021-08-09' | Policy version |
| acknowledged | BOOLEAN | DEFAULT FALSE | Acceptance status |
| acknowledged_date | TIMESTAMP | | Acknowledgment date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

## Vehicle Sticker Tables

### Vehicle Sticker Applications
Main application form.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Application ID |
| applicant_id | UUID | FK → users.id | Applicant |
| applicant_name | TEXT | NOT NULL | Applicant name |
| applicant_type | VARCHAR(50) | NOT NULL, CHECK | Student or Staff |
| student_id | UUID | FK → students.id | Student reference |
| entry_number | VARCHAR(50) | | Student entry number |
| hostel_resident | BOOLEAN | | Hostel status |
| employee_id | UUID | FK → employees.id | Employee reference |
| employee_code | VARCHAR(50) | | Employee code |
| designation | VARCHAR(100) | | Designation |
| department_id | UUID | FK → departments.id | Department |
| address | TEXT | | Address |
| phone_number | VARCHAR(20) | NOT NULL | Phone number |
| email | TEXT | NOT NULL | Email |
| driving_license_number | VARCHAR(50) | NOT NULL | DL number |
| driving_license_valid_upto | DATE | NOT NULL | DL validity |
| status | VARCHAR(50) | NOT NULL, FK | Current status |
| submitted_date | TIMESTAMP | DEFAULT NOW() | Submission date |
| submitted_by | UUID | FK → users.id | Submitted by |
| created_at | TIMESTAMP | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:** status, applicant_id, student_id, employee_id

---

### Application Vehicles
Vehicles in an application (1:many relationship).

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Vehicle ID |
| application_id | UUID | FK → vehicle_sticker_applications.id | Application |
| sequence_number | INT | NOT NULL | Vehicle sequence |
| vehicle_registration_number | VARCHAR(50) | NOT NULL | Registration number |
| vehicle_type_id | UUID | FK → vehicle_types.id | Vehicle type |
| make_model | TEXT | NOT NULL | Make and model |
| colour | VARCHAR(50) | | Colour |
| primary_vehicle | BOOLEAN | DEFAULT FALSE | Primary vehicle indicator |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

**Sample Vehicle Types:**
- 2W - Two Wheeler
- 4W - Four Wheeler

---

### Vehicle Stickers
Issued sticker records.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Sticker ID |
| application_id | UUID | FK → vehicle_sticker_applications.id | Application |
| vehicle_id | UUID | FK → application_vehicles.id | Vehicle |
| sticker_number | VARCHAR(50) | UNIQUE, NOT NULL | Sticker number |
| issue_date | DATE | NOT NULL | Issue date |
| validity_period_days | INT | DEFAULT 365 | Validity days |
| valid_until | DATE | NOT NULL | Expiration date |
| issued_by | UUID | FK → users.id | Issued by (Security) |
| status | VARCHAR(50) | NOT NULL, CHECK | ACTIVE, EXPIRED, REVOKED, LOST |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:** sticker_number, valid_until, status

---

### Vehicle Sticker Approvals
Approval workflow.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Approval ID |
| application_id | UUID | FK → vehicle_sticker_applications.id | Application |
| approval_stage | VARCHAR(100) | NOT NULL, CHECK | SUPERVISOR, HOD, STUDENT_AFFAIRS, SECURITY |
| approved_by | UUID | FK → users.id | Approver |
| status | VARCHAR(50) | NOT NULL, CHECK | APPROVED, REJECTED, PENDING, CLARIFICATION_NEEDED |
| comments | TEXT | | Comments |
| approved_date | TIMESTAMP | DEFAULT NOW() | Approval date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

## Hostel Information Tables

### Hostel Information Forms
Main hostel form.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Form ID |
| student_id | UUID | UNIQUE, FK → students.id | Student |
| hostel_id | UUID | FK → hostels.id | Assigned hostel |
| room_id | UUID | FK → hostel_rooms.id | Assigned room |
| student_name | TEXT | NOT NULL | Student name |
| entry_number | VARCHAR(50) | NOT NULL | Entry number |
| course_name | TEXT | NOT NULL | Course |
| department_id | UUID | FK → departments.id | Department |
| email | TEXT | NOT NULL | Email |
| date_of_joining | DATE | NOT NULL | Joining date |
| blood_group | VARCHAR(5) | | Blood group |
| category | VARCHAR(50) | | Category (SC/ST/OBC) |
| emergency_contact_number | VARCHAR(20) | | Emergency contact |
| hef_amount | DECIMAL(10,2) | DEFAULT 0 | HEF fee |
| mess_security | DECIMAL(10,2) | DEFAULT 0 | Mess security |
| mess_admission_fee | DECIMAL(10,2) | DEFAULT 0 | Mess admission fee |
| mess_charges | DECIMAL(10,2) | DEFAULT 0 | Mess charges |
| parent_name | TEXT | NOT NULL | Parent name |
| parent_office_address | TEXT | | Parent office address |
| parent_residence_address | TEXT | | Parent residence |
| parent_mobile_office | VARCHAR(20) | | Parent office mobile |
| parent_mobile_residence | VARCHAR(20) | | Parent residence mobile |
| parent_telephone_office | VARCHAR(20) | | Parent office phone |
| parent_telephone_residence | VARCHAR(20) | | Parent residence phone |
| parent_email_office | TEXT | | Parent office email |
| parent_email_residence | TEXT | | Parent residence email |
| has_local_guardian | BOOLEAN | DEFAULT FALSE | Local guardian presence |
| guardian_name | TEXT | | Guardian name |
| guardian_office_address | TEXT | | Guardian office address |
| guardian_residence_address | TEXT | | Guardian residence |
| guardian_mobile_office | VARCHAR(20) | | Guardian office mobile |
| guardian_mobile_residence | VARCHAR(20) | | Guardian residence mobile |
| guardian_telephone_office | VARCHAR(20) | | Guardian office phone |
| guardian_telephone_residence | VARCHAR(20) | | Guardian residence phone |
| guardian_email_office | TEXT | | Guardian office email |
| guardian_email_residence | TEXT | | Guardian residence email |
| undertaking_read | BOOLEAN | DEFAULT FALSE | Read undertaking |
| undertaking_accepted | BOOLEAN | DEFAULT FALSE | Accepted undertaking |
| undertaking_signed_date | TIMESTAMP | | Signature date |
| status | VARCHAR(50) | NOT NULL, FK | Current status |
| submitted_date | TIMESTAMP | DEFAULT NOW() | Submission date |
| submitted_by | UUID | FK → users.id | Submitted by |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:** status, student_id, hostel_id

**Status Values:**
- SUBMITTED - Initial submission
- UNDERTAKING_SIGNED - Undertaking signed
- UNDER_REVIEW - Under management review
- PENDING_WARDEN - Awaiting warden approval
- APPROVED - Approved
- ROOM_ASSIGNED - Room allocated
- COMPLETED - Active resident
- REJECTED - Rejected
- SUSPENDED - Suspended
- TERMINATED - Terminated

---

### Hostel Information Approvals
Approval tracking.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Approval ID |
| hostel_form_id | UUID | FK → hostel_information_forms.id | Form |
| approval_stage | VARCHAR(100) | NOT NULL, CHECK | HOSTEL_MANAGEMENT, WARDEN |
| approved_by | UUID | FK → users.id | Approver |
| status | VARCHAR(50) | NOT NULL, CHECK | APPROVED, REJECTED, PENDING, CLARIFICATION_NEEDED |
| comments | TEXT | | Comments |
| approved_date | TIMESTAMP | DEFAULT NOW() | Approval date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

### Hostel Room Assignments
Room allocation history.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Assignment ID |
| hostel_form_id | UUID | FK → hostel_information_forms.id | Form |
| room_id | UUID | FK → hostel_rooms.id | Room |
| assigned_date | TIMESTAMP | DEFAULT NOW() | Assignment date |
| checkout_date | TIMESTAMP | | Checkout date |
| status | VARCHAR(50) | NOT NULL, CHECK | ACTIVE, COMPLETED, CANCELLED |
| reason | TEXT | | Cancellation reason |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

### Hostel Mess Assignments
Mess status tracking.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Assignment ID |
| hostel_form_id | UUID | FK → hostel_information_forms.id | Form |
| mess_enabled | BOOLEAN | DEFAULT TRUE | Mess status |
| mess_start_date | DATE | | Mess start date |
| mess_end_date | DATE | | Mess end date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

### Hostels
Hostel definitions.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Hostel ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Hostel name |
| code | VARCHAR(20) | | Hostel code |
| warden_id | UUID | FK → users.id | Warden |
| category | VARCHAR(50) | NOT NULL, CHECK | Boys, Girls, Mixed, Faculty |
| total_rooms | INT | | Total rooms |
| description | TEXT | | Description |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

**Sample Hostels:**
- Boys Hostel 1
- Girls Hostel 1
- Faculty Quarters

---

### Hostel Rooms
Individual hostel rooms.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Room ID |
| hostel_id | UUID | FK → hostels.id | Hostel |
| room_number | VARCHAR(20) | NOT NULL | Room number |
| bed_capacity | INT | DEFAULT 1 | Bed count |
| occupancy_type | VARCHAR(50) | NOT NULL, CHECK | Single, Double, Triple, Multi |
| status | VARCHAR(50) | NOT NULL, CHECK | AVAILABLE, OCCUPIED, MAINTENANCE, BLOCKED |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

## Guest House Tables

### Guest House Reservations
Main reservation form.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Reservation ID |
| reservation_number | VARCHAR(50) | UNIQUE, NOT NULL | Reservation number |
| proposer_id | UUID | FK → users.id | Proposer |
| proposer_name | TEXT | NOT NULL | Proposer name |
| proposer_department_id | UUID | FK → departments.id | Department |
| proposer_designation | VARCHAR(100) | | Designation |
| proposer_mobile | VARCHAR(20) | | Mobile |
| proposer_email | TEXT | NOT NULL | Email |
| guest_name | TEXT | NOT NULL | Guest name |
| guest_gender | VARCHAR(20) | | Gender |
| guest_address | TEXT | | Address |
| guest_contact_number | VARCHAR(20) | | Contact |
| guest_email | TEXT | | Email |
| booking_purpose_id | UUID | FK → booking_purposes.id | Purpose |
| purpose_description | TEXT | | Description |
| check_in_date | DATE | NOT NULL | Check-in date |
| check_in_time | TIME | | Check-in time |
| check_out_date | DATE | NOT NULL | Check-out date |
| check_out_time | TIME | | Check-out time |
| number_of_guests | INT | NOT NULL | Guest count |
| number_of_rooms | INT | NOT NULL | Room count |
| room_id | UUID | FK → guest_house_rooms.id | Assigned room |
| category_id | UUID | FK → guest_room_categories.id | Room category |
| special_requirements | TEXT | | Special requirements |
| meal_requirements | TEXT | | Meal preferences |
| room_rate_per_night | DECIMAL(10,2) | | Nightly rate |
| number_of_nights | INT | | Number of nights |
| room_charges | DECIMAL(10,2) | | Room charges |
| meal_charges | DECIMAL(10,2) | DEFAULT 0 | Meal charges |
| service_charges | DECIMAL(10,2) | DEFAULT 0 | Service charges |
| damage_charges | DECIMAL(10,2) | DEFAULT 0 | Damage charges |
| gst_percentage | DECIMAL(5,2) | DEFAULT 0 | GST % |
| gst_amount | DECIMAL(10,2) | DEFAULT 0 | GST amount |
| total_charges | DECIMAL(10,2) | | Total charges |
| billing_department_id | UUID | FK → departments.id | Billing department |
| billing_to | VARCHAR(100) | CHECK | Department, Institute Fund, Guest, Project |
| payment_method | VARCHAR(50) | | Payment method |
| payment_status | VARCHAR(50) | NOT NULL, CHECK | PENDING, PARTIAL, COMPLETED |
| payment_date | TIMESTAMP | | Payment date |
| status | VARCHAR(50) | NOT NULL, FK | Current status |
| confirmation_number | VARCHAR(50) | | Confirmation number |
| submitted_date | TIMESTAMP | DEFAULT NOW() | Submission date |
| submitted_by | UUID | FK → users.id | Submitted by |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update |

**Indexes:** status, proposer_id, room_id, check_in_date

**Status Values:**
- SUBMITTED, PENDING_SUPERVISOR, APPROVED_BY_SUPERVISOR
- PENDING_HOD, APPROVED_BY_HOD
- PENDING_COMMITTEE, APPROVED_BY_COMMITTEE
- PENDING_MANAGEMENT, CONFIRMED, CHECK_IN, ACTIVE, CHECK_OUT
- COMPLETED, REJECTED, CANCELLED, NO_SHOW, WAITLISTED

---

### Guest House Approvals
Approval workflow.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Approval ID |
| reservation_id | UUID | FK → guest_house_reservations.id | Reservation |
| approval_stage | VARCHAR(100) | NOT NULL, CHECK | SUPERVISOR, HOD, COMMITTEE, MANAGEMENT |
| approved_by | UUID | FK → users.id | Approver |
| status | VARCHAR(50) | NOT NULL, CHECK | APPROVED, REJECTED, PENDING, CONDITIONAL_APPROVAL |
| comments | TEXT | | Comments |
| approved_date | TIMESTAMP | DEFAULT NOW() | Approval date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

### Guest House Check-ins
Check-in/checkout tracking.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Record ID |
| reservation_id | UUID | FK → guest_house_reservations.id | Reservation |
| actual_check_in_date | TIMESTAMP | | Actual check-in |
| actual_check_out_date | TIMESTAMP | | Actual check-out |
| room_condition_checkin | TEXT | | Initial condition |
| room_condition_checkout | TEXT | | Final condition |
| damage_report | TEXT | | Damage details |
| checked_in_by | UUID | FK → users.id | Checked in by |
| checked_out_by | UUID | FK → users.id | Checked out by |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

### Guest House Additional Charges
Additional charges tracking.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Charge ID |
| reservation_id | UUID | FK → guest_house_reservations.id | Reservation |
| service_type | VARCHAR(100) | NOT NULL, CHECK | Extra Bed, Meal, Laundry, Late Checkout, Special Service |
| quantity | INT | DEFAULT 1 | Quantity |
| unit_rate | DECIMAL(10,2) | NOT NULL | Unit rate |
| total_amount | DECIMAL(10,2) | NOT NULL | Total amount |
| added_date | TIMESTAMP | DEFAULT NOW() | Added date |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

### Guest Houses
Guest house definitions.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | House ID |
| name | VARCHAR(100) | UNIQUE, NOT NULL | House name |
| code | VARCHAR(20) | | House code |
| administrator_id | UUID | FK → users.id | Administrator |
| phone_number | VARCHAR(20) | | Phone |
| email | TEXT | | Email |
| address | TEXT | | Address |
| description | TEXT | | Description |
| total_rooms | INT | | Total rooms |
| active | BOOLEAN | DEFAULT TRUE | Active status |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

### Guest Room Categories
Room types and pricing.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Category ID |
| code | VARCHAR(20) | UNIQUE, NOT NULL | Category code |
| name | VARCHAR(100) | NOT NULL | Category name |
| description | TEXT | | Description |
| nightly_rate | DECIMAL(10,2) | NOT NULL | Nightly rate |
| occupancy_capacity | INT | DEFAULT 2 | Occupancy |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

**Sample Categories:**
- EXEC_SUITE - Executive Suite (₹700/night)
- BUS_ROOM - Business Room (₹450/night)
- STD_ROOM - Standard Room (₹300/night)

---

### Guest House Rooms
Individual rooms.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Room ID |
| guest_house_id | UUID | FK → guest_houses.id | Guest house |
| room_number | VARCHAR(20) | NOT NULL | Room number |
| category_id | UUID | FK → guest_room_categories.id | Category |
| status | VARCHAR(50) | NOT NULL, CHECK | AVAILABLE, OCCUPIED, MAINTENANCE, BLOCKED |
| occupancy_capacity | INT | DEFAULT 2 | Occupancy |
| amenities | JSONB | DEFAULT '[]' | Amenities list |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

---

### Booking Purposes
Reservation purpose types.

| Field | Type | Constraints | Description |
|-------|------|-----------|-------------|
| id | UUID | PRIMARY KEY | Purpose ID |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Purpose code |
| name | VARCHAR(100) | NOT NULL | Purpose name |
| description | TEXT | | Description |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation time |

**Sample Purposes:**
- MEETING - Official Meeting
- CONFERENCE - Conference
- WORKSHOP - Workshop
- TRAINING - Training
- COLLAB - Research Collaboration
- FAMILY - Family Visit
- OTHER - Other

---

## Status & Enumeration Tables

### Status Enumerations

All status values are managed through lookup tables to maintain data integrity:
- email_request_statuses
- vehicle_sticker_statuses
- hostel_statuses
- guest_house_statuses

These tables can be queried to get valid status values.

---

## Relationships & Constraints

### Primary Relationships

```
users (1) ──┬── (N) employees
            ├── (N) students
            ├── (N) user_roles
            └── (N) approvals/submissions

departments (1) ──┬── (N) employees
                  ├── (N) students
                  └── (N) user_roles

employees (1) ──┬── (N) vehicle_sticker_applications
                ├── (N) email_id_requests
                └── (1) reporting_officer (self-join)

students (1) ──┬── (1) hostel_information_forms
               └── (N) vehicle_sticker_applications

email_id_requests (1) ──┬── (N) email_request_approvals
                        └── (1) email_policy_acknowledgments

vehicle_sticker_applications (1) ──┬── (N) application_vehicles
                                    ├── (N) vehicle_stickers
                                    └── (N) vehicle_sticker_approvals

application_vehicles (1) ──── (N) vehicle_stickers

hostel_information_forms (1) ──┬── (N) hostel_information_approvals
                               ├── (1) hostel_room_assignments
                               └── (1) hostel_mess_assignments

hostels (1) ──── (N) hostel_rooms

hostel_rooms (1) ──── (N) hostel_room_assignments

guest_house_reservations (1) ──┬── (N) guest_house_approvals
                               ├── (1) guest_house_check_ins
                               └── (N) guest_house_additional_charges

guest_houses (1) ──── (N) guest_house_rooms

guest_room_categories (1) ──── (N) guest_house_rooms
```

### Referential Integrity

All foreign keys enforce:
- **ON DELETE CASCADE** for approvals and related records
- **ON DELETE RESTRICT** for core entities (users, departments)

### Unique Constraints

Ensures data integrity:
- users.email (unique)
- employees.employee_code (unique per system)
- students.entry_number (unique per system)
- email_id_requests.assigned_email_id (unique when assigned)
- vehicle_stickers.sticker_number (unique)
- hostel_information_forms.student_id (one-to-one)
- guest_house_reservations.reservation_number (unique)

---

## Query Examples

### Get user with all roles
```typescript
const user = await getUser(userId)
const roles = await getUserRoles(userId)
```

### Get pending email requests for approval
```typescript
const pending = await getPendingEmailRequests()
const forOfficer = pending.filter(r => r.status === 'SUBMITTED')
```

### Get vehicle sticker application details
```typescript
const app = await getVehicleApplicationWithDetails(appId)
console.log(app.vehicles) // All vehicles
console.log(app.stickers) // Issued stickers
console.log(app.approvals) // Approval history
```

### Check hostel status for student
```typescript
const status = await getStudentHostelStatus(studentId)
if (status.isCurrentlyResident) {
  console.log(`Room: ${status.assignment.room_id}`)
}
```

### Get guest house reservations for date range
```typescript
const reservations = await getReservationsByDateRange(
  '2026-03-15',
  '2026-03-20'
)
```

### Generate reports
```typescript
const expiredStickers = await getExpiredStickers()
const unapprovedForms = await getPendingHostelForms()
const activeReservations = await getUpcomingReservations()
```

---

## Row-Level Security (RLS)

All tables have RLS enabled. Policies are defined for:
- Users can read their own data
- Users can update their own profile
- Approvers can read pending requests
- Department heads can manage their department

Add additional policies based on your auth setup.

---

## Performance Considerations

### Indexes Created
- Email: users.email
- User type: users.user_type
- Employee codes: employees.employee_code
- Room status: hostel_rooms.status
- Sticker validity: vehicle_stickers.valid_until
- Reservation dates: guest_house_reservations.check_in_date

### Query Optimization
- Use date filters for historical queries
- Limit result sets in list queries
- Use aggregation for statistics
- Consider caching role-based permissions

---

## Maintenance & Archival

### Data Retention
- Completed forms: Keep for audit (2 years minimum)
- Expired stickers: Archive after 1 year
- Historical approvals: Retain indefinitely for compliance

### Regular Tasks
- Archive completed reservations quarterly
- Update hostel allocations semester-wise
- Review and update department hierarchies
- Clean up expired email removal records

---

## Future Extensions

### Planned Additions
- Integration with payment gateway for guest house billing
- Email notification system
- File attachment storage (licenses, documents)
- Audit logs for all administrative actions
- Analytics dashboard for form submissions
- Mobile app API endpoints

---

## Support & Documentation

For technical support or schema updates, refer to:
- [Database Setup Instructions](./README.md)
- Migration files: `db/migrations/`
- Query helper functions: `db/queries/`
- Type definitions: `db/schema.ts`
