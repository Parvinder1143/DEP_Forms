"use server";

import { BUILT_IN_ROLE_OPTIONS } from "@/lib/roles";
import { listCustomRoles } from "@/lib/custom-role-store";
import type { AppRole } from "@/lib/mock-db";

export async function getAvailableRoles(): Promise<AppRole[]> {
  const customRoles = await listCustomRoles();
  return Array.from(
    new Set<AppRole>([
      ...BUILT_IN_ROLE_OPTIONS,
      ...customRoles.map((role) => role.roleCode as AppRole),
    ])
  );
}
