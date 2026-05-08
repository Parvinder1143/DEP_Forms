import { requireApplicantFormAccess } from "@/lib/auth";
import { GuestHouseFormClient } from "./guest-house-form-client";
import { listDepartments } from "@/lib/department-store";

export default async function GuestHouseFormPage() {
  await requireApplicantFormAccess("guest-house");
  const departments = await listDepartments();
  return <GuestHouseFormClient departments={departments} />;
}
