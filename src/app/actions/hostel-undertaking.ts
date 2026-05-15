"use server";

import { getQueueRoleForUser, requireRole, requireUser } from "@/lib/auth";
import {
  approveHostelUndertakingAtStage,
  approveHostelUndertakingByWarden,
  createHostelUndertakingForm,
  getHostelUndertakingFormById,
  rejectHostelUndertakingAtStage,
  rejectHostelUndertakingByWarden,
} from "@/lib/hostel-undertaking-store";
import { getRoleLabel } from "@/lib/roles";
import {
  getNextStage,
  getStagesForRole,
  getWorkflow,
  getWorkflowStageMode,
  getWorkflowStageRoleCodes,
} from "@/lib/workflow-engine";
import {
  addRoleApprovalForStage,
  clearStageRoleApprovals,
  listApprovedRolesForStage,
} from "@/lib/workflow-stage-approvals";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getHostelUndertakingWorkflowOrThrow() {
  const workflow = await getWorkflow("hostel-undertaking");
  if (!workflow) {
    throw new Error("Hostel Undertaking workflow blueprint not found in database.");
  }
  return workflow;
}

async function resolveHostelUndertakingRoleContext() {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "hostel-undertaking",
  });
  const activeRole = queueRole.activeRole;

  if (!activeRole) {
    throw new Error("You do not have an assigned stakeholder role.");
  }

  return {
    user,
    activeRole,
    isSystemAdmin: activeRole === "SYSTEM_ADMIN",
  };
}

async function resolveHostelUndertakingActionContext(submissionId: string) {
  const roleContext = await resolveHostelUndertakingRoleContext();
  const workflow = await getHostelUndertakingWorkflowOrThrow();

  const form = await getHostelUndertakingFormById(submissionId);
  if (!form) {
    throw new Error("Hostel undertaking form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }

  if (!roleContext.isSystemAdmin) {
    const roleStages = getStagesForRole(workflow, roleContext.activeRole);
    if (!roleStages.includes(form.currentStage)) {
      throw new Error("You are not authorized for the current stage.");
    }
  }

  return {
    ...roleContext,
    workflow,
    form,
  };
}

async function assertHostelUndertakingBulkStageAccess(stage: number) {
  const roleContext = await resolveHostelUndertakingRoleContext();
  const workflow = await getHostelUndertakingWorkflowOrThrow();

  if (!roleContext.isSystemAdmin) {
    const roleStages = getStagesForRole(workflow, roleContext.activeRole);
    if (!roleStages.includes(stage)) {
      throw new Error("You are not authorized to review this stage in bulk.");
    }
  }

  return { ...roleContext, workflow };
}

async function shouldFinalizeHostelUndertakingStageApproval(input: {
  submissionId: string;
  stageNumber: number;
  activeRole: string;
  isSystemAdmin: boolean;
  workflow: Awaited<ReturnType<typeof getHostelUndertakingWorkflowOrThrow>>;
  user: { id: string; email: string; fullName?: string | null };
}) {
  const stageDefinition = input.workflow.stages.find((stage) => stage.stage === input.stageNumber);
  if (!stageDefinition) {
    throw new Error("Current workflow stage is no longer available.");
  }

  if (input.isSystemAdmin) {
    return true;
  }

  const mode = getWorkflowStageMode(stageDefinition);
  const requiredRoles = getWorkflowStageRoleCodes(stageDefinition).filter((role) => role !== "SYSTEM_ADMIN");
  if (mode !== "AND" || requiredRoles.length <= 1) {
    return true;
  }

  const insertResult = await addRoleApprovalForStage({
    submissionId: input.submissionId,
    stageNumber: input.stageNumber,
    roleCode: input.activeRole,
    approverUserId: input.user.id,
    approverEmail: input.user.email,
    approverName: input.user.fullName ?? null,
  });

  if (!insertResult.inserted) {
    throw new Error("This role has already approved this stage. Waiting for remaining approvals.");
  }

  const approvedRoles = new Set(await listApprovedRolesForStage(input.submissionId, input.stageNumber));
  return requiredRoles.every((roleCode) => approvedRoles.has(roleCode));
}

function requiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function requiredAmount(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

function requiredTenDigitMobile(formData: FormData, key: string, label: string) {
  const value = requiredString(formData, key, label);
  if (!/^\d{10}$/.test(value)) {
    throw new Error(`${label} must be exactly 10 digits.`);
  }
  return value;
}

function optionalTenDigitMobile(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    return null;
  }
  if (!/^\d{10}$/.test(value)) {
    throw new Error(`${label} must be exactly 10 digits.`);
  }
  return value;
}

async function requiredFile(
  formData: FormData,
  key: string,
  label: string,
  options?: { jpgOnly?: boolean }
) {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`${label} is required.`);
  }

  if (options?.jpgOnly) {
    const mimeType = (value.type || "").toLowerCase();
    const fileName = value.name.toLowerCase();
    const isJpgMime = mimeType === "image/jpeg" || mimeType === "image/jpg";
    const isJpgExt = fileName.endsWith(".jpg") || fileName.endsWith(".jpeg");

    if (!isJpgMime && !isJpgExt) {
      throw new Error(`${label} must be a JPG image.`);
    }
  }

  return {
    fileName: value.name,
    mimeType: value.type || "application/octet-stream",
    buffer: Buffer.from(await value.arrayBuffer()),
  };
}

export async function submitHostelUndertakingForm(formData: FormData) {
  const user = await requireRole(["STUDENT", "INTERN"]);
  const undertakingAccepted = formData.get("undertakingAccepted") === "on";

  if (!undertakingAccepted) {
    throw new Error("Please accept the undertaking before submitting this form.");
  }

  const submissionId = await createHostelUndertakingForm({
    submitter: {
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? null,
      role: user.role,
    },
    studentName: requiredString(formData, "studentName", "Student name"),
    entryNumber: requiredString(formData, "entryNumber", "Entry number"),
    courseName: requiredString(formData, "courseName", "Course"),
    department: requiredString(formData, "department", "Department"),
    hostelRoomNo: requiredString(formData, "hostelRoomNo", "Hostel room number"),
    emailAddress: requiredString(formData, "emailAddress", "Email address"),
    dateOfJoining: requiredString(formData, "dateOfJoining", "Date of joining"),
    hefAmount: requiredAmount(formData, "hefAmount", "HEF amount"),
    messSecurity: requiredAmount(formData, "messSecurity", "Mess security"),
    messAdmissionFee: requiredAmount(formData, "messAdmissionFee", "Mess admission fee"),
    messCharges: requiredAmount(formData, "messCharges", "Mess charges"),
    bloodGroup: requiredString(formData, "bloodGroup", "Blood group"),
    category: requiredString(formData, "category", "Category"),
    emergencyContactNo: requiredString(formData, "emergencyContactNo", "Emergency contact number"),
    declarationDate: requiredString(formData, "declarationDate", "Declaration date"),
    parentGuardian: {
      relationship: requiredString(formData, "parentRelationship", "Parent relationship"),
      officeAddressLine1: optionalString(formData, "parentOfficeAddressLine1"),
      officeAddressLine2: optionalString(formData, "parentOfficeAddressLine2"),
      officeMobile: optionalTenDigitMobile(formData, "parentOfficeMobile", "Parent office mobile"),
      officeTelephone: optionalString(formData, "parentOfficeTelephone"),
      officeEmail: optionalString(formData, "parentOfficeEmail"),
      residenceAddressLine1: requiredString(
        formData,
        "parentResidenceAddressLine1",
        "Parent residence address line 1"
      ),
      residenceAddressLine2: optionalString(formData, "parentResidenceAddressLine2"),
      residenceMobile: requiredTenDigitMobile(
        formData,
        "parentResidenceMobile",
        "Parent residence mobile"
      ),
      residenceTelephone: optionalString(formData, "parentResidenceTelephone"),
      residenceEmail: optionalString(formData, "parentResidenceEmail"),
    },
    localGuardian: {
      relationship: optionalString(formData, "localRelationship"),
      officeAddressLine1: optionalString(formData, "localOfficeAddressLine1"),
      officeAddressLine2: optionalString(formData, "localOfficeAddressLine2"),
      officeMobile: optionalString(formData, "localOfficeMobile"),
      officeTelephone: optionalString(formData, "localOfficeTelephone"),
      officeEmail: optionalString(formData, "localOfficeEmail"),
      residenceAddressLine1: optionalString(formData, "localResidenceAddressLine1"),
      residenceAddressLine2: optionalString(formData, "localResidenceAddressLine2"),
      residenceMobile: optionalString(formData, "localResidenceMobile"),
      residenceTelephone: optionalString(formData, "localResidenceTelephone"),
      residenceEmail: optionalString(formData, "localResidenceEmail"),
    },
    attachments: {
      passportPhoto: await requiredFile(formData, "passportPhoto", "Passport size photo"),
      parentSignatureDoc: await requiredFile(
        formData,
        "parentSignatureDoc",
        "Signed parent undertaking",
        { jpgOnly: true }
      ),
    },
  });

  redirect(`/forms/hostel-undertaking/${submissionId}`);
}

export async function approveHostelUndertakingStageByWarden(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveHostelUndertakingActionContext(submissionId);
  if (form.currentStage !== 1) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  if (!approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!remark.trim()) {
    throw new Error("Remark is required.");
  }

  const finalizeStage = await shouldFinalizeHostelUndertakingStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/hostel-undertaking/${submissionId}`);
    revalidatePath("/dashboard/hostel-undertaking");
    return;
  }

  const actorName = (user.fullName ?? "").trim() || approverName.trim() || user.email;

  await approveHostelUndertakingByWarden({
    submissionId,
    approverName: actorName,
    remark: remark.trim(),
    approverRoleLabel: getRoleLabel(activeRole),
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/hostel-undertaking/${submissionId}`);
  revalidatePath("/dashboard/hostel-undertaking");
  revalidatePath(`/forms/hostel-undertaking/${submissionId}`);
}

export async function rejectHostelUndertakingStageByWarden(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form, activeRole, user } = await resolveHostelUndertakingActionContext(submissionId);
  if (form.currentStage !== 1) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  if (!approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const actorName = (user.fullName ?? "").trim() || approverName.trim() || user.email;

  await rejectHostelUndertakingByWarden({
    submissionId,
    approverName: actorName,
    remark: remark.trim(),
    approverRoleLabel: getRoleLabel(activeRole),
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/hostel-undertaking/${submissionId}`);
  revalidatePath("/dashboard/hostel-undertaking");
  revalidatePath(`/forms/hostel-undertaking/${submissionId}`);
}

export async function approveHostelUndertakingAtCurrentStage(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveHostelUndertakingActionContext(submissionId);

  if (!approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!remark.trim()) {
    throw new Error("Remark is required.");
  }

  const finalizeStage = await shouldFinalizeHostelUndertakingStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/hostel-undertaking/${submissionId}`);
    revalidatePath("/dashboard/hostel-undertaking");
    return;
  }

  const nextStage = getNextStage(workflow, form.currentStage);
  const roleLabel = getRoleLabel(activeRole);
  await approveHostelUndertakingAtStage({
    submissionId,
    stageNumber: form.currentStage,
    nextStage: nextStage ?? form.currentStage,
    markApproved: nextStage === null,
    recommendationText: `${roleLabel}: ${approverName.trim()} | ${remark.trim()}`,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/hostel-undertaking/${submissionId}`);
  revalidatePath("/dashboard/hostel-undertaking");
  revalidatePath(`/forms/hostel-undertaking/${submissionId}`);
}

export async function rejectHostelUndertakingAtCurrentStage(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form, activeRole } = await resolveHostelUndertakingActionContext(submissionId);

  if (!approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  await rejectHostelUndertakingAtStage({
    submissionId,
    stageNumber: form.currentStage,
    recommendationText: `Rejected by ${getRoleLabel(activeRole)}: ${approverName.trim()} | ${remark.trim()}`,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/hostel-undertaking/${submissionId}`);
  revalidatePath("/dashboard/hostel-undertaking");
  revalidatePath(`/forms/hostel-undertaking/${submissionId}`);
}

export async function bulkReviewHostelUndertakingForms(input: {
  submissionIds: string[];
  decision: "approve" | "reject";
  approverName: string;
  remark: string;
  stage: number;
}) {
  const { user, activeRole, isSystemAdmin, workflow } =
    await assertHostelUndertakingBulkStageAccess(input.stage);

  const ids = input.submissionIds.filter(Boolean);
  if (ids.length === 0) {
    throw new Error("Please select at least one request.");
  }
  if (!input.approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!input.remark.trim()) {
    throw new Error("Bulk remark is required.");
  }

  for (const submissionId of ids) {
    const form = await getHostelUndertakingFormById(submissionId);
    if (!form || form.currentStage !== input.stage || form.overallStatus === "approved" || form.overallStatus === "rejected") {
      continue;
    }

    if (input.decision === "approve") {
      const finalizeStage = await shouldFinalizeHostelUndertakingStageApproval({
        submissionId,
        stageNumber: form.currentStage,
        activeRole,
        isSystemAdmin,
        workflow,
        user,
      });
      if (!finalizeStage) {
        continue;
      }

      if (form.currentStage === 1) {
        await approveHostelUndertakingByWarden({
          submissionId,
          approverName: (user.fullName ?? "").trim() || input.approverName,
          remark: input.remark,
          approverRoleLabel: getRoleLabel(activeRole),
        });
      } else {
        const nextStage = getNextStage(workflow, form.currentStage);
        await approveHostelUndertakingAtStage({
          submissionId,
          stageNumber: form.currentStage,
          nextStage: nextStage ?? form.currentStage,
          markApproved: nextStage === null,
          recommendationText: `${getRoleLabel(activeRole)}: ${input.approverName} | ${input.remark}`,
        });
      }
      await clearStageRoleApprovals(submissionId, form.currentStage);
    } else {
      if (form.currentStage === 1) {
        await rejectHostelUndertakingByWarden({
          submissionId,
          approverName: (user.fullName ?? "").trim() || input.approverName,
          remark: input.remark,
          approverRoleLabel: getRoleLabel(activeRole),
        });
      } else {
        await rejectHostelUndertakingAtStage({
          submissionId,
          stageNumber: form.currentStage,
          recommendationText: `Rejected by ${getRoleLabel(activeRole)}: ${input.approverName} | ${input.remark}`,
        });
      }
      await clearStageRoleApprovals(submissionId, form.currentStage);
    }
  }

  revalidatePath("/dashboard/hostel-undertaking");
}
