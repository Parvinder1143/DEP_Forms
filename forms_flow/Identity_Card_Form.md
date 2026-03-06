# Identity Card Application Workflow

## Stakeholders

1. **Employee (Applicant)**
2. **HoD (Head of Department)**
3. **Section Head**
4. **Deputy Registrar – Establishment Section**
5. **Registrar / Dean (FA&A)**
6. **Establishment Office (Card Issuance)**

---

# Step-by-Step Flow

## 1️⃣ Employee Submits Application

Employee logs into the portal and fills the Identity Card request form.

Required details include:

* Name
* Employee Code
* Designation
* Employment type *(Permanent / Temporary / Contract)*
* Department / Section
* Date of Birth
* Date of Joining
* Blood Group
* Address and Contact Details
* Email ID
* Photograph
* Reason for renewal (if applicable) 

System creates request:

```
Form.status = SUBMITTED
```

---

# 2️⃣ Conditional Forwarding (First Approval)

### Case A — Permanent Employee

Application is forwarded to:

```
HoD (Head of Department)
```

### Case B — Temporary / Contract Employee

Application is forwarded to:

```
Section Head
```

Authority verifies:

* Employee belongs to department
* Employment status
* Details correctness

Decision:

```
Forward → next stage
Reject → request closed
```

---

# 3️⃣ Deputy Registrar Review (Establishment Section)

Application moves to:

```
Deputy Registrar (Establishment)
```

Responsibility:

* Verify employment records
* Confirm department and designation
* Check contract validity (if applicable)

Decision:

```
Recommended
Not Recommended
```

If **Not Recommended → Application Rejected**

If **Recommended → Forwarded to Registrar/Dean**

---

# 4️⃣ Final Approval — Registrar / Dean (FA&A)

Final authority reviews request.

Decision options:

```
Approved
Not Approved
```

If **Not Approved → Request Rejected**

If **Approved → Identity Card Approved for Issue**

---

# 5️⃣ Establishment Office Processing

After approval, office performs administrative actions:

* Generate **Identity Card Number**
* Set **Issue Date**
* Set **Validity Period**
* Print Identity Card

Fields recorded in system: 

```
Identity Card Number
Date of Issue
Valid Until
```

---

# 6️⃣ Identity Card Issued

Employee receives identity card.

Final system state:

```
Form.status = COMPLETED
```

---

# Final Approval Chain (with condition)

```
Employee
   ↓
Submit Identity Card Request
   ↓
IF Permanent → HoD
IF Temporary/Contract → Section Head
   ↓
Deputy Registrar (Establishment)
   ↓
Registrar / Dean (FA&A)
   ↓
Establishment Office
   ↓
Identity Card Issued
```