"use server";

import {
  canUseInstitutionLogin,
  clearSessionEmail,
  getDashboardPathForRole,
  getDashboardPathForUser,
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
import {
  authenticateUser,
  findUserByEmail,
  isStudentRoleRequestTagged,
  listUsers,
  setStudentRoleRequestTag,
  updateUserPassword,
  updateUserRole,
} from "@/lib/user-store";
import { getSupabaseAdminClient, getSupabaseAnonClient } from "@/lib/supabase";
import { createLoginOtp, verifyLoginOtp } from "@/lib/otp-store";
import { sendOtpEmail } from "@/lib/mailer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function finalizeLogin(input: {
  user: { id: string; email: string; role: AppRole | null };
  isStudentRequest: boolean;
}) {
  await setSessionEmail(input.user.email);

  if (!input.user.role && isInstituteEmail(input.user.email)) {
    await setStudentRoleRequestTag(input.user.id, input.isStudentRequest);
  }

  if (input.user.role === "SYSTEM_ADMIN") {
    redirect("/admin");
  }

  const delegatedRole = await getActiveDelegatedRoleForUser(input.user.id);
  const effectiveRole = delegatedRole ?? input.user.role;

  if (effectiveRole) {
    redirect(await getDashboardPathForUser(input.user.id, input.user.role));
  }

  if (isInstituteEmail(input.user.email) && !input.user.role) {
    redirect("/pending-role");
  }

  redirect(await getDashboardPathForRole(input.user.role));
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const modeRaw = String(formData.get("mode") ?? "login");
  const mode = modeRaw === "signup" ? "signup" : "login";
  const isStudentRequest = String(formData.get("isStudentRequest") ?? "") === "on";

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
      })
    ).user;
  } catch (error) {
    return { error: (error as Error).message };
  }

  await finalizeLogin({ user, isStudentRequest });
}

export async function signOut() {
  await clearSessionEmail();
  redirect("/sign-in");
}

type PasswordResetState = {
  error?: string;
  success?: string;
};

type OtpLoginState = {
  error?: string;
  success?: string;
};

export async function sendLoginOtp(
  _prev: OtpLoginState | undefined,
  formData: FormData
): Promise<OtpLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Email is required." };
  }

  if (!canUseInstitutionLogin(email)) {
    return { error: "Enter a valid email address." };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return { error: "Account not found. Please sign up with a password first." };
  }

  try {
    const { code } = await createLoginOtp({ email, expiresMinutes: 10 });
    await sendOtpEmail({ to: email, code, expiresMinutes: 10 });
    return { success: "OTP sent. Check your email inbox." };
  } catch (error) {
    return { error: (error as Error).message || "Unable to send OTP." };
  }
}

export async function signInWithOtp(
  _prev: OtpLoginState | undefined,
  formData: FormData
): Promise<OtpLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const otp = String(formData.get("otp") ?? "").trim();
  const isStudentRequest = String(formData.get("isStudentRequest") ?? "") === "on";

  if (!email) {
    return { error: "Email is required." };
  }

  if (!canUseInstitutionLogin(email)) {
    return { error: "Enter a valid email address." };
  }

  if (!otp) {
    return { error: "OTP is required." };
  }

  try {
    const result = await verifyLoginOtp({ email, code: otp });
    if (!result.ok) {
      return { error: result.reason === "expired" ? "OTP expired. Please resend." : "Invalid OTP." };
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return { error: "Account not found. Please sign up with a password first." };
    }

    await finalizeLogin({ user, isStudentRequest });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      const digest = String((error as { digest?: string }).digest ?? "");
      if (digest.startsWith("NEXT_REDIRECT")) {
        throw error;
      }
    }

    return { error: (error as Error).message || "Unable to sign in." };
  }

  return { error: "Unable to sign in." };
}

export async function sendPasswordResetOtp(_prev: PasswordResetState, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Email is required." };
  }

  if (!canUseInstitutionLogin(email)) {
    return { error: "Enter a valid email address." };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return { error: "No account found for that email." };
  }

  try {
    const admin = getSupabaseAdminClient();
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (created.error && !created.error.message.toLowerCase().includes("already")) {
      return { error: "Unable to prepare reset. Please try again." };
    }

    const anon = getSupabaseAnonClient();
    const { error } = await anon.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      return { error: "Failed to send OTP. Please try again." };
    }

    return { success: "OTP sent. Check your email inbox." };
  } catch (error) {
    return { error: (error as Error).message || "Unable to send OTP." };
  }
}

export async function resetPasswordWithOtp(_prev: PasswordResetState, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const otp = String(formData.get("otp") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email) {
    return { error: "Email is required." };
  }

  if (!canUseInstitutionLogin(email)) {
    return { error: "Enter a valid email address." };
  }

  if (!otp) {
    return { error: "OTP is required." };
  }

  if (!password) {
    return { error: "New password is required." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Password and confirm password do not match." };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return { error: "No account found for that email." };
  }

  try {
    const anon = getSupabaseAnonClient();
    const { data, error } = await anon.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error || !data.user) {
      return { error: "Invalid or expired OTP." };
    }

    await updateUserPassword(email, password);
    return { success: "Password updated. You can log in now." };
  } catch (error) {
    return { error: (error as Error).message || "Unable to reset password." };
  }
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

export async function approveAllPendingStudentRoles() {
  await requireRole(["SYSTEM_ADMIN"]);

  const users = await listUsers();
  const taggedPendingUsers = users.filter(
    (user) => isInstituteEmail(user.email) && isStudentRoleRequestTagged(user)
  );

  await Promise.all(taggedPendingUsers.map((user) => updateUserRole(user.id, "STUDENT")));

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
