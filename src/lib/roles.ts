import type { AppRole } from "@/lib/mock-db";

export const BUILT_IN_ROLE_OPTIONS: AppRole[] = [
  "STUDENT",
  "INTERN",
  "EMPLOYEE",
  "HOSTEL_WARDEN",
  "SUPERVISOR",
  "SECTION_HEAD",
  "HOD",
  "REGISTRAR",
  "DEAN_FAA",
  "DIRECTOR",
  "DEPUTY_DEAN",
  "STUDENT_AFFAIRS_HOSTEL_MGMT",
  "SECURITY_OFFICE",
  "FORWARDING_AUTHORITY_ACADEMICS",
  "ESTABLISHMENT",
  "FORWARDING_AUTHORITY_R_AND_D",
  "APPROVING_AUTHORITY",
  "GUEST_HOUSE_INCHARGE",
  "GUEST_HOUSE_COMMITTEE_CHAIR",
  "IT_ADMIN",
  "SYSTEM_ADMIN",
];

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Student",
  INTERN: "Intern",
  EMPLOYEE: "Employee",
  HOSTEL_WARDEN: "Hostel Warden",
  SUPERVISOR: "Supervisor",
  SECTION_HEAD: "Section Head",
  HOD: "HoD",
  REGISTRAR: "Registrar",
  DEAN_FAA: "Dean",
  DIRECTOR: "Director",
  DEPUTY_DEAN: "Deputy Dean",
  STUDENT_AFFAIRS_HOSTEL_MGMT: "Student Affairs",
  SECURITY_OFFICE: "Security Office",
  FORWARDING_AUTHORITY_ACADEMICS: "Academics",
  ESTABLISHMENT: "Establishment",
  FORWARDING_AUTHORITY_R_AND_D: "R&D",
  APPROVING_AUTHORITY: "Approving Authority",
  GUEST_HOUSE_INCHARGE: "Guest House In-charge",
  GUEST_HOUSE_COMMITTEE_CHAIR: "Chairman GH Committee",
  IT_ADMIN: "IT Admin",
  SYSTEM_ADMIN: "System Admin",
};

export function getRoleLabel(role: AppRole | null | string, customLabels?: Record<string, string>) {
  if (!role) {
    return "Unassigned";
  }

  const normalized = String(role).toUpperCase();
  const fromCustom = customLabels?.[normalized];
  if (fromCustom) {
    return fromCustom;
  }

  return ROLE_LABELS[normalized] ?? normalized.replace(/_/g, " ");
}
