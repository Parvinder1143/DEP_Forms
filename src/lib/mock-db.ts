export type ForwardingSection =
  | "ACADEMICS"
  | "ESTABLISHMENT"
  | "RESEARCH_AND_DEVELOPMENT";

export type BuiltInAppRole =
  | "STUDENT"
  | "INTERN"
  | "EMPLOYEE"
  | "HOSTEL_WARDEN"
  | "SUPERVISOR"
  | "SECTION_HEAD"
  | "HOD"
  | "REGISTRAR"
  | "DEAN_FAA"
  | "DIRECTOR"
  | "DEPUTY_DEAN"
  | "STUDENT_AFFAIRS_HOSTEL_MGMT"
  | "SECURITY_OFFICE"
  | "FORWARDING_AUTHORITY_ACADEMICS"
  | "ESTABLISHMENT"
  | "FORWARDING_AUTHORITY_R_AND_D"
  | "APPROVING_AUTHORITY"
  | "GUEST_HOUSE_INCHARGE"
  | "GUEST_HOUSE_COMMITTEE_CHAIR"
  | "IT_ADMIN"
  | "SYSTEM_ADMIN";

export type AppRole = BuiltInAppRole | (string & {});

export type AuthMode = "login" | "signup";

export type EmailIdFormStatus = "PENDING" | "FORWARDED" | "ISSUED" | "REJECTED";

export type UserRecord = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  password: string;
  fullName: string | null;
  department?: string | null;
  role: AppRole | null;
};

export type EmailIdApprovalRecord = {
  id: string;
  createdAt: Date;
  formId: string;
  stage: number;
  forwardingSection: ForwardingSection | null;
  approverName: string;
  assignedEmailId: string | null;
  dateOfCreation: Date | null;
  tentativeRemovalDate: Date | null;
  idCreatedBy: string | null;
};

export type EmailIdFormRecord = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  submittedById: string;
  submittedByEmail: string;
  initials: string;
  firstName: string;
  lastName: string;
  gender: string;
  permanentAddress: string;
  orgId: string;
  natureOfEngagement: string;
  role: string;
  department: string;
  projectName: string | null;
  joiningDate: Date | null;
  anticipatedEndDate: Date | null;
  reportingOfficerName: string | null;
  reportingOfficerEmail: string | null;
  mobileNo: string;
  alternateEmail: string;
  consentAccepted: boolean;
  status: EmailIdFormStatus;
};

export type GuestHouseFormStatus = "SUBMITTED";

export type GuestHouseFormRecord = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  submittedById: string;
  submittedByEmail: string;
  guestName: string;
  contactNumber: string;
  purposeOfVisit: string;
  arrivalDate: Date;
  departureDate: Date;
  status: GuestHouseFormStatus;
};

type AppStore = {
  users: UserRecord[];
  forms: EmailIdFormRecord[];
  guestHouseForms: GuestHouseFormRecord[];
  approvals: EmailIdApprovalRecord[];
  seeded: boolean;
};

const globalStore = globalThis as unknown as { __iitrprStore?: AppStore };

function now() {
  return new Date();
}

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getStore(): AppStore {
  if (!globalStore.__iitrprStore) {
    globalStore.__iitrprStore = {
      users: [],
      forms: [],
      guestHouseForms: [],
      approvals: [],
      seeded: false,
    };
  }
  ensureSeedData(globalStore.__iitrprStore);
  return globalStore.__iitrprStore;
}

function ensureSeedData(store: AppStore) {
  if (store.seeded) {
    return;
  }

  const seedUsers: Array<{
    email: string;
    fullName: string;
    role: AppRole;
    password: string;
  }> = [
    {
      email: "admin@iitrpr.ac.in",
      fullName: "System Admin",
      role: "SYSTEM_ADMIN",
      password: "123456",
    },
    {
      email: "academics@iitrpr.ac.in",
      fullName: "Academics",
      role: "FORWARDING_AUTHORITY_ACADEMICS",
      password: "123456",
    },
    {
      email: "establishment@iitrpr.ac.in",
      fullName: "Establishment",
      role: "ESTABLISHMENT",
      password: "123456",
    },
    {
      email: "rnd@iitrpr.ac.in",
      fullName: "R&D",
      role: "FORWARDING_AUTHORITY_R_AND_D",
      password: "123456",
    },
    {
      email: "it.admin@iitrpr.ac.in",
      fullName: "IT Admin",
      role: "IT_ADMIN",
      password: "123456",
    },
    {
      email: "hostel.warden@iitrpr.ac.in",
      fullName: "Hostel Warden",
      role: "HOSTEL_WARDEN",
      password: "123456",
    },
    {
      email: "supervisor@iitrpr.ac.in",
      fullName: "Supervisor",
      role: "SUPERVISOR",
      password: "123456",
    },
    {
      email: "section.head@iitrpr.ac.in",
      fullName: "Section Head",
      role: "SECTION_HEAD",
      password: "123456",
    },
    {
      email: "hod@iitrpr.ac.in",
      fullName: "Head of Department",
      role: "HOD",
      password: "123456",
    },
    {
      email: "registrar@iitrpr.ac.in",
      fullName: "Registrar",
      role: "REGISTRAR",
      password: "123456",
    },
    {
      email: "dean@iitrpr.ac.in",
      fullName: "Dean",
      role: "DEAN_FAA",
      password: "123456",
    },
    {
      email: "director@iitrpr.ac.in",
      fullName: "Director",
      role: "DIRECTOR",
      password: "123456",
    },
    {
      email: "deputy.dean@iitrpr.ac.in",
      fullName: "Deputy Dean",
      role: "DEPUTY_DEAN",
      password: "123456",
    },
    {
      email: "student.affairs@iitrpr.ac.in",
      fullName: "Student Affairs",
      role: "STUDENT_AFFAIRS_HOSTEL_MGMT",
      password: "123456",
    },
    {
      email: "security.office@iitrpr.ac.in",
      fullName: "Security Office",
      role: "SECURITY_OFFICE",
      password: "123456",
    },
    {
      email: "guesthouse.incharge@iitrpr.ac.in",
      fullName: "Guest House In-charge",
      role: "GUEST_HOUSE_INCHARGE",
      password: "123456",
    },
    {
      email: "guesthouse.chairman@iitrpr.ac.in",
      fullName: "Chairman GH Committee",
      role: "GUEST_HOUSE_COMMITTEE_CHAIR",
      password: "123456",
    },
  ];

  for (const account of seedUsers) {
    const existing = store.users.find((u) => u.email === account.email);
    if (existing) {
      continue;
    }

    store.users.push({
      id: newId("usr"),
      createdAt: now(),
      updatedAt: now(),
      email: account.email,
      password: account.password,
      fullName: account.fullName,
      role: account.role,
    });
  }

  store.seeded = true;
}

export function findUserByEmail(email: string) {
  const store = getStore();
  const normalized = normalizeEmail(email);
  return store.users.find((u) => u.email === normalized) ?? null;
}

export function authenticateUser(input: {
  mode: AuthMode;
  email: string;
  password: string;
  fullName?: string | null;
  forceSystemAdmin?: boolean;
  signupAsStudent?: boolean;
}) {
  const store = getStore();
  const normalizedEmail = normalizeEmail(input.email);
  const existing = store.users.find((u) => u.email === normalizedEmail);

  if (input.mode === "login") {
    if (!existing) {
      throw new Error("Account not found. Please sign up first.");
    }

    if (existing.password !== input.password) {
      throw new Error("Invalid password.");
    }

    existing.updatedAt = now();
    if (input.fullName && input.fullName.trim()) {
      existing.fullName = input.fullName.trim();
    }
    if (input.forceSystemAdmin) {
      existing.role = "SYSTEM_ADMIN";
    }
    return { user: existing, isNew: false };
  }

  if (existing) {
    throw new Error("Account already exists. Please log in.");
  }

  if (!input.password || input.password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const defaultRole: AppRole | null = input.forceSystemAdmin ? "SYSTEM_ADMIN" : null;
  const departmentTag =
    input.signupAsStudent && !input.forceSystemAdmin ? "__STUDENT_ROLE_REQUEST__" : null;

  const user: UserRecord = {
    id: newId("usr"),
    createdAt: now(),
    updatedAt: now(),
    email: normalizedEmail,
    password: input.password,
    fullName: input.fullName?.trim() || null,
    department: departmentTag,
    role: defaultRole,
  };
  store.users.push(user);
  return { user, isNew: true };
}

export function listUsers() {
  const store = getStore();
  return [...store.users].sort((a, b) => {
    const aRole = a.role ?? "";
    const bRole = b.role ?? "";
    if (aRole === bRole) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return aRole.localeCompare(bRole);
  });
}

export function updateUserRole(userId: string, role: AppRole) {
  const store = getStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    throw new Error("User not found.");
  }
  user.role = role;
  if (user.department === "__STUDENT_ROLE_REQUEST__") {
    user.department = null;
  }
  user.updatedAt = now();
  return user;
}

export function approvePendingStudentRoleRequests() {
  const store = getStore();
  let updated = 0;

  for (const user of store.users) {
    if (user.role) {
      continue;
    }
    if (!user.email.endsWith("@iitrpr.ac.in")) {
      continue;
    }
    if (user.department !== "__STUDENT_ROLE_REQUEST__") {
      continue;
    }

    user.role = "STUDENT";
    user.department = null;
    user.updatedAt = now();
    updated += 1;
  }

  return updated;
}

export function createEmailIdForm(input: Omit<EmailIdFormRecord, "id" | "createdAt" | "updatedAt" | "status">) {
  const store = getStore();
  const form: EmailIdFormRecord = {
    ...input,
    id: newId("frm"),
    createdAt: now(),
    updatedAt: now(),
    status: "PENDING",
  };
  store.forms.push(form);
  return form;
}

export function listEmailIdFormsBySubmitter(submittedById: string) {
  const store = getStore();
  return store.forms
    .filter((f) => f.submittedById === submittedById)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((form) => ({
      ...form,
      approvals: store.approvals
        .filter((a) => a.formId === form.id)
        .sort((a, b) => a.stage - b.stage),
    }));
}

export function getEmailIdFormById(id: string) {
  const store = getStore();
  const form = store.forms.find((f) => f.id === id);
  if (!form) return null;

  const approvals = store.approvals
    .filter((a) => a.formId === id)
    .sort((a, b) => a.stage - b.stage);

  return {
    ...form,
    approvals,
  };
}

export function listEmailIdForms(params?: {
  status?: EmailIdFormStatus;
  viewerRole?: AppRole | null;
  includeApprovals?: boolean;
}) {
  const store = getStore();
  const includeApprovals = params?.includeApprovals ?? false;

  const filtered = store.forms.filter((f) => {
    if (
      params?.viewerRole &&
      [
        "FORWARDING_AUTHORITY_ACADEMICS",
        "ESTABLISHMENT",
        "FORWARDING_AUTHORITY_R_AND_D",
      ].includes(params.viewerRole) &&
      f.status !== "PENDING"
    ) {
      return false;
    }
    if (
      params?.viewerRole === "IT_ADMIN" &&
      !["FORWARDED", "ISSUED", "REJECTED"].includes(f.status)
    ) {
      return false;
    }
    if (params?.status && f.status !== params.status) {
      return false;
    }
    return true;
  });

  const sorted = filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (!includeApprovals) {
    return sorted;
  }

  return sorted.map((form) => ({
    ...form,
    approvals: store.approvals
      .filter((a) => a.formId === form.id)
      .sort((a, b) => a.stage - b.stage),
  }));
}

export function addForwardingApproval(input: {
  formId: string;
  stage: number;
  section: ForwardingSection;
  approverName: string;
}) {
  const store = getStore();
  const form = store.forms.find((f) => f.id === input.formId);
  if (!form) {
    throw new Error("Form not found.");
  }
  if (form.status === "REJECTED" || form.status === "ISSUED") {
    throw new Error("Form is already completed.");
  }

  const approval: EmailIdApprovalRecord = {
    id: newId("apr"),
    createdAt: now(),
    formId: input.formId,
    stage: input.stage,
    forwardingSection: input.section,
    approverName: input.approverName,
    assignedEmailId: null,
    dateOfCreation: null,
    tentativeRemovalDate: null,
    idCreatedBy: null,
  };

  store.approvals.push(approval);
  form.status = "FORWARDED";
  form.updatedAt = now();

  return approval;
}

export function addIssueApproval(input: {
  formId: string;
  stage: number;
  assignedEmailId: string;
  dateOfCreation: string;
  tentativeRemovalDate: string | null;
  idCreatedBy: string;
}) {
  const store = getStore();
  const form = store.forms.find((f) => f.id === input.formId);
  if (!form) {
    throw new Error("Form not found.");
  }
  if (form.status === "REJECTED" || form.status === "ISSUED") {
    throw new Error("Form is already completed.");
  }

  const approval: EmailIdApprovalRecord = {
    id: newId("apr"),
    createdAt: now(),
    formId: input.formId,
    stage: input.stage,
    forwardingSection: null,
    approverName: input.idCreatedBy,
    assignedEmailId: input.assignedEmailId,
    dateOfCreation: new Date(input.dateOfCreation),
    tentativeRemovalDate: input.tentativeRemovalDate
      ? new Date(input.tentativeRemovalDate)
      : null,
    idCreatedBy: input.idCreatedBy,
  };

  store.approvals.push(approval);
  form.status = "ISSUED";
  form.updatedAt = now();

  return approval;
}

export function rejectEmailIdForm(input: {
  formId: string;
  stage: number;
  section: ForwardingSection;
  approverName: string;
  remark: string;
}) {
  const store = getStore();
  const form = store.forms.find((f) => f.id === input.formId);
  if (!form) {
    throw new Error("Form not found.");
  }
  if (form.status === "REJECTED" || form.status === "ISSUED") {
    throw new Error("Form is already completed.");
  }

  const approval: EmailIdApprovalRecord = {
    id: newId("apr"),
    createdAt: now(),
    formId: input.formId,
    stage: input.stage,
    forwardingSection: input.section,
    approverName: `Rejected by ${input.approverName} | ${input.remark}`,
    assignedEmailId: null,
    dateOfCreation: null,
    tentativeRemovalDate: null,
    idCreatedBy: null,
  };

  store.approvals.push(approval);
  form.status = "REJECTED";
  form.updatedAt = now();

  return approval;
}

export function createGuestHouseForm(input: Omit<GuestHouseFormRecord, "id" | "createdAt" | "updatedAt" | "status">) {
  const store = getStore();
  const form: GuestHouseFormRecord = {
    ...input,
    id: newId("gh"),
    createdAt: now(),
    updatedAt: now(),
    status: "SUBMITTED",
  };
  store.guestHouseForms.push(form);
  return form;
}

export function getGuestHouseFormById(id: string) {
  const store = getStore();
  return store.guestHouseForms.find((f) => f.id === id) ?? null;
}

export function listGuestHouseFormsBySubmitter(submittedById: string) {
  const store = getStore();
  return store.guestHouseForms
    .filter((f) => f.submittedById === submittedById)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function listAllGuestHouseForms() {
  const store = getStore();
  return [...store.guestHouseForms].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}
