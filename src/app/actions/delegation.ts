"use server";

import { requireAssignedUser, requireRole } from "@/lib/auth";
import {
  approveDelegationRequest,
  cancelDelegationRequestByRequester,
  createDelegationRequest,
  rejectDelegationRequest,
  terminateDelegationRequestByAdmin,
} from "@/lib/delegation-store";
import { revalidatePath } from "next/cache";

function requiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

function parseDateAtMidnight(value: string, label: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} is invalid.`);
  }
  return date;
}

function parseDateAtEndOfDay(value: string, label: string) {
  const date = new Date(`${value}T23:59:59.999`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} is invalid.`);
  }
  return date;
}

export async function submitUnavailabilityRequest(formData: FormData) {
  const user = await requireAssignedUser();

  if (!user.role || user.role === "SYSTEM_ADMIN") {
    throw new Error("Only assigned stakeholder roles can create unavailability requests.");
  }

  const startsOn = parseDateAtMidnight(requiredString(formData, "startsOn", "Start date"), "Start date");
  const endsOn = parseDateAtEndOfDay(requiredString(formData, "endsOn", "End date"), "End date");
  const reason = requiredString(formData, "reason", "Reason");
  const replacementUserIdRaw = String(formData.get("replacementUserId") ?? "").trim();
  const replacementUserId = replacementUserIdRaw || null;

  if (startsOn > endsOn) {
    throw new Error("End date must be on or after the start date.");
  }

  await createDelegationRequest({
    requesterUserId: user.id,
    requesterRole: user.role,
    replacementUserId,
    startsAt: startsOn,
    endsAt: endsOn,
    reason,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/email-id");
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath("/dashboard/identity-card");
  revalidatePath("/dashboard/guest-house");
  revalidatePath("/dashboard/hostel-undertaking");
}

export async function cancelOwnUnavailabilityRequest(formData: FormData) {
  const user = await requireAssignedUser();
  const requestId = requiredString(formData, "requestId", "Request ID");

  await cancelDelegationRequestByRequester({
    requestId,
    requesterUserId: user.id,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/email-id");
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath("/dashboard/identity-card");
  revalidatePath("/dashboard/guest-house");
  revalidatePath("/dashboard/hostel-undertaking");
}

export async function approveUnavailabilityRequest(formData: FormData) {
  const admin = await requireRole(["SYSTEM_ADMIN"]);

  const requestId = requiredString(formData, "requestId", "Request ID");
  const replacementUserId = requiredString(formData, "replacementUserId", "Replacement user");
  const adminRemarks = String(formData.get("adminRemarks") ?? "").trim();

  await approveDelegationRequest({
    requestId,
    replacementUserId,
    adminUserId: admin.id,
    adminRemarks,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/email-id");
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath("/dashboard/identity-card");
  revalidatePath("/dashboard/guest-house");
  revalidatePath("/dashboard/hostel-undertaking");
}

export async function rejectUnavailabilityRequest(formData: FormData) {
  const admin = await requireRole(["SYSTEM_ADMIN"]);

  const requestId = requiredString(formData, "requestId", "Request ID");
  const adminRemarks = String(formData.get("adminRemarks") ?? "").trim();

  await rejectDelegationRequest({
    requestId,
    adminUserId: admin.id,
    adminRemarks,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/email-id");
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath("/dashboard/identity-card");
  revalidatePath("/dashboard/guest-house");
  revalidatePath("/dashboard/hostel-undertaking");
}

export async function terminateUnavailabilityRequest(formData: FormData) {
  const admin = await requireRole(["SYSTEM_ADMIN"]);

  const requestId = requiredString(formData, "requestId", "Request ID");
  const adminRemarksInput = String(formData.get("adminRemarks") ?? "").trim();
  const adminRemarks =
    adminRemarksInput ||
    `Delegation terminated by System Admin on ${new Date().toLocaleString("en-IN")}.`;

  await terminateDelegationRequestByAdmin({
    requestId,
    adminUserId: admin.id,
    adminRemarks,
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard/email-id");
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath("/dashboard/identity-card");
  revalidatePath("/dashboard/guest-house");
  revalidatePath("/dashboard/hostel-undertaking");
  revalidatePath("/dashboard/delegation");
}
