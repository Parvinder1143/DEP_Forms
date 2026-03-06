# Guest House Reservation Workflow

## Stakeholders

1. **Applicant / Proposer** *(Faculty / Staff / Department)*
2. **Supervisor / Recommending Authority** *(For verification)*
3. **Head of Department** *(For approval)*
4. **Guest House Committee / Chairman**
5. **Guest House Management / Administrator**
6. **Accounts / Finance Section** *(For billing)*

---

# Step-by-Step Flow

## 1️⃣ Applicant / Proposer Submits Reservation Request

Faculty, Staff, or Department representative logs into portal and submits Guest House Reservation request form.

Required details include:

**Guest Information:**
* Name of Guest
* Gender *(Male / Female)*
* Address of Guest
* Contact Number
* Email ID

**Reservation Details:**
* Purpose of Booking *(Official Meeting / Conference / Workshop / Training / Research Collaboration / Family Visit / Other)*
* Arrival Information:
  - Date
  - Time
* Departure Information:
  - Date
  - Time
* Number of Guests *(Total count)*
* Number of Rooms Required

**Room Category Selection:**
* Suite Room preferred *(Executive Suite / Business Room / Standard Room)*
* Special Requirements *(if any)*

**Applicant / Proposer Information:**
* Name of Applicant/Proposer
* Department
* Employee Code / Staff Number
* Designation
* Mobile Number
* Email ID

**Supporting Information:**
* Purpose of booking details
* Expected additional expenses
* Special meal requirements (if applicable)

System creates reservation record:

```
Form.status = SUBMITTED
Reservation.status = PENDING_APPROVAL
```

---

# 2️⃣ Supervisor / Recommending Authority Review

Reservation forwarded to:

```
Supervisor / Recommending Authority
(Department Head / Section Head / Project Lead)
```

Responsibility:

* Verify applicant authorization to book guest house
* Confirm legitimate business/academic purpose
* Validate guest details and necessity
* Check department budget availability
* Cross-verify room requirements with expected guest number

Decision:

```
Recommended
Not Recommended
Further Information Needed
```

If **Not Recommended → Reservation Rejected**

If **Further Information Needed → Returned to Proposer for Clarification**

If **Recommended → Forward to Head of Department**

---

# 3️⃣ Head of Department Approval

Reservation moves to:

```
Head of Department (HoD)
```

Responsibility:

* Final departmental authorization
* Confirm business validity and urgency
* Verify no conflicts with other departmental commitments
* Ensure budget code provided
* Approve room category and pricing tier

Decision options:

```
Approved
Not Approved
Conditional Approval (with modifications)
```

If **Not Approved → Reservation Rejected**

If **Conditional Approval → Changes communicated to applicant**

If **Approved → Forward to Guest House Committee**

---

# 4️⃣ Guest House Committee / Chairman Review

Reservation reaches:

```
Guest House Committee / Chairman
```

Responsibility:

* Verify room availability for requested dates
* Cross-check no double-booking conflicts exist
* Assess special requirements feasibility
* Determine room category fit for guest category
* Review guest eligibility per institute policy

Room Category Eligibility:

```
Executive Suite Rooms:
• Institute Invited Guests
• Chairman, BOG and Directors of IITs and other CFTIs
• VCs of CFTIs
• Experts for selection committees

Business Rooms:
• Faculty staff for professional/family relative
• IIT Ropar Alumni
• Official/Government Officials/Administration

Standard Rooms:
• Staff family or spouse of student
• Official Government Officials paid via budget head
• Any other guests with permission of Director
```

Decision:

```
Approved
Approved with modifications
Not Approved
Waitlist (if dates claimed but not blocked)
```

If **Not Approved → Reservation Rejected with reason**

If **Approved with Modifications → Changes communicated** (e.g., different dates / room category)

If **Approved → Move to Guest House Management**

---

# 5️⃣ Guest House Management - Booking Confirmation

Reservation confirmed by:

```
Guest House Management / Administrator
```

Responsibility:

* Finalize room category assignment
* Generate **Booking Confirmation Number**
* Calculate charges based on category and duration
* Create billing invoice
* Arrange room preparation and servicing
* Schedule check-in and checkout procedures
* Generate terms & conditions document

System records:

```
Booking Confirmation Number
Room Assigned (Category & Number)
Check-in Date & Time
Check-out Date & Time
Room Tariff
Total Charges
Booking Manager
```

Communication sent to:

* **Applicant/Proposer** - Room details, confirmation, check-in instructions
* **Guest** (if email available) - Welcome letter, facility information
* **Guest House Manager** - Preparation checklist

---

# 6️⃣ Guest Check-In & Accommodation

Guest checked into assigned room:

* Room inspection performed
* Amenities verified and explained
* Key provided (physical or digital)
* Emergency contacts shared
* House rules orientation
* Special requests accommodated

System records:

```
Actual Check-in Date & Time
Room Condition (photos if applicable)
Special Requests Noted
```

---

# 7️⃣ During Guest Stay

Guest House Management responsibilities:

* Daily housekeeping and room maintenance
* Address guest complaints and requests
* Arrange additional services if needed
* Monitor compliance with guest house policies
* Record usage of additional facilities (dining, laundry, etc.)

Charges tracked:

```
Room Charges (per category & night)
Additional Meal Charges
Laundry Service Charges
Extra Services (if applicable)
```

---

# 8️⃣ Guest Check-Out

Guest checkout process:

* Room inspection for damages
* Return of room keys
* Final account settlement
* Damage/breakage charges added (if any)
* Guest feedback collected
* Checkout certificate issued (if required)

System records:

```
Actual Check-out Date & Time
Room Condition Report
Final Charges Calculated
Payment Status
Checkout Completed By (Staff Name)
```

---

# 9️⃣ Invoice & Payment Processing

Billing finalized by:

```
Accounts / Finance Section
```

Invoice includes:

```
Room Charges:       [Category × Number of Nights]
Meal Charges:       [Optional add-ons]
Service Charges:    [If applicable]
Damage Charges:     [If any]
GST (if applicable)
                    _______________
Total Amount Due:   [Final Amount]
```

Billing to:

* Department Head (official expense)
* Institute Fund (if approved)
* Guest/Proposer (private expense)

Payment method:

```
Online Payment
Check/Draft
Direct Bank Transfer
IOUs (if approved)
```

Final system state:

```
Reservation.status = COMPLETED
Billing.status = PROCESSED
Payment.status = [PENDING/COMPLETED]
```

---

# Special Conditions & Policies

## Booking Terms:

* **Minimum Stay:** 1 night
* **Maximum Stay:** As per committee approval
* **Advance Booking:** Minimum 3-4 weeks advance notice recommended
* **Cancellation:** 
  - 7+ days before check-in: Full refund
  - 3-6 days before: 50% charge
  - 1-2 days before: 75% charge
  - No-show: Full charge

## Guest Eligibility:

* Invited official guests of institute
* Faculty/staff family members
* Alumni with justification
* Government/institutional representatives
* Research collaborators and visiting faculty

## Room Category Rates:

| Category | Nightly Rate | Occupancy | Amenities |
|----------|-------------|----------|-----------|
| Executive Suite (Cat A) | ₹ 700+ | 1-2 | AC, WiFi, Attached Bath, TV |
| Business Room (Cat B) | ₹ 350-500 | 1-2 | AC, WiFi, Attached Bath |
| Standard Room (Cat A/B) | ₹ 250-300 | 1-2 | Basic amenities |

*Note: Rates subject to change per committee decision*

## Additional Charges:

```
Extra Bed:              ₹ 100-150 per night
Meal (Breakfast):       ₹ 100-150
Meal (Lunch/Dinner):    ₹ 150-200
Laundry Service:        ₹ 50-100 per item
Late Checkout (hourly): ₹ 50 per hour
```

## House Rules:

* Quiet hours: 10 PM - 8 AM (noise restrictions)
* Visitors: Limited to designated hours
* Alcohol: Not permitted in rooms
* Smoking: Designated areas only / Non-smoking rooms strictly
* Damage: Guest liable for breakage/damage
* Checkout: By 12:00 noon (unless prior arrangement)
* Key return: Mandatory at checkout

---

# Final Approval Chain

```
Applicant/Proposer
   ↓
Submit Guest House Reservation Request
   ↓
Supervisor / Recommending Authority Review
   ↓
Head of Department Approval
   ↓
Guest House Committee / Chairman Review
   ↓
Room Availability Verified
   ↓
Guest House Management Confirmation
   ↓
Booking Confirmation Sent to Applicant
   ↓
Guest Check-in
   ↓
Guest Accommodation Active
   ↓
Guest Check-out
   ↓
Final Billing & Payment
   ↓
Reservation Completed
```

---

# Decision Paths

## Path A: Direct Approval (Standard Case)
```
Proposer → Supervisor (Recommend) → HoD (Approve) → Committee (Approve) → Management (Confirm) → Booking Active
```

## Path B: Conditional Approval (Modified Dates/Room)
```
Proposer → HoD (Approve) → Committee (Conditional) → Management (Modify & Confirm) → Proposer (Accept) → Booking Active
```

## Path C: Rejection
```
Proposer → [Any Authority] (Reject) → Reservation Cancelled
Reason: Budget unavailable / No room availability / Policy violation / Invalid purpose
```

## Path D: Waitlist
```
Proposer → Committee (Dates booked) → Waitlist notification → Future dates offered → Proposer confirms → Booking Active
```

---

# Status Codes

| Status | Definition |
|--------|-----------|
| SUBMITTED | Reservation request submitted |
| PENDING_SUPERVISOR | Awaiting supervisor review |
| APPROVED_BY_SUPERVISOR | Supervisor recommended |
| PENDING_HOD | Awaiting department head approval |
| APPROVED_BY_HOD | Department head approved |
| PENDING_COMMITTEE | Awaiting committee review |
| APPROVED_BY_COMMITTEE | Committee approved |
| PENDING_MANAGEMENT | Awaiting management confirmation |
| CONFIRMED | Booking confirmed with guest |
| CHECK_IN | Guest checked in |
| ACTIVE | Guest staying in room |
| CHECK_OUT | Guest checkout initiated |
| COMPLETED | Guest left, billing complete |
| REJECTED | Reservation rejected |
| CANCELLED | Reservation cancelled by proposer |
| NO_SHOW | Guest did not arrive |
| WAITLISTED | On waitlist for preferred dates |

---

# Additional Notes

* Guest House Committee meets regularly to discuss bookings and policies
* Special events may require advance coordinator approval
* High-profile guests may need security/additional arrangements
* Catering can be arranged through institute canteen
* Laundry and housekeeping services available daily
* Emergency contact always available (24/7)
* Damages report must be filed within 24 hours of discovery
* Government guests may have billing through project funds
* Annual maintenance charges incorporated in rates
