import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserByEmail } from "@/lib/user-store";
import {
  getActiveDelegationForUser,
  getActiveQueueDelegationForUser,
  type DelegationQueueKey,
} from "@/lib/delegation-store";
import { getStagesForRole, getWorkflow } from "@/lib/workflow-engine";
import { getRoleLabel } from "@/lib/roles";
import type { AppRole } from "@/lib/mock-db";

export const SESSION_COOKIE = "iitrpr_session_email";
const IITRPR_DOMAIN = "@iitrpr.ac.in";
const SYSTEM_ADMIN_EMAILS = ["admin@iitrpr.ac.in"];

export type ApplicantFormKey =
  | "email-id"
  | "guest-house"
  | "identity-card"
  | "vehicle-sticker"
  | "hostel-undertaking";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function canUseInstitutionLogin(email: string) {
  const normalized = normalizeEmail(email);
  return normalized.includes("@");
}

export function isInstituteEmail(email: string) {
  const normalized = normalizeEmail(email);
  return normalized.endsWith(IITRPR_DOMAIN);
}

export function getApplicantFormAccess(email: string, role: AppRole | null) {
  const instituteEmail = isInstituteEmail(email);

  if (!instituteEmail) {
    return {
      "email-id": true,
      "guest-house": true,
      "identity-card": false,
      "vehicle-sticker": false,
      "hostel-undertaking": false,
    } as const;
  }

  if (role === "STUDENT" || role === "INTERN") {
    return {
      "email-id": true,
      "guest-house": true,
      "identity-card": true,
      "vehicle-sticker": true,
      "hostel-undertaking": true,
    } as const;
  }

  if (role === "EMPLOYEE") {
    return {
      "email-id": true,
      "guest-house": true,
      "identity-card": true,
      "vehicle-sticker": true,
      "hostel-undertaking": false,
    } as const;
  }

  return {
    "email-id": false,
    "guest-house": false,
    "identity-card": false,
    "vehicle-sticker": false,
    "hostel-undertaking": false,
  } as const;
}

export function canAccessApplicantForm(email: string, role: AppRole | null, formKey: ApplicantFormKey) {
  return getApplicantFormAccess(email, role)[formKey];
}

export async function requireApplicantFormAccess(formKey: ApplicantFormKey) {
  const user = await requireUser();
  if (!canAccessApplicantForm(user.email, user.role, formKey)) {
    redirect("/");
  }
  return user;
}

export async function setSessionEmail(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, normalizeEmail(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionEmail() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionEmail() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser() {
  const sessionEmail = await getSessionEmail();
  if (!sessionEmail) {
    return null;
  }

  try {
    return await findUserByEmail(sessionEmail);
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

export async function requireAssignedUser() {
  const user = await requireUser();
  if (!user.role) {
    redirect("/pending-role");
  }
  return user;
}

export async function requireRole(roles: AppRole[]) {
  const user = await requireUser();
  const delegation = await getActiveDelegationForUser(user.id, roles);
  if (delegation) {
    return {
      ...user,
      role: delegation.delegatedRole,
      department: delegation.requesterDepartment ?? user.department,
      baseRole: user.role,
      isTemporarilyAssigned: true,
    };
  }

  if (user.role && roles.includes(user.role)) {
    return {
      ...user,
      baseRole: user.role,
      isTemporarilyAssigned: false,
    };
  }

  redirect("/");
}

export function getRoleDisplayContext(input: {
  role: AppRole | null;
  baseRole?: AppRole | null;
  isTemporarilyAssigned?: boolean;
}) {
  const activeRoleLabel = toDisplayRole(input.role);
  const baseRole = input.baseRole ?? input.role;
  const baseRoleLabel = toDisplayRole(baseRole ?? null);
  const isTemporarilyAssigned = Boolean(
    input.isTemporarilyAssigned && input.role && baseRole && input.role !== baseRole
  );

  return {
    activeRoleLabel,
    baseRoleLabel,
    isTemporarilyAssigned,
  };
}

export function isSystemAdminEmail(email: string) {
  return SYSTEM_ADMIN_EMAILS.includes(normalizeEmail(email));
}

export async function getDashboardPathForRole(role: AppRole | null) {
  if (!role || role === "SYSTEM_ADMIN") return "/";

  const dashboardToWorkflow: Array<{ path: string; workflowId: string }> = [
    { path: "/dashboard/email-id", workflowId: "email-id" },
    { path: "/dashboard/vehicle-sticker", workflowId: "vehicle-sticker" },
    { path: "/dashboard/identity-card", workflowId: "identity-card" },
    { path: "/dashboard/guest-house", workflowId: "guest-house" },
    { path: "/dashboard/hostel-undertaking", workflowId: "hostel-undertaking" },
  ];

  for (const item of dashboardToWorkflow) {
    const workflow = await getWorkflow(item.workflowId);
    if (workflow && getStagesForRole(workflow, role).length > 0) {
      return item.path;
    }
  }

  return "/";
}

export async function getDashboardPathForUser(userId: string, role: AppRole | null) {
  if (role === "SYSTEM_ADMIN") return "/admin";

  const queueLinks = await getDashboardQueueLinksForUser(userId, role);
  return queueLinks[0]?.path ?? "/";
}

export async function getDashboardQueueLinksForRole(role: AppRole | null): Promise<Array<{ path: string; label: string }>> {
  if (!role || role === "SYSTEM_ADMIN") return [];

  const dashboardToWorkflow: Array<{ path: string; label: string; workflowId: string }> = [
    { path: "/dashboard/email-id", label: "Email Queue", workflowId: "email-id" },
    { path: "/dashboard/vehicle-sticker", label: "Vehicle Queue", workflowId: "vehicle-sticker" },
    { path: "/dashboard/identity-card", label: "ID Card Queue", workflowId: "identity-card" },
    { path: "/dashboard/guest-house", label: "Guest House Queue", workflowId: "guest-house" },
    { path: "/dashboard/hostel-undertaking", label: "Undertaking Queue", workflowId: "hostel-undertaking" },
  ];

  const links: Array<{ path: string; label: string }> = [];
  for (const item of dashboardToWorkflow) {
    const workflow = await getWorkflow(item.workflowId);
    if (workflow && getStagesForRole(workflow, role).length > 0) {
      links.push({ path: item.path, label: item.label });
    }
  }

  if (links.length > 0) {
    return links;
  }

  return [];
}

export async function getDashboardQueueLinksForUser(
  userId: string,
  role: AppRole | null
): Promise<Array<{ path: string; label: string }>> {
  if (!role || role === "SYSTEM_ADMIN") return [];

  const dashboardToWorkflow: Array<{
    path: string;
    label: string;
    workflowId: DelegationQueueKey;
  }> = [
    { path: "/dashboard/email-id", label: "Email Queue", workflowId: "email-id" },
    { path: "/dashboard/vehicle-sticker", label: "Vehicle Queue", workflowId: "vehicle-sticker" },
    { path: "/dashboard/identity-card", label: "ID Card Queue", workflowId: "identity-card" },
    { path: "/dashboard/guest-house", label: "Guest House Queue", workflowId: "guest-house" },
    { path: "/dashboard/hostel-undertaking", label: "Undertaking Queue", workflowId: "hostel-undertaking" },
  ];

  const links: Array<{ path: string; label: string }> = [];
  for (const item of dashboardToWorkflow) {
    const workflow = await getWorkflow(item.workflowId);
    if (!workflow) {
      continue;
    }

    const hasOwnAccess = getStagesForRole(workflow, role).length > 0;
    const delegated = await getActiveQueueDelegationForUser(userId, item.workflowId);
    if (hasOwnAccess || Boolean(delegated)) {
      links.push({ path: item.path, label: item.label });
    }
  }

  return links;
}

export async function getQueueRoleForUser(input: {
  userId: string;
  baseRole: AppRole | null;
  queueKey: DelegationQueueKey;
}) {
  const delegated = await getActiveQueueDelegationForUser(input.userId, input.queueKey);
  const activeRole = delegated?.delegatedRole ?? input.baseRole;

  return {
    activeRole,
    delegatedRole: delegated?.delegatedRole ?? null,
    isTemporarilyAssigned: Boolean(delegated && delegated.delegatedRole !== input.baseRole),
  };
}

export function toDisplayRole(role: AppRole | null) {
  return getRoleLabel(role);
}
