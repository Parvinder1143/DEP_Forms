# Hostel Information & Undertaking Form Workflow

## Stakeholders

1. **Student (Applicant)**
2. **Hostel Management Section**
3. **Hostel Warden / Superintendent**
4. **Deputy Registrar - Establishment**
5. **Parent / Local Guardian** *(Information provider)*

---

# Step-by-Step Flow

## 1️⃣ Student Submits Hostel Information Form

Student logs into portal and fills the Hostel Information cum Undertaking form.

Required details include (Student Information):

* Name of Student *(Mr. / Ms.)*
* Entry Number (ENT)
* Name of Course
* Department
* Hostel Room Number
* Email Address
* Date of Joining
* **Financial Information:**
  - HEF *(Hostel Establishment Fund)*
  - Mess Security *(₹)*
  - Mess Admission Fee *(₹)*
  - Mess Charges *(₹)*
* Blood Group
* Category *(SC / ST / OBC / General)*
* Emergency Contact Number

Required details include (Guardian Information):

**Name and Address of Parents:**
* **Office Address:**
  - Address line 1
  - Address line 2
  - Mobile Number
  - Telephone Number
  - Email ID

* **Residence Address:**
  - Address line 1
  - Address line 2
  - Mobile Number
  - Telephone Number
  - Email ID

**Name and Address of Local Guardian (if any):**
* **Office Address:**
  - Contact person name
  - Address line 1
  - Address line 2
  - Mobile Number
  - Telephone Number
  - Email ID

* **Residence Address:**
  - Contact person name
  - Address line 1
  - Address line 2
  - Mobile Number
  - Telephone Number
  - Email ID

System creates record:

```
Form.status = SUBMITTED
Hostel.status = INFORMATION_RECEIVED
```

---

# 2️⃣ Student Undertaking & Declaration

Student must acknowledge and declare:

```
"I, the undersigned, hereby declare that I have read the hostel rules 
of IIT Ropar and I have been also informed about the anti-ragging 
policy and prohibitions in the hostel premises. I promise to abide by 
the rules and regulations of this Institute, amended and enforced from 
time to time.

I will not violate any information technology (IT) rules and will not 
misuse the internet, email and any institute facilities.

I am aware that Institute administration has the right to terminate 
my accommodation in the hostel if their discretion."
```

Student signature with date:

```
Student.undertaking_accepted = YES
Undertaking.acknowledged_date = [Current Date]
```

System records:

```
Form.status = UNDERTAKING_SIGNED
Hostel.status = DOCUMENTATION_COMPLETE
```

---

# 3️⃣ Hostel Management Initial Processing

Hostel Management Section receives form and conducts verification:

```
Hostel Management Section
```

Responsibility:

* Verify student enrollment and hostel allocation
* Cross-check room number assignment
* Validate financial information (fees collected)
* Verify emergency contact details
* Confirm guardian information completeness
* Check for any outstanding dues/violations

Verification checklist:

```
✓ Student enrolled in institute
✓ Room allocation verified
✓ Emergency contact reachable
✓ Guardian details complete
✓ Financial records match
✓ No prior disciplinary issues
```

Decision:

```
Accepted - Forward to Warden
Clarification Required - Return to Student
Rejected - If policy violations detected
```

If **Clarification Required → Form Returned to Student**

If **Rejected → Accommodation Terminated** (per policy violation)

If **Accepted → Forward to Hostel Warden**

---

# 4️⃣ Hostel Warden / Superintendent Review

Form forwarded to:

```
Hostel Warden / Superintendent
```

Responsibility:

* Final verification of student residential status
* Confirm room assignment and capacity
* Ensure all mandatory undertakings are signed
* Cross-verify guardian contact information
* Check health and medical information if applicable
* Validate blood group and emergency contact accuracy

Decision:

```
Approved - Student admitted to hostel
Conditional Approval - With specific requirements
Rejected - If undertaking incomplete or issues found
```

If **Rejected → Student Notified**

If **Conditional Approval → Special conditions communicated**

If **Approved → Hostel Record Finalized**

---

# 5️⃣ Hostel Allocation & Room Assignment Confirmation

Once approved, Hostel Management completes:

* **Room Assignment** *(if provisional)*
* **Mess Allocation** *(if applicable)*
* **Key Issuance** *(physical/digital)*
* **Hostel ID Card** *(if applicable)*
* **Welcome Package** *(hostel guidelines, emergency numbers)*

System records:

```
Hostel.status = ACCOMMODATION_APPROVED
Room.assigned = [Room Number]
Room.assigned_date = [Assignment Date]
Student.hostel_id = [Generated ID]
```

---

# 6️⃣ Student Hostel Residency Active

Student moved into hostel:

* Provided room access
* Integrated with mess system
* Added to hostel communication channels
* Registered with medical facility
* Orientation scheduled (if required)

Final system state:

```
Form.status = COMPLETED
Hostel.status = ACTIVE
Student.hostel_resident = YES
```

---

# Important Conditions & Policies

## Hostel Rules Compliance:
* Check-in and check-out timings: 01:00 PM to 11:00 AM respectively
* If hostel hostel is closed (holidays), student must vacate within specified timeframe
* Advanced bookings for rooms during holidays (at least 1 week prior notice required)
* Hostel Management reserves right to cancel room if guest violations occur

## Mess Policies:
* Mess charges applicable for entire semester
* Non-mess students allowed only if exempted by hostel authorities
* Mess accounts settled before checkout

## Room Assignment:
* No double occupancy except in designated rooms
* No sub-renting of hostel accommodation
* Room transfer requests must be submitted in advance

## Health & Safety:
* Communicable disease declaration required
* Medical emergency protocols to be followed
* No alcohol or prohibited substances allowed

## Conduct:
* Anti-ragging policy strictly enforced
* No violence or unauthorized gatherings
* Maintain silence hours (typically 10 PM - 8 AM)
* Hostel authority can terminate accommodation for serious violations

---

# Financial Obligations

| Component | Type | Responsibility |
|-----------|------|-----------------|
| HEF (Hostel Establishment Fund) | Annual | Student deposit |
| Mess Security | Semester | Refundable on checkout |
| Mess Admission Fee | One-time | First semester |
| Mess Charges | Monthly | Regular billing |

---

# Emergency Contact Management

* Parents' emergency contact must remain current
* Student must notify hostel of changes in contact information
* Local guardian details updated annually
* Medical emergency protocols use this contact chain

---

# Final Approval Chain

```
Student
   ↓
Fill Hostel Information Form
   ↓
Sign Undertaking & Declaration
   ↓
Hostel Management Initial Processing
   ↓
Hostel Warden / Superintendent Review & Approval
   ↓
Room Allocation & Finalization
   ↓
Student Hostel Residency Activated
   ↓
Active Hostel Member
```

---

# Decision Paths

## Path A: Complete & Approved
```
Student → Fill & Sign Form → Hostel Management (Verify) → Warden (Approve) → Room Assigned → Active
```

## Path B: Clarification Required
```
Student → Form → Hostel Management (Clarification) → Student (Resubmit) → Warden → Active
```

## Path C: Rejection
```
Student → Form → Hostel Management OR Warden (Reject) → Accommodation Denied
Reason: Undertaking not signed / False information / Policy violation
```

---

# Status Codes

| Status | Definition |
|--------|-----------|
| SUBMITTED | Form submitted by student |
| UNDERTAKING_SIGNED | Undertaking signed by student |
| UNDER_REVIEW | Hostel Management reviewing |
| PENDING_WARDEN | Awaiting Warden approval |
| APPROVED | Approved by Warden |
| ROOM_ASSIGNED | Room allocation confirmed |
| COMPLETED | Active hostel resident |
| REJECTED | Application rejected |
| SUSPENDED | Suspended due to violations |
| TERMINATED | Accommodation terminated |

---

# Additional Notes

* Form must be completed within 7 days of hostel allocation
* Parent signature required on hard copy (if applicable)
* Annual undertaking renewal may be required
* Students can view/update their hostel profile anytime during year
* Checkout procedures must be followed for room clearance
