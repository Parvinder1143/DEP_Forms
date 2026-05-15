import { requireApplicantFormAccess } from "@/lib/auth";
import { IdentityCardFormClient } from "./identity-card-form-client";
import { listDepartments } from "@/lib/department-store";

export default async function IdentityCardFormPage() {
  const user = await requireApplicantFormAccess("identity-card");

  const departments = await listDepartments();

  return <IdentityCardFormClient userEmail={user.email} userFullName={user.fullName ?? ""} departments={departments} />;
}
