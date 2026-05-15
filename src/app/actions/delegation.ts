"use server";

import { requireAssignedUser, requireRole } from "@/lib/auth";
import {
  approveDelegationRequest,
  cancelDelegationRequestByRequester,
  createDelegationRequest,
  type DelegationQueueKey,
  type DelegationQueueMap,
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
  const queueKeys = String(formData.get("queueKeys") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as DelegationQueueKey[];
  const queueDelegations: DelegationQueueMap = {};
  for (const queueKey of queueKeys) {
    const replacementId = String(formData.get(`queueDelegate_${queueKey}`) ?? "").trim();
    if (replacementId) {
      queueDelegations[queueKey] = replacementId;
    }
  }

  if (startsOn > endsOn) {
    throw new Error("End date must be on or after the start date.");
  }

  await createDelegationRequest({
    requesterUserId: user.id,
    requesterRole: user.role,
    replacementUserId,
    queueDelegations,
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
  const replacementUserId = String(formData.get("replacementUserId") ?? "").trim() || null;
  const adminRemarks = String(formData.get("adminRemarks") ?? "").trim();
  const incomingCount = Number(String(formData.get("incomingQueueCount") ?? "0"));
  const incomingQueueReassignments: Array<{
    sourceRequestId: string;
    queueKey: DelegationQueueKey;
    replacementUserId?: string | null;
  }> = [];

  for (let index = 0; index < incomingCount; index += 1) {
    const sourceRequestId = String(formData.get(`incomingSourceRequestId_${index}`) ?? "").trim();
    const queueKeyRaw = String(formData.get(`incomingQueueKey_${index}`) ?? "").trim();
    const replacement = String(formData.get(`incomingReplacementUserId_${index}`) ?? "").trim() || null;

    if (!sourceRequestId || !queueKeyRaw) continue;

    const queueKey = queueKeyRaw as DelegationQueueKey;
    incomingQueueReassignments.push({
      sourceRequestId,
      queueKey,
      replacementUserId: replacement,
    });
  }

  await approveDelegationRequest({
    requestId,
    replacementUserId,
    adminUserId: admin.id,
    adminRemarks,
    incomingQueueReassignments,
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
  revalidatePath("/admin/workflows");
}
