# Database Setup

This folder contains the complete database setup for the DEP_FORMS project, including migrations, TypeScript schemas, query helpers, and seed data.

## 📁 Folder Structure

```
db/
├── migrations/       # SQL migration files (run in order)
│   ├── 001_core_tables.sql
│   ├── 002_email_id_request_tables.sql
│   ├── 003_vehicle_sticker_tables.sql
│   ├── 004_hostel_information_tables.sql
│   └── 005_guest_house_tables.sql
├── queries/          # TypeScript query functions
│   ├── common.ts     # Core user/dept/employee queries
│   ├── email_requests.ts
│   ├── vehicle_stickers.ts
│   ├── hostel.ts
│   └── guest_house.ts
├── seeds/            # Initial data population
│   └── seed.ts       # Run: npm run seed
├── schema.ts         # Complete TypeScript type definitions
├── README.md         # This file
└── ../DB_SCHEMA.md   # Comprehensive schema documentation
```

## 🚀 Quick Start

### Step 1: Run Migrations

Migrations must be run in order in your Supabase SQL Editor:

**In Supabase Dashboard:**
1. Go to **SQL Editor**
2. Click **New Query**
3. Copy & paste content from each migration file (001 → 005)
4. Click **Run**

**File order (MUST RUN IN THIS ORDER):**
1. `001_core_tables.sql` - Users, departments, employees, students
2. `002_email_id_request_tables.sql` - Email ID request module
3. `003_vehicle_sticker_tables.sql` - Vehicle sticker module
4. `004_hostel_information_tables.sql` - Hostel module
5. `005_guest_house_tables.sql` - Guest house module

### Step 2: Seed Initial Data

Populate default data:

```bash
npm run seed
```

This will create:
- 10 roles (Super Admin, Department Head, IT Admin, etc.)
- 8 departments (CSE, EE, Mechanical, Chemistry, Finance, etc.)
- 2 guest houses with 13 rooms
- 3 hostels with 25 rooms

### Step 3: Verify Setup

Check migrations ran successfully:
```sql
-- In Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see 40+ tables.

### Step 4: Import Types & Queries

In your Next.js components:

```typescript
import { User, Employee, Student } from '@/db/schema'
import { getUser, getUserByEmail } from '@/db/queries/common'
import { getEmailRequestsByApplicant } from '@/db/queries/email_requests'
```

---

## 📊 Database Modules

### 1. Core Tables (001)
**Purpose:** Foundation data for user management

| Table | Purpose |
|-------|---------|
| users | All users (employees, students, faculty, admins) |
| departments | Organizational departments |
| employees | Employee records |
| students | Student records |
| roles | Role definitions for access control |
| user_roles | User-role mappings |

### 2. Email ID Request (002)
**Purpose:** Email account provisioning workflow

| Table | Purpose |
|-------|---------|
| email_id_requests | Main email request forms |
| email_request_approvals | Approval tracking (officer → authority → IT) |
| email_policy_acknowledgments | Policy acceptance tracking |
| email_request_statuses | Status lookup |

**Workflow:** Applicant → Reporting Officer → Forwarding Authority → IT Admin → Email Assigned

### 3. Vehicle Sticker (003)
**Purpose:** Vehicle pass issuance workflow

| Table | Purpose |
|-------|---------|
| vehicle_sticker_applications | Application forms |
| application_vehicles | Vehicles in application (1-to-many) |
| vehicle_stickers | Issued sticker records |
| vehicle_sticker_approvals | Approval tracking |
| vehicle_types | Lookup: 2W, 4W |
| vehicle_sticker_statuses | Status lookup |

**Workflow:** Student/Staff → Supervisor/HoD → Student Affairs → Security → Sticker Issued

### 4. Hostel Information (004)
**Purpose:** Hostel accommodation management

| Table | Purpose |
|-------|---------|
| hostel_information_forms | Student hostel intake forms |
| hostel_information_approvals | Approval tracking |
| hostel_room_assignments | Room allocation & checkout history |
| hostel_mess_assignments | Mess status for student |
| hostels | Hostel definitions |
| hostel_rooms | Individual rooms |
| hostel_statuses | Status lookup |

**Workflow:** Student fills form → Signs undertaking → Hostel Management review → Warden approval → Room assigned → Active

### 5. Guest House (005)
**Purpose:** Guest accommodation and reservation management

| Table | Purpose |
|-------|---------|
| guest_house_reservations | Main reservation forms |
| guest_house_approvals | Multi-stage approvals |
| guest_house_check_ins | Check-in/out records |
| guest_house_additional_charges | Extra charges tracking |
| guest_houses | Guest house definitions |
| guest_house_rooms | Individual rooms |
| guest_room_categories | Room types & pricing |
| booking_purposes | Purpose lookup |
| guest_house_statuses | Status lookup |

**Workflow:** Proposer → Supervisor → HoD → Committee → Management → Room Assigned → Check-in → Check-out → Billing

---

## 💻 Code Examples

### Get Current User
```typescript
import { supabase } from '@/lib/supabase'
import { getUser } from '@/db/queries/common'

const user = await getUser(userId)
console.log(user.full_name, user.email)
```

### Email Request Workflow
```typescript
import { 
  getEmailRequestsByApplicant,
  approveEmailRequest,
  assignEmailId 
} from '@/db/queries/email_requests'

// Get pending requests for user
const requests = await getEmailRequestsByApplicant(userId)

// Approve at reporting officer stage
await approveEmailRequest(requestId, officerId, 'REPORTING_OFFICER', 'Approved')

// After IT approval, assign email
await assignEmailId(requestId, 'john.doe@iitropar.ac.in', itAdminId)
```

### Vehicle Sticker Workflow
```typescript
import { 
  getVehicleApplicationsByStudent,
  addVehicleToApplication,
  createVehicleSticker,
  approveVehicleApplication
} from '@/db/queries/vehicle_stickers'

// Student submit application
const app = await createVehicleApplication({
  applicant_id: studentId,
  applicant_type: 'Student',
  student_id: studentId,
  driving_license_number: 'DL-123456',
  // ... other fields
})

// Add vehicle
await addVehicleToApplication({
  application_id: app.id,
  vehicle_registration_number: 'HR01AB1234',
  vehicle_type_id: vehicleTypeId,
  make_model: 'Honda Activa'
})

// Approve at various stages
await approveVehicleApplication(app.id, approverID, 'STUDENT_AFFAIRS')

// Security officer issues sticker
const sticker = await createVehicleSticker({
  application_id: app.id,
  vehicle_id: vehicleId,
  sticker_number: 'STK-2026-001',
  issue_date: '2026-03-05',
  valid_until: '2027-03-05',
  issued_by: securityOfficerId,
  status: 'ACTIVE'
})
```

### Hostel Management
```typescript
import { 
  getHostelFormByStudent,
  signUndertaking,
  assignRoomToStudent,
  getStudentHostelStatus
} from '@/db/queries/hostel'

// Student submits form
const form = await createHostelForm({
  student_id: studentId,
  student_name: 'John Doe',
  // ... parent & guardian details
})

// Student signs undertaking
await signUndertaking(form.id)

// Hostel warden approves and assigns room
await assignRoomToStudent(form.id, roomId)

// Check student's current status
const status = await getStudentHostelStatus(studentId)
if (status.isCurrentlyResident) {
  console.log(`Active in room: ${status.assignment.room_id}`)
}

// Student checkout
await checkoutStudent(assignmentId, 'Semester end')
```

### Guest House Reservation
```typescript
import { 
  generateReservationNumber,
  createReservation,
  confirmReservation,
  checkInGuest,
  addAdditionalCharge,
  checkOutGuest
} from '@/db/queries/guest_house'

// Create reservation
const res = await createReservation({
  reservation_number: await generateReservationNumber(),
  proposer_id: facultyId,
  proposer_name: 'Dr. Smith',
  guest_name: 'Dr. Johnson',
  check_in_date: '2026-03-20',
  check_out_date: '2026-03-22',
  number_of_guests: 2,
  number_of_rooms: 1,
  booking_purpose_id: meetingPurposeId,
  total_charges: 1400
})

// After approvals, confirm and assign room
await confirmReservation(res.id, 'CONF-2026-001')

// Guest arrives
await checkInGuest(res.id, frontDeskStaffId)

// Add charges during stay
await addAdditionalCharge({
  reservation_id: res.id,
  service_type: 'Laundry',
  quantity: 5,
  unit_rate: 50,
  total_amount: 250
})

// Guest leaves
await checkOutGuest(res.id, staffId, 'No issues')
```

---

## 🔐 Security Features

### Row-Level Security (RLS)
All tables have RLS enabled:
- Users can view their own profiles
- Department heads can manage their department data
- Admins have elevated permissions

### Audit Trail
All approvals are tracked with:
- Who approved
- When they approved
- What they approved
- Comments

### Data Integrity
- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicates
- Check constraints validate enum values
- Timestamps track all changes

---

## 📈 Performance

### Indexes on Key Columns
- Frequently searched: email, employee_code, entry_number
- Date ranges: check_in_date, valid_until
- Status queries: status, user_type

### Query Tips
- Use date filters for history queries
- Limit lists to 50 results initially
- Pre-load relationships with `.select('*, related_table!inner(*)')`
- Cache role-based permissions

---

## 🆘 Troubleshooting

### Migrations failed
- Check syntax errors in SQL
- Run migrations in correct order (001 → 005)
- Ensure dependencies exist (e.g., users before employees)

### Seed doesn't work
- Verify migrations ran successfully
- Check `@supabase/supabase-js` is installed: `npm install @supabase/supabase-js`
- Verify `.env.local` has correct credentials

### Queries return no data
- Check row-level security policies
- Verify data exists: `SELECT * FROM table_name LIMIT 1`
- Check timestamps/dates aren't filtering incorrectly

### TypeScript errors
- Run: `npm run build` to regenerate types
- Check import paths: `@/db/schema`, `@/db/queries/xxx`

---

## 📚 Complete Documentation

Comprehensive schema documentation:  
**→ [DB_SCHEMA.md](../DB_SCHEMA.md)**

Includes:
- All table definitions with field descriptions
- Complete relationships and constraints
- Sample data and values
- Advanced query examples
- Performance considerations
- Maintenance guidelines

---

## 🎯 Next Steps

1. ✅ Run migrations 001-005 in order
2. ✅ Execute `npm run seed`
3. ✅ Test sample queries
4. ✅ Review [DB_SCHEMA.md](../DB_SCHEMA.md) for full documentation
5. ✅ Implement forms using query functions
6. ✅ Set up approval workflows
7. ✅ Configure RLS policies per your auth setup

---

## 📝 Quick Reference

| Need | Location |
|------|----------|
| Table definitions | `DB_SCHEMA.md` |
| TypeScript types | `schema.ts` |
| Query examples | `queries/*.ts` |
| Run migrations | Supabase SQL Editor |
| Seed data | `npm run seed` |
| Module workflows | `forms_flow/*.md` |

---

## ✉️ Support

For issues or questions:
- Check [DB_SCHEMA.md](../DB_SCHEMA.md) for detailed docs
- Review example queries in `queries/` files
- Check Supabase dashboard for data
- Verify RLS policies aren't blocking access
