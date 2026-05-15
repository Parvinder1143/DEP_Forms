"use server";

import { getQueueRoleForUser, requireRole, requireUser } from "@/lib/auth";
import {
  approveVehicleStickerStage1,
  approveVehicleStickerStage2,
  approveVehicleStickerStage3,
  approveVehicleStickerAtStage,
  createVehicleStickerForm,
  getVehicleStickerFormById,
  rejectVehicleStickerStage1,
  rejectVehicleStickerStage2,
  rejectVehicleStickerStage3,
  rejectVehicleStickerAtStage,
  upsertVehicleStickerAttachmentsForSubmission,
} from "@/lib/vehicle-sticker-store";
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
import { checkHodDepartmentAccess } from "@/lib/department-store";

async function getVehicleStickerWorkflowOrThrow() {
  const workflow = await getWorkflow("vehicle-sticker");
  if (!workflow) {
    throw new Error("Vehicle Sticker workflow blueprint not found in database.");
  }
  return workflow;
}

async function resolveVehicleStickerRoleContext() {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "vehicle-sticker",
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

async function resolveVehicleStickerActionContext(submissionId: string) {
  const roleContext = await resolveVehicleStickerRoleContext();
  const workflow = await getVehicleStickerWorkflowOrThrow();

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }
  if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
    throw new Error("This request is already finalized.");
  }

  if (!roleContext.isSystemAdmin) {
    const stages = getStagesForRole(workflow, roleContext.activeRole);
    if (!stages.includes(form.currentStage)) {
      throw new Error("You are not authorized for the current stage.");
    }
  }

  if (roleContext.activeRole === "HOD") {
    if (form.department) {
      const hasAccess = await checkHodDepartmentAccess(roleContext.user.email, form.department);
      if (!hasAccess) {
        throw new Error("You are not authorized to approve requests for this department.");
      }
    }
  }

  return {
    ...roleContext,
    workflow,
    form,
  };
}

async function assertVehicleStickerBulkStageAccess(stage: number) {
  const roleContext = await resolveVehicleStickerRoleContext();
  const workflow = await getVehicleStickerWorkflowOrThrow();

  if (!roleContext.isSystemAdmin) {
    const roleStages = getStagesForRole(workflow, roleContext.activeRole);
    if (!roleStages.includes(stage)) {
      throw new Error("You are not authorized to review this stage in bulk.");
    }
  }

  return { ...roleContext, workflow };
}

async function shouldFinalizeVehicleStickerStageApproval(input: {
  submissionId: string;
  stageNumber: number;
  activeRole: string;
  isSystemAdmin: boolean;
  workflow: Awaited<ReturnType<typeof getVehicleStickerWorkflowOrThrow>>;
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

export async function submitVehicleStickerForm(formData: FormData) {
  const user = await requireRole(["STUDENT", "INTERN", "EMPLOYEE"]);
  const now = new Date();
  const declarationDateRaw = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const registrationNo = String(formData.get("vehicleRegistrationNo") ?? "").trim();
  const vehicleType = String(formData.get("vehicleType") ?? "").trim();
  const makeModel = String(formData.get("vehicleMakeModel") ?? "").trim();
  const colour = String(formData.get("vehicleColour") ?? "").trim();

  if (!registrationNo || !vehicleType || !makeModel || !colour) {
    return { error: "Please fill all vehicle details." };
  }

  const vehicleDetails = [
    {
      serialNo: 1,
      registrationNo,
      vehicleType: vehicleType as "2W" | "4W",
      makeModel,
      colour,
    },
  ];

  const requiredFiles: Array<{ key: string; label: string }> = [
    { key: "applicantPhoto", label: "Applicant Photo" },
    { key: "vehicleRc", label: "Vehicle RC" },
    { key: "drivingLicenseDoc", label: "Driving License (DL)" },
    { key: "collegeIdDoc", label: "College ID" },
  ];

  for (const fileField of requiredFiles) {
    const value = formData.get(fileField.key);
    if (!(value instanceof File) || value.size === 0) {
      return { error: `${fileField.label} is required.` };
    }
  }

  const applicantPhoto = formData.get("applicantPhoto") as File;
  const vehicleRc = formData.get("vehicleRc") as File;
  const drivingLicenseDoc = formData.get("drivingLicenseDoc") as File;
  const collegeIdDoc = formData.get("collegeIdDoc") as File;

  const applicantName = String(formData.get("applicantName") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const entryOrEmpNo = String(formData.get("entryOrEmpNo") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const emailContact = String(formData.get("emailContact") ?? "").trim();
  const drivingLicenseNo = String(formData.get("drivingLicenseNo") ?? "").trim();
  const dlValidUpto = String(formData.get("dlValidUpto") ?? "").trim();

  if (
    !applicantName ||
    !designation ||
    !entryOrEmpNo ||
    !department ||
    !address ||
    !phone ||
    !emailContact ||
    !drivingLicenseNo ||
    !dlValidUpto
  ) {
    return { error: "Please fill all required fields." };
  }

  const submissionId = await createVehicleStickerForm({
    submitter: {
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? null,
      role: user.role,
    },
    applicantName,
    designation,
    department,
    entryOrEmpNo,
    address,
    phone,
    emailContact,
    drivingLicenseNo,
    dlValidUpto,
    declarationDate: declarationDateRaw,
    vehicleDetails,
    attachments: {
      applicantPhoto: {
        fileName: applicantPhoto.name,
        mimeType: applicantPhoto.type || "application/octet-stream",
        buffer: Buffer.from(await applicantPhoto.arrayBuffer()),
      },
      vehicleRc: {
        fileName: vehicleRc.name,
        mimeType: vehicleRc.type || "application/octet-stream",
        buffer: Buffer.from(await vehicleRc.arrayBuffer()),
      },
      drivingLicenseDoc: {
        fileName: drivingLicenseDoc.name,
        mimeType: drivingLicenseDoc.type || "application/octet-stream",
        buffer: Buffer.from(await drivingLicenseDoc.arrayBuffer()),
      },
      collegeIdDoc: {
        fileName: collegeIdDoc.name,
        mimeType: collegeIdDoc.type || "application/octet-stream",
        buffer: Buffer.from(await collegeIdDoc.arrayBuffer()),
      },
    },
  });

  redirect(`/forms/vehicle-sticker/${submissionId}`);
}

export async function approveVehicleStickerBySupervisor(
  submissionId: string,
  approverName: string
) {
  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveVehicleStickerActionContext(submissionId);
  if (form.currentStage !== 1) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const finalizeStage = await shouldFinalizeVehicleStickerStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
    revalidatePath("/dashboard/vehicle-sticker");
    return;
  }

  await approveVehicleStickerStage1({ submissionId, approverName });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function rejectVehicleStickerBySupervisor(
  submissionId: string,
  approverName: string,
  remark: string
) {
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const { form } = await resolveVehicleStickerActionContext(submissionId);
  if (form.currentStage !== 1) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  await rejectVehicleStickerStage1({ submissionId, approverName, remark: remark.trim() });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function approveVehicleStickerByHod(
  submissionId: string,
  approverName: string,
  validUpto: string
) {
  if (!validUpto.trim()) {
    throw new Error("Valid upto date is required.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validUpto.trim())) {
    throw new Error("Valid upto date must be in YYYY-MM-DD format.");
  }

  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveVehicleStickerActionContext(submissionId);
  if (form.currentStage !== 2) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const finalizeStage = await shouldFinalizeVehicleStickerStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
    revalidatePath("/dashboard/vehicle-sticker");
    return;
  }

  await approveVehicleStickerStage2({
    submissionId,
    approverName,
    validUpto: validUpto.trim(),
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function rejectVehicleStickerByHod(
  submissionId: string,
  approverName: string,
  remark: string
) {
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const { form } = await resolveVehicleStickerActionContext(submissionId);
  if (form.currentStage !== 2) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  await rejectVehicleStickerStage2({ submissionId, approverName, remark: remark.trim() });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function approveVehicleStickerByStudentAffairsHostel(
  submissionId: string,
  approverName: string,
  residingInHostel: boolean,
  recommendationText: string
) {
  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveVehicleStickerActionContext(submissionId);
  if (form.currentStage !== 3) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const finalizeStage = await shouldFinalizeVehicleStickerStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
    revalidatePath("/dashboard/vehicle-sticker");
    return;
  }

  await approveVehicleStickerStage3({
    submissionId,
    approverName,
    residingInHostel,
    recommendationText,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function rejectVehicleStickerByStudentAffairsHostel(
  submissionId: string,
  approverName: string,
  remark: string
) {
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const { form } = await resolveVehicleStickerActionContext(submissionId);
  if (form.currentStage !== 3) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  await rejectVehicleStickerStage3({ submissionId, approverName, remark: remark.trim() });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function issueVehicleStickerBySecurityOffice(
  submissionId: string,
  approverName: string,
  issuedStickerNo: string,
  validUpto: string,
  issueDate: string
) {
  if (!issuedStickerNo.trim()) {
    throw new Error("Sticker number is required.");
  }
  if (!validUpto.trim()) {
    throw new Error("Valid upto date is required.");
  }
  if (!issueDate.trim()) {
    throw new Error("Issue date is required.");
  }

  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveVehicleStickerActionContext(submissionId);
  const isFinalStage = getNextStage(workflow, form.currentStage) === null;
  if (!isFinalStage) {
    throw new Error("This action is allowed only at the final stage.");
  }

  const finalizeStage = await shouldFinalizeVehicleStickerStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
    revalidatePath("/dashboard/vehicle-sticker");
    return;
  }

  const nextStage = getNextStage(workflow, form.currentStage);
  const markApproved = nextStage === null;

  await approveVehicleStickerAtStage({
    submissionId,
    stageNumber: form.currentStage,
    nextStage: nextStage ?? form.currentStage,
    markApproved,
    recommendationText: `Security Office: ${approverName}`,
    issuedStickerNo: issuedStickerNo.trim(),
    validUpto: validUpto.trim(),
    issueDate: issueDate.trim(),
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function rejectVehicleStickerBySecurityOffice(
  submissionId: string,
  approverName: string,
  remark: string
) {
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const { form } = await resolveVehicleStickerActionContext(submissionId);
  if (form.currentStage !== 4) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  await rejectVehicleStickerAtStage({
    submissionId,
    stageNumber: form.currentStage,
    recommendationText: `Rejected by Security Office: ${approverName} | ${remark.trim()}`,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function approveVehicleStickerAtCurrentStage(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveVehicleStickerActionContext(submissionId);

  if (!approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!remark.trim()) {
    throw new Error("Approval remark is required.");
  }

  const finalizeStage = await shouldFinalizeVehicleStickerStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
    revalidatePath("/dashboard/vehicle-sticker");
    return;
  }

  const nextStage = getNextStage(workflow, form.currentStage);
  await approveVehicleStickerAtStage({
    submissionId,
    stageNumber: form.currentStage,
    nextStage: nextStage ?? form.currentStage,
    markApproved: nextStage === null,
    recommendationText: `${activeRole}: ${approverName.trim()} | ${remark.trim()}`,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function rejectVehicleStickerAtCurrentStage(
  submissionId: string,
  approverName: string,
  remark: string
) {
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const { form, activeRole } = await resolveVehicleStickerActionContext(submissionId);
  await rejectVehicleStickerAtStage({
    submissionId,
    stageNumber: form.currentStage,
    recommendationText: `Rejected by ${activeRole}: ${approverName.trim()} | ${remark.trim()}`,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
  revalidatePath("/dashboard/vehicle-sticker");
  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
}

export async function uploadMissingVehicleStickerAttachments(formData: FormData) {
  const user = await requireRole(["STUDENT", "INTERN", "EMPLOYEE", "SYSTEM_ADMIN"]);

  const submissionId = String(formData.get("submissionId") ?? "").trim();
  if (!submissionId) {
    throw new Error("Submission ID is required.");
  }

  const form = await getVehicleStickerFormById(submissionId);
  if (!form) {
    throw new Error("Vehicle sticker form not found.");
  }

  if (
    user.role !== "SYSTEM_ADMIN" &&
    form.submittedByEmail.toLowerCase() !== user.email.toLowerCase()
  ) {
    throw new Error("You are not allowed to update attachments for this form.");
  }

  const requiredFiles: Array<{ key: string; label: string }> = [
    { key: "applicantPhoto", label: "Applicant Photo" },
    { key: "vehicleRc", label: "Vehicle RC" },
    { key: "drivingLicenseDoc", label: "Driving License (DL)" },
    { key: "collegeIdDoc", label: "College ID" },
  ];

  for (const fileField of requiredFiles) {
    const value = formData.get(fileField.key);
    if (!(value instanceof File) || value.size === 0) {
      throw new Error(`${fileField.label} is required.`);
    }
  }

  const applicantPhoto = formData.get("applicantPhoto") as File;
  const vehicleRc = formData.get("vehicleRc") as File;
  const drivingLicenseDoc = formData.get("drivingLicenseDoc") as File;
  const collegeIdDoc = formData.get("collegeIdDoc") as File;

  await upsertVehicleStickerAttachmentsForSubmission({
    submissionId,
    submitter: {
      email: user.email,
      fullName: user.fullName ?? null,
      role: user.role,
    },
    attachments: {
      applicantPhoto: {
        fileName: applicantPhoto.name,
        mimeType: applicantPhoto.type || "application/octet-stream",
        buffer: Buffer.from(await applicantPhoto.arrayBuffer()),
      },
      vehicleRc: {
        fileName: vehicleRc.name,
        mimeType: vehicleRc.type || "application/octet-stream",
        buffer: Buffer.from(await vehicleRc.arrayBuffer()),
      },
      drivingLicenseDoc: {
        fileName: drivingLicenseDoc.name,
        mimeType: drivingLicenseDoc.type || "application/octet-stream",
        buffer: Buffer.from(await drivingLicenseDoc.arrayBuffer()),
      },
      collegeIdDoc: {
        fileName: collegeIdDoc.name,
        mimeType: collegeIdDoc.type || "application/octet-stream",
        buffer: Buffer.from(await collegeIdDoc.arrayBuffer()),
      },
    },
  });

  revalidatePath(`/forms/vehicle-sticker/${submissionId}`);
  revalidatePath(`/dashboard/vehicle-sticker/${submissionId}`);
}

function getVehicleStickerNoForBulk(submissionId: string, index: number) {
  const seed = submissionId.replace(/-/g, "").slice(-6).toUpperCase();
  return `VS-${new Date().getFullYear()}-${seed}-${index + 1}`;
}

function getIssuedStickerNoFromBulkInput(baseStickerNo: string, index: number, total: number) {
  if (total <= 1) {
    return baseStickerNo.trim();
  }
  return `${baseStickerNo.trim()}-${index + 1}`;
}

export async function bulkReviewVehicleStickerForms(input: {
  submissionIds: string[];
  decision: "approve" | "reject";
  approverName: string;
  remark: string;
  stage: number;
  validUpto?: string;
  issuedStickerNo?: string;
}) {
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
  const { user, activeRole, isSystemAdmin } = await assertVehicleStickerBulkStageAccess(input.stage);

  const now = new Date();
  const issueDate = now.toISOString().slice(0, 10);
  const validUptoDate = new Date(now);
  validUptoDate.setDate(validUptoDate.getDate() + 365);
  const defaultValidUpto = validUptoDate.toISOString().slice(0, 10);
  const workflow = await getWorkflow("vehicle-sticker");
  if (!workflow) {
    throw new Error("Vehicle Sticker workflow blueprint not found.");
  }
  const finalStage = workflow.stages
    .map((stage) => stage.stage)
    .sort((a, b) => b - a)[0];

  if (input.decision === "approve" && input.stage === 2) {
    if (!input.validUpto?.trim()) {
      throw new Error("Valid upto date is required for stage 2 bulk approval.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.validUpto.trim())) {
      throw new Error("Valid upto date must be in YYYY-MM-DD format.");
    }
  }

  if (input.decision === "approve" && input.stage === finalStage && !input.issuedStickerNo?.trim()) {
    throw new Error("Sticker number is required for final-stage bulk approval.");
  }

  for (let index = 0; index < ids.length; index += 1) {
    const submissionId = ids[index];
    const form = await getVehicleStickerFormById(submissionId);
    if (!form || form.overallStatus === "approved" || form.overallStatus === "rejected") {
      continue;
    }

    if (activeRole === "HOD") {
      if (form.department) {
        const hasAccess = await checkHodDepartmentAccess(user.email, form.department);
        if (!hasAccess) continue;
      }
    }

    if (form.currentStage !== input.stage) {
      continue;
    }

    const nextStage = getNextStage(workflow, form.currentStage);
    const markApproved = nextStage === null;
    if (input.decision === "approve") {
      const finalizeStage = await shouldFinalizeVehicleStickerStageApproval({
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

      await approveVehicleStickerAtStage({
        submissionId,
        stageNumber: form.currentStage,
        nextStage: nextStage ?? form.currentStage,
        markApproved,
        recommendationText: `Stage ${form.currentStage}: ${input.approverName} | ${input.remark}`,
        issuedStickerNo:
          markApproved && input.issuedStickerNo?.trim()
            ? getIssuedStickerNoFromBulkInput(input.issuedStickerNo, index, ids.length)
            : markApproved
              ? getVehicleStickerNoForBulk(submissionId, index)
              : undefined,
        validUpto:
          form.currentStage === 2
            ? input.validUpto?.trim()
            : markApproved
              ? defaultValidUpto
              : undefined,
        issueDate: markApproved ? issueDate : undefined,
      });
      await clearStageRoleApprovals(submissionId, form.currentStage);
    } else {
      await rejectVehicleStickerAtStage({
        submissionId,
        stageNumber: form.currentStage,
        recommendationText: `Rejected at Stage ${form.currentStage}: ${input.approverName} | ${input.remark}`,
      });
      await clearStageRoleApprovals(submissionId, form.currentStage);
    }
  }

  revalidatePath("/dashboard/vehicle-sticker");
}
