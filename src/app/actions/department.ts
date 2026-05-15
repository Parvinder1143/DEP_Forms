"use server";

import { requireRole } from "@/lib/auth";
import { createDepartment, updateDepartment, deleteDepartment } from "@/lib/department-store";
import { revalidatePath } from "next/cache";

export async function addDepartmentAction(formData: FormData) {
  await requireRole(["SYSTEM_ADMIN"]);
  
  const name = String(formData.get("name") ?? "");
  const hodEmail = String(formData.get("hodEmail") ?? "");

  if (!name.trim() || !hodEmail.trim()) {
    throw new Error("Name and HOD Email are required.");
  }

  await createDepartment(name.trim(), hodEmail.trim());
  revalidatePath("/admin");
}

export async function updateDepartmentAction(formData: FormData) {
  await requireRole(["SYSTEM_ADMIN"]);
  
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const hodEmail = String(formData.get("hodEmail") ?? "");

  if (!id || !name.trim() || !hodEmail.trim()) {
    throw new Error("ID, Name, and HOD Email are required.");
  }

  await updateDepartment(id, name.trim(), hodEmail.trim());
  revalidatePath("/admin");
}

export async function deleteDepartmentAction(formData: FormData) {
  await requireRole(["SYSTEM_ADMIN"]);
  
  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("ID is required.");
  }

  await deleteDepartment(id);
  revalidatePath("/admin");
}
