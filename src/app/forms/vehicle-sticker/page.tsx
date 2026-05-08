import { requireApplicantFormAccess } from "@/lib/auth";
import { VehicleStickerFormClient } from "./vehicle-sticker-form-client";
import { listDepartments } from "@/lib/department-store";

export default async function VehicleStickerFormPage() {
  await requireApplicantFormAccess("vehicle-sticker");
  const departments = await listDepartments();
  return <VehicleStickerFormClient departments={departments} />;
}
