# Email ID Request Workflow

## Stakeholders

1. **Employee / User (Applicant)**
2. **Reporting Officer / Supervisor**
3. **Forwarding Authority** (Academics / Establishment / Research & Development)
4. **IT Administration Office**
5. **Email Services Provider**

---

# Step-by-Step Flow

## 1️⃣ Employee Submits Email ID Request

Employee logs into the portal and submits email ID request form.

Required details include:

* Name (with Title: Dr. / Mr. / Ms.)
* Gender
* Initials
* Permanent Address
* Organisation ID
* Nature of Engagement *(Student / Faculty / Non-staff / Tech staff / Administration)*
* Role *(if applicable)*
* Department / Section *(CSE / EE / IR / SA / Accounts / Establishment / etc.)*
* Project Name *(if temp/project staff)*
* Joining Date
* Anticipated End Date of Engagement
* Name of Reporting Officer
* Email of Reporting Officer
* Mobile Number
* Alternate Email (Non-IIT Ropar)
* Consent Acknowledgment

System creates request:

```
Form.status = SUBMITTED
Email.status = PENDING_APPROVAL
```

---

# 2️⃣ Reporting Officer / Supervisor Review

Application is forwarded to:

```
Reporting Officer / Supervisor
```

Responsibility:

* Verify applicant details
* Confirm employment/engagement status
* Validate department and role information
* Ensure applicant belongs to their team

Decision:

```
Recommend → Forward to Forwarding Authority
Reject → Request Closed
```

---

# 3️⃣ Forwarding Authority Approval

Application moves to:

```
Forwarding Authority
(Select one: Academics / Establishment / Research & Development)
```

Responsibility:

* Verify applicant affiliation with authority's domain
* Confirm employment duration and engagement type
* Check for duplicate email requests
* Validate contact information

Decision options:

```
Approved
Rejected
Further Clarification Required
```

If **Rejected → Application Closed**

If **Further Clarification → Returned to Applicant**

If **Approved → Forwarded to IT Administration**

---

# 4️⃣ IT Administration Email ID Creation

Application moves to:

```
IT Administration Office
```

Responsibility:

* Create unique email ID in format: firstname.lastname@iitropar.ac.in (or variation)
* Generate temporary password
* Setup mailbox configuration
* Enable calendar and collaboration features
* Create user account in directory services
* Configure email forwarding rules (if needed)

System records:

```
Assigned Email ID
Date of Creation
Tentative Date of Removal (for temp/project staff)
ID Created By
```

---

# 5️⃣ Email ID Activation & Communication

IT sends notification to applicant:

* **Assigned Email ID**
* **Temporary Password**
* **First Login Instructions**
* **Password Recovery Options**
* **IT Support Contact Information**
* **Email Usage Policy Link**

Email account becomes active:

```
Email.status = ACTIVE
Form.status = COMPLETED
```

---

# 6️⃣ Email Policy Acknowledgment

Employee must acknowledge:

* Email policies released (8/9/21) compliance
* Understanding of responsibilities as email user
* Acceptance of alternate contact methods (mobile/non-IIT email) for password recovery

System marks acknowledgment:

```
Policy.accepted = YES
```

---

# Email ID Lifecycle Management

### For Permanent Staff:
```
Email ID Active
Until employee resignation/retirement
```

### For Temporary / Project Staff:
```
Email ID Active
Until Tentative Date of Removal
After date: Email converted to archive (read-only)
After 6 months: Email deactivated/deleted per policy
```

---

# Final Approval Chain

```
Employee
   ↓
Submit Email ID Request
   ↓
Reporting Officer Review
   ↓
Forwarding Authority
(Academics / Establishment / Research & Development)
   ↓
IT Administration
   ↓
Email ID Created & Activated
   ↓
Confirmation Sent to Employee
   ↓
Employee Acknowledges Policy
   ↓
Email Account Active
```

---

# Decision Paths

## Path A: Immediate Approval
```
Applicant → Reporting Officer (Approve) → Authority (Approve) → IT (Create) → Active
```

## Path B: Clarification Required
```
Applicant → Reporting Officer (Approve) → Authority (Clarification Needed) → Applicant (Resubmit) → Authority → IT
```

## Path C: Rejection
```
Applicant → Reporting Officer (Reject) OR Authority (Reject) → Application Closed
```

---

# Status Codes

| Status | Definition |
|--------|-----------|
| SUBMITTED | Form submitted by employee |
| PENDING_APPROVAL | Awaiting reporting officer review |
| APPROVED_BY_OFFICER | Reporting officer approved |
| PENDING_AUTHORITY | Awaiting forwarding authority review |
| APPROVED_BY_AUTHORITY | Authority approved |
| IN_PROGRESS | IT creating email ID |
| COMPLETED | Email ID activated and assigned |
| REJECTED | Application rejected at any stage |
| CLOSED | Application closed/cancelled |
