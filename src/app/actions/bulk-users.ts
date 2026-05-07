"use server";

import { requireRole } from "@/lib/auth";
import { authenticateUser, findUserByEmail, updateUserRole } from "@/lib/user-store";
import { generateStrongPassword } from "@/lib/password-generator";
import { parseUserCsv, isValidInstitutionEmail } from "@/lib/csv-parser";
import type { AppRole } from "@/lib/mock-db";
import { BUILT_IN_ROLE_OPTIONS, getRoleLabel } from "@/lib/roles";
import { listCustomRoles, normalizeAssignableRoleCode } from "@/lib/custom-role-store";
import { revalidatePath } from "next/cache";

export type BulkUserCreationResult = {
  success: boolean;
  totalProcessed: number;
  created: Array<{ email: string; password: string; role?: string }>;
  skipped: Array<{ email: string; reason: string }>;
  errors: Array<{ email: string; error: string }>;
};

export async function bulkCreateUsers(
  csvContent: string
): Promise<BulkUserCreationResult> {
  // Check authorization
  await requireRole(["SYSTEM_ADMIN"]);

  const result: BulkUserCreationResult = {
    success: false,
    totalProcessed: 0,
    created: [],
    skipped: [],
    errors: [],
  };

  // Parse CSV
  let users;
  try {
    users = parseUserCsv(csvContent);
  } catch (error) {
    return {
      ...result,
      errors: [
        {
          email: "CSV",
          error: (error as Error).message || "Failed to parse CSV",
        },
      ],
    };
  }

  if (users.length === 0) {
    return {
      ...result,
      errors: [{ email: "CSV", error: "No valid users found in CSV" }],
    };
  }

  // Get allowed roles (built-in + custom)
  const customRoles = await listCustomRoles();
  const allowedRoles = new Set<string>([
    ...BUILT_IN_ROLE_OPTIONS,
    ...customRoles.map((role) => role.roleCode),
  ]);

  // Process each user
  for (const user of users) {
    result.totalProcessed++;

    // Validate email
    if (!user.email) {
      result.errors.push({
        email: "N/A",
        error: "Email is required",
      });
      continue;
    }

    if (!isValidInstitutionEmail(user.email)) {
      result.skipped.push({
        email: user.email,
        reason: `Invalid institution email (must be @iitrpr.ac.in)`,
      });
      continue;
    }

    // Validate role if provided
    let normalizedRole: AppRole | null = null;
    if (user.userrole) {
      const normalizedRoleCode = normalizeAssignableRoleCode(user.userrole);
      if (!allowedRoles.has(normalizedRoleCode)) {
        result.skipped.push({
          email: user.email,
          reason: `Invalid role: ${user.userrole}. Allowed roles: ${Array.from(allowedRoles).join(", ")}`,
        });
        continue;
      }
      normalizedRole = normalizedRoleCode as AppRole;
    }

    // Check if user already exists
    const existing = await findUserByEmail(user.email);
    if (existing) {
      result.skipped.push({
        email: user.email,
        reason: "User already exists",
      });
      continue;
    }

    // Generate password and create user
    try {
      const password = generateStrongPassword();
      const { user: createdUser } = await authenticateUser({
        mode: "signup",
        email: user.email,
        password,
        fullName: null,
      });

      // Assign role if provided
      if (normalizedRole) {
        await updateUserRole(createdUser.id, normalizedRole);
      }

      result.created.push({
        email: user.email,
        password,
        role: normalizedRole ? getRoleLabel(normalizedRole) : undefined,
      });
    } catch (error) {
      result.errors.push({
        email: user.email,
        error: (error as Error).message || "Failed to create user",
      });
    }
  }

  result.success = result.errors.length === 0;

  // Revalidate affected pages
  revalidatePath("/admin");

  return result;
}
