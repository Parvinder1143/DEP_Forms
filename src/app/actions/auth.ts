"use server";

import {
  canUseInstitutionLogin,
  clearSessionEmail,
  getDashboardPathForRole,
  isInstituteEmail,
  isSystemAdminEmail,
  requireRole,
  setSessionEmail,
} from "@/lib/auth";
import type { AppRole } from "@/lib/mock-db";
import { getActiveDelegatedRoleForUser } from "@/lib/delegation-store";
import {
  createCustomRole,
  listCustomRoles,
  normalizeAssignableRoleCode,
} from "@/lib/custom-role-store";
import { BUILT_IN_ROLE_OPTIONS } from "@/lib/roles";
import { authenticateUser, approvePendingStudentRoleRequests as approvePendingStudentRequests, updateUserRole } from "@/lib/user-store";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const modeRaw = String(formData.get("mode") ?? "login");
  const mode = modeRaw === "signup" ? "signup" : "login";
  const signupAsStudent = String(formData.get("signupAsStudent") ?? "") === "on";

  if (!email) {
    return { error: "Email is required." };
  }

  if (!canUseInstitutionLogin(email)) {
    return { error: "Use your @iitrpr.ac.in institutional email to sign in." };
  }

  if (!password) {
    return { error: "Password is required." };
  }

  if (mode === "signup" && password !== confirmPassword) {
    return { error: "Password and confirm password do not match." };
  }

  let user;
  try {
    user = (
      await authenticateUser({
      mode,
      email,
      password,
      forceSystemAdmin: isSystemAdminEmail(email),
      signupAsStudent,
      })
    ).user;
  } catch (error) {
    return { error: (error as Error).message };
  }

  await setSessionEmail(email);

  if (user.role === "SYSTEM_ADMIN") {
    redirect("/admin");
  }

  const delegatedRole = await getActiveDelegatedRoleForUser(user.id);
  const effectiveRole = delegatedRole ?? user.role;

  if (effectiveRole) {
    redirect(await getDashboardPathForRole(effectiveRole));
  }

  if (isInstituteEmail(user.email) && !user.role) {
    redirect("/pending-role");
  }

  redirect(await getDashboardPathForRole(user.role));
}

export async function signOut() {
  await clearSessionEmail();
  redirect("/sign-in");
}

export async function assignRole(formData: FormData) {
  await requireRole(["SYSTEM_ADMIN"]);

  const userId = String(formData.get("userId") ?? "");
  const role = normalizeAssignableRoleCode(String(formData.get("role") ?? "")) as AppRole;

  const customRoles = await listCustomRoles();
  const allowedRoles = new Set<string>([
    ...BUILT_IN_ROLE_OPTIONS,
    ...customRoles.map((customRole) => customRole.roleCode),
  ]);

  if (!allowedRoles.has(role)) {
    throw new Error("Invalid role selected.");
  }

  await updateUserRole(userId, role);

  revalidatePath("/admin");
  revalidatePath("/pending-role");
  revalidatePath("/");
}

export async function createAssignableRole(formData: FormData) {
  await requireRole(["SYSTEM_ADMIN"]);

  const roleCode = String(formData.get("roleCode") ?? "");
  const displayName = String(formData.get("displayName") ?? "");

  await createCustomRole({ roleCode, displayName });

  revalidatePath("/admin");
}

export async function approveAllStudentRoleRequests(formData: FormData) {
  await requireRole(["SYSTEM_ADMIN"]);

  const shouldApprove = String(formData.get("approveAllStudentRequests") ?? "") === "on";
  if (!shouldApprove) {
    return { error: "Select the checkbox to confirm bulk student approval." };
  }

  await approvePendingStudentRequests();

  revalidatePath("/admin");
  revalidatePath("/pending-role");
  revalidatePath("/");

  return { success: true };
}
