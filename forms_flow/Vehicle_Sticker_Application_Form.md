# Vehicle Sticker Application Workflow

## Stakeholders

1. **Student / Staff Member (Applicant)**
2. **Supervisor** *(for staff only)*
3. **Head of Department (HoD)** *(for staff only)*
4. **Student Affairs Section**
5. **Security Office**
6. **Establishment / Admin (Hostel Management)** *(for hostel verification)*

---

# Step-by-Step Flow

## 1️⃣ Applicant Submits Vehicle Sticker Application

Student or Staff member logs into portal and submits vehicle sticker application form.

Required details include:

* Name of Applicant
* Designation
* Entry Number / Employee Number
* Department / Section
* Address
* Phone / Mobile Number
* Email ID
* Driving License Number (valid upto date)
* Vehicle Details:
  - **S. No.** *(Sequential)*
  - **Vehicle Registration Number**
  - **Type** *(2W/4W)*
  - **Make / Model**
  - **Colour**
* Photocopy of:
  - Driving License (valid)
  - RC (Registration Certificate)
  - College ID

Applicant declaration:

```
"I hereby solemnly declare that the information given is correct 
to the best of my knowledge & belief"
```

System creates request:

```
Form.status = SUBMITTED
Sticker.status = PENDING_APPROVAL
```

---

# 2️⃣ Supervisor Recommendation (For Staff Only)

### Case A — Student
Application skips to Student Affairs Section (bypasses supervisor)

### Case B — Staff Member
Application forwarded to:

```
Supervisor / Reporting Officer
```

Responsibility:

* Verify applicant employment status
* Confirm department affiliation
* Validate vehicle ownership information
* Cross-check with institute vehicle records

Decision:

```
Recommended
Not Recommended / Rejected
```

If **Not Recommended → Application Rejected**

If **Recommended → Forward to HoD**

---

# 3️⃣ Head of Department Review (For Staff Only)

Application moves to:

```
HoD (Head of Department)
```

Responsibility:

* Final verification of staff member
* Confirm vehicle legitimacy
* Check for duplicate vehicle sticker requests
* Validate driving license validity

Decision options:

```
Recommended
Not Recommended
```

If **Not Recommended → Application Rejected**

If **Recommended → Forward to Student Affairs Section**

---

# 4️⃣ Student Affairs Section Review (All Applicants)

Application moves to:

```
Student Affairs Section
```

Responsibility for **Students**:

* Verify student enrollment status
* Confirm hostel residency details
* Check if student is allowed vehicle (per hostel rules)
* Validate driving license
* Cross-check vehicle details with traffic database

Responsibility for **Staff**:

* Verify staff vehicle eligibility
* Check previous sticker history
* Confirm no outstanding fee/fine against applicant
* Validate documentation

Decision:

```
Recommended / Approved
Not Recommended / Rejected
Further Information Required
```

If **Not Recommended → Application Rejected**

If **Further Information Required → Returned to Applicant**

If **Recommended → Forward to Security Office**

---

# 5️⃣ Security Office - Vehicle Sticker Issuance

Application reaches:

```
Security Office
```

Responsibility:

* Final verification of vehicle and applicant identity
* Physical inspection of vehicle (if applicable)
* Verify registration documents match application
* Generate unique **Vehicle Sticker Number**
* Record sticker issue details
* Print vehicle sticker with security features

Fields recorded in system:

```
Vehicle Registration Number
Issued Vehicle Sticker Number
Date of Issuance
Valid Until (Validity Period - typically 1 year)
Issued By (Security Officer Name/ID)
```

Decision:

```
Sticker Issued
Sticker Rejected
```

If **Sticker Rejected → Application Closed**

If **Sticker Issued → Email Confirmation Sent**

---

# 6️⃣ Vehicle Sticker Collection & Issuance

Applicant receives communication:

* **Vehicle Sticker Number**
* **Date of Issue**
* **Validity Period**
* **Collection Instructions**
* **Sticker Placement Instructions**
* **Security Office Contact Details**

Final system state:

```
Form.status = COMPLETED
Sticker.status = ISSUED
```

---

# Special Conditions

## Vehicle Eligibility:
* Maximum 1 vehicle per student (hostel-based)
* Maximum 2 vehicles per staff member
* Vehicle must be registered in owner's/family member's name
* No commercial vehicles allowed

## Rejection Reasons:
* Invalid/Expired Driving License
* Damaged/Invalid RC (Registration Certificate)
* Previous outstanding violations/fines
* False/Forged documents
* Vehicle registration in third-party name
* Duplicate application for same vehicle

## Validity:
* **New Sticker:** Valid for 1 year from issue date
* **Renewal:** Submit 30 days before expiry
* **Non-Hostel Students:** Limited to 2W vehicles only

---

# Final Approval Chain

```
Student/Staff Member
   ↓
Submit Vehicle Sticker Application
   ↓
IF Student → Go to Step 4 (Student Affairs)
IF Staff → Supervisor Review
   ↓
HoD Review & Recommendation (Staff only)
   ↓
Student Affairs Section Review
   ↓
Security Office - Sticker Issuance
   ↓
Vehicle Sticker Issued & Recorded
   ↓
Applicant Receives Sticker
```

---

# Decision Paths

## Path A: Student - Approved (2W)
```
Student → Student Affairs (Verify & Approve) → Security (Issue) → Sticker Active
```

## Path B: Staff - Approved
```
Staff → Supervisor (Recommend) → HoD (Approve) → Student Affairs (Verify) → Security (Issue) → Sticker Active
```

## Path C: Rejected at Any Stage
```
Applicant → [Any Authority] (Reject) → Application Closed
Applicant notified with rejection reason
```

## Path D: Clarification Required
```
Applicant → Student Affairs (Clarification Needed) → Applicant (Resubmit) → Student Affairs → Security
```

---

# Status Codes

| Status | Definition |
|--------|-----------|
| SUBMITTED | Application submitted |
| PENDING_SUPERVISOR | Awaiting supervisor review (staff) |
| APPROVED_BY_SUPERVISOR | Supervisor approved |
| PENDING_HOD | Awaiting HoD review (staff) |
| APPROVED_BY_HOD | HoD approved |
| PENDING_STUDENT_AFFAIRS | Awaiting Student Affairs review |
| APPROVED_BY_AFFAIRS | Student Affairs approved |
| PENDING_SECURITY | Awaiting Security Office |
| STICKER_ISSUED | Vehicle sticker issued |
| REJECTED | Application rejected |
| CLOSED | Application closed/cancelled |
| EXPIRED | Sticker validity period ended |

---

# Additional Notes

* Vehicle sticker must remain valid and visible at all times
* Loss/Damage of sticker can be reported for reissuance (with documentation)
* Sticker cannot be transferred to another vehicle
* Security reserves right to revoke sticker for policy violations
