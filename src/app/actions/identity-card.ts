"use server";

import { getQueueRoleForUser, requireRole, requireUser } from "@/lib/auth";
import {
  approveIdentityCardAtStage,
  approveIdentityCardStage1,
  approveIdentityCardStage2,
  approveIdentityCardStage3,
  createIdentityCardForm,
  getIdentityCardFormById,
  rejectIdentityCardAtStage,
  rejectIdentityCardStage,
  resolveWorkflowUserIdForActor,
} from "@/lib/identity-card-store";
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

async function getIdentityCardWorkflowOrThrow() {
  const workflow = await getWorkflow("identity-card");
  if (!workflow) {
    throw new Error("Identity Card workflow blueprint not found in database.");
  }
  return workflow;
}

async function resolveIdentityCardRoleContext() {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "identity-card",
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

async function resolveIdentityCardActionContext(submissionId: string) {
  const roleContext = await resolveIdentityCardRoleContext();
  const workflow = await getIdentityCardWorkflowOrThrow();

  const form = await getIdentityCardFormById(submissionId);
  if (!form) {
    throw new Error("Identity card form not found.");
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

  if (roleContext.activeRole === "HOD") {
    if (form.departmentSnapshot) {
      const hasAccess = await checkHodDepartmentAccess(roleContext.user.email, form.departmentSnapshot);
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

async function assertIdentityCardBulkStageAccess(stage: number) {
  const roleContext = await resolveIdentityCardRoleContext();
  const workflow = await getIdentityCardWorkflowOrThrow();

  if (!roleContext.isSystemAdmin) {
    const roleStages = getStagesForRole(workflow, roleContext.activeRole);
    if (!roleStages.includes(stage)) {
      throw new Error("You are not authorized to review this stage in bulk.");
    }
  }

  return { ...roleContext, workflow };
}

async function shouldFinalizeIdentityCardStageApproval(input: {
  submissionId: string;
  stageNumber: number;
  activeRole: string;
  isSystemAdmin: boolean;
  workflow: Awaited<ReturnType<typeof getIdentityCardWorkflowOrThrow>>;
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

async function requiredFile(formData: FormData, key: string, label: string) {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    throw new Error(`${label} is required.`);
  }

  return {
    fileName: value.name,
    mimeType: value.type || "application/octet-stream",
    buffer: Buffer.from(await value.arrayBuffer()),
  };
}

export async function submitIdentityCardForm(formData: FormData) {
  const user = await requireRole(["STUDENT", "INTERN", "EMPLOYEE"]);

  const cardType = requiredString(formData, "cardType", "Card type").toLowerCase();
  if (!["fresh", "renewal", "duplicate"].includes(cardType)) {
    throw new Error("Card type is invalid.");
  }

  const isRenewal = cardType === "renewal";
  const isDuplicate = cardType === "duplicate";
  const employmentType = requiredString(formData, "employmentType", "Employment type");
  const contractUptoValue = String(formData.get("contractUpto") ?? "").trim();

  const normalizedEmployment = employmentType.toLowerCase();
  const requiresContractUpto =
    normalizedEmployment === "temporary" || normalizedEmployment === "on contract";

  if (requiresContractUpto && !contractUptoValue) {
    throw new Error("Contract Upto is required for Temporary or On contract employment type.");
  }

  const previousCardValidity = isRenewal || isDuplicate
    ? requiredString(formData, "previousCardValidity", "Previous card validity")
    : null;

  const reasonForRenewal = isRenewal || isDuplicate
    ? requiredString(formData, "reasonForRenewal", "Reason")
    : null;

  const passportPhoto = await requiredFile(formData, "passportPhoto", "Passport photo");
  const previousIdCard = isRenewal || isDuplicate
    ? await requiredFile(formData, "previousIdCard", "Previous ID card copy")
    : null;

  const submissionId = await createIdentityCardForm({
    submitter: {
      id: user.id,
      email: user.email,
      fullName: user.fullName ?? null,
      role: user.role,
    },
    nameInCapitals: requiredString(formData, "nameInCapitals", "Name in capital letters"),
    employeeCodeSnapshot: requiredString(formData, "employeeCode", "Employee/Entry code"),
    designationSnapshot: requiredString(formData, "designation", "Designation"),
    employmentType,
    contractUpto: contractUptoValue || null,
    departmentSnapshot: requiredString(formData, "department", "Department"),
    fathersHusbandName: requiredString(formData, "fathersHusbandName", "Father/Husband name"),
    dateOfBirth: requiredString(formData, "dateOfBirth", "Date of birth"),
    dateOfJoining: requiredString(formData, "dateOfJoining", "Date of joining"),
    bloodGroup: requiredString(formData, "bloodGroup", "Blood group"),
    presentAddress: requiredString(formData, "presentAddress", "Present address"),
    presentAddressLine2: requiredString(formData, "presentAddressLine2", "Present address line 2"),
    officePhone: requiredString(formData, "officePhone", "Office phone"),
    mobileNumber: requiredString(formData, "mobileNumber", "Mobile number"),
    emailId: user.email,
    cardType: cardType as "fresh" | "renewal" | "duplicate",
    previousCardValidity,
    reasonForRenewal,
    attachments: {
      passportPhoto,
      previousIdCard,
      depositSlip: null,
      firCopy: null,
    },
  });

  redirect(`/forms/identity-card/${submissionId}`);
}

export async function approveIdentityCardByHodOrSectionHead(
  submissionId: string,
  approverName: string
) {
  const { form, activeRole, workflow, user, isSystemAdmin } =
    await resolveIdentityCardActionContext(submissionId);
  if (form.currentStage !== 1) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const finalizeStage = await shouldFinalizeIdentityCardStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/identity-card/${submissionId}`);
    revalidatePath("/dashboard/identity-card");
    return;
  }

  const roleLabel = activeRole === "SECTION_HEAD" ? "Section Head" : "HoD";
  await approveIdentityCardStage1({
    submissionId,
    approverName: approverName.trim(),
    approverRoleLabel: roleLabel,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function rejectIdentityCardByHodOrSectionHead(
  submissionId: string,
  approverName: string,
  remark: string
) {
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const { form } = await resolveIdentityCardActionContext(submissionId);
  if (form.currentStage !== 1) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  await rejectIdentityCardStage({
    submissionId,
    stageNumber: 1,
    approverName: approverName.trim(),
    approverRoleLabel: "HoD/Section Head",
    remark: remark.trim(),
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function approveIdentityCardByEstablishment(
  submissionId: string,
  approverName: string
) {
  const { form, user, activeRole, workflow, isSystemAdmin } =
    await resolveIdentityCardActionContext(submissionId);
  if (form.currentStage !== 2) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const finalizeStage = await shouldFinalizeIdentityCardStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/identity-card/${submissionId}`);
    revalidatePath("/dashboard/identity-card");
    return;
  }

  const workflowUserId = await resolveWorkflowUserIdForActor({
    email: user.email,
    fullName: user.fullName ?? null,
    role: activeRole,
  });

  await approveIdentityCardStage2({
    submissionId,
    approverName: approverName.trim(),
    approverWorkflowUserId: workflowUserId,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function rejectIdentityCardByEstablishment(
  submissionId: string,
  approverName: string,
  remark: string
) {
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const { form, user, activeRole } = await resolveIdentityCardActionContext(submissionId);
  if (form.currentStage !== 2) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const workflowUserId = await resolveWorkflowUserIdForActor({
    email: user.email,
    fullName: user.fullName ?? null,
    role: activeRole,
  });

  await rejectIdentityCardStage({
    submissionId,
    stageNumber: 2,
    approverName: approverName.trim(),
    approverRoleLabel: "Establishment",
    remark: remark.trim(),
    approverWorkflowUserId: workflowUserId,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function approveIdentityCardByRegistrarOrDean(
  submissionId: string,
  approverName: string
) {
  const { form, user, activeRole, workflow, isSystemAdmin } =
    await resolveIdentityCardActionContext(submissionId);
  if (form.currentStage !== 3) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const finalizeStage = await shouldFinalizeIdentityCardStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/identity-card/${submissionId}`);
    revalidatePath("/dashboard/identity-card");
    return;
  }

  const workflowUserId = await resolveWorkflowUserIdForActor({
    email: user.email,
    fullName: user.fullName ?? null,
    role: activeRole,
  });

  await approveIdentityCardStage3({
    submissionId,
    approverName: approverName.trim(),
    approverRoleLabel:
      activeRole === "DEAN_FAA"
        ? "Dean"
        : activeRole === "REGISTRAR"
          ? "Registrar"
          : "System Admin",
    approverWorkflowUserId: workflowUserId,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function rejectIdentityCardByRegistrarOrDean(
  submissionId: string,
  approverName: string,
  remark: string
) {
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const { form, user, activeRole } = await resolveIdentityCardActionContext(submissionId);
  if (form.currentStage !== 3) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const workflowUserId = await resolveWorkflowUserIdForActor({
    email: user.email,
    fullName: user.fullName ?? null,
    role: activeRole,
  });

  await rejectIdentityCardStage({
    submissionId,
    stageNumber: 3,
    approverName: approverName.trim(),
    approverRoleLabel:
      activeRole === "DEAN_FAA"
        ? "Dean"
        : activeRole === "REGISTRAR"
          ? "Registrar"
          : "System Admin",
    remark: remark.trim(),
    approverWorkflowUserId: workflowUserId,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function approveIdentityCardAtCurrentStage(
  submissionId: string,
  approverName: string
) {
  const { form, user, activeRole, workflow, isSystemAdmin } =
    await resolveIdentityCardActionContext(submissionId);

  if (!approverName.trim()) {
    throw new Error("Approver name is required.");
  }

  const finalizeStage = await shouldFinalizeIdentityCardStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/identity-card/${submissionId}`);
    revalidatePath("/dashboard/identity-card");
    return;
  }

  const nextStage = getNextStage(workflow, form.currentStage);
  const workflowUserId =
    form.currentStage >= 2
      ? await resolveWorkflowUserIdForActor({
          email: user.email,
          fullName: user.fullName ?? null,
          role: activeRole,
        })
      : undefined;

  await approveIdentityCardAtStage({
    submissionId,
    stageNumber: form.currentStage,
    nextStage: nextStage ?? form.currentStage,
    markApproved: nextStage === null,
    recommendationText: `${activeRole}: ${approverName.trim()} | Approved`,
    approverName: approverName.trim(),
    approverWorkflowUserId: workflowUserId,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function rejectIdentityCardAtCurrentStage(
  submissionId: string,
  approverName: string,
  remark: string
) {
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const { form, user, activeRole } = await resolveIdentityCardActionContext(submissionId);
  const workflowUserId =
    form.currentStage >= 2
      ? await resolveWorkflowUserIdForActor({
          email: user.email,
          fullName: user.fullName ?? null,
          role: activeRole,
        })
      : undefined;

  await rejectIdentityCardAtStage({
    submissionId,
    stageNumber: form.currentStage,
    recommendationText: `Rejected by ${activeRole}: ${approverName.trim()} | ${remark.trim()}`,
    approverWorkflowUserId: workflowUserId,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath(`/dashboard/identity-card/${submissionId}`);
  revalidatePath("/dashboard/identity-card");
  revalidatePath(`/forms/identity-card/${submissionId}`);
}

export async function bulkReviewIdentityCardForms(input: {
  submissionIds: string[];
  decision: "approve" | "reject";
  approverName: string;
  remark: string;
  stage: number;
}) {
  const { user, activeRole, isSystemAdmin, workflow } = await assertIdentityCardBulkStageAccess(input.stage);

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

  const workflowUserId =
    input.stage === 2 || input.stage === 3
      ? await resolveWorkflowUserIdForActor({
          email: user.email,
          fullName: user.fullName ?? null,
          role: activeRole,
        })
      : undefined;

  for (const submissionId of ids) {
    const form = await getIdentityCardFormById(submissionId);
    if (!form || form.currentStage !== input.stage) {
      continue;
    }
    if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
      continue;
    }

    if (activeRole === "HOD" && form.departmentSnapshot) {
      const hasAccess = await checkHodDepartmentAccess(user.email, form.departmentSnapshot);
      if (!hasAccess) continue;
    }

    if (input.stage === 1) {
      if (input.decision === "approve") {
        const finalizeStage = await shouldFinalizeIdentityCardStageApproval({
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

        await approveIdentityCardStage1({
          submissionId,
          approverName: input.approverName,
          approverRoleLabel: activeRole === "SECTION_HEAD" ? "Section Head" : "HoD",
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      } else {
        await rejectIdentityCardStage({
          submissionId,
          stageNumber: 1,
          approverName: input.approverName,
          approverRoleLabel: "HoD/Section Head",
          remark: input.remark,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      }
    }

    if (input.stage === 2) {
      if (input.decision === "approve") {
        const finalizeStage = await shouldFinalizeIdentityCardStageApproval({
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

        await approveIdentityCardStage2({
          submissionId,
          approverName: input.approverName,
          approverWorkflowUserId: workflowUserId!,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      } else {
        await rejectIdentityCardStage({
          submissionId,
          stageNumber: 2,
          approverName: input.approverName,
          approverRoleLabel: "Establishment",
          remark: input.remark,
          approverWorkflowUserId: workflowUserId,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      }
    }

    if (input.stage === 3) {
      if (input.decision === "approve") {
        const finalizeStage = await shouldFinalizeIdentityCardStageApproval({
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

        await approveIdentityCardStage3({
          submissionId,
          approverName: input.approverName,
          approverRoleLabel:
            activeRole === "DEAN_FAA"
              ? "Dean"
              : activeRole === "REGISTRAR"
                ? "Registrar"
                : "System Admin",
          approverWorkflowUserId: workflowUserId!,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      } else {
        await rejectIdentityCardStage({
          submissionId,
          stageNumber: 3,
          approverName: input.approverName,
          approverRoleLabel:
            activeRole === "DEAN_FAA"
              ? "Dean"
              : activeRole === "REGISTRAR"
                ? "Registrar"
                : "System Admin",
          remark: input.remark,
          approverWorkflowUserId: workflowUserId,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      }
    }

    if (input.stage > 3) {
      const nextStage = getNextStage(workflow, form.currentStage);
      if (input.decision === "approve") {
        const finalizeStage = await shouldFinalizeIdentityCardStageApproval({
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

        await approveIdentityCardAtStage({
          submissionId,
          stageNumber: form.currentStage,
          nextStage: nextStage ?? form.currentStage,
          markApproved: nextStage === null,
          recommendationText: `${activeRole}: ${input.approverName} | ${input.remark}`,
          approverName: input.approverName,
          approverWorkflowUserId: workflowUserId,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      } else {
        await rejectIdentityCardAtStage({
          submissionId,
          stageNumber: form.currentStage,
          recommendationText: `Rejected by ${activeRole}: ${input.approverName} | ${input.remark}`,
          approverWorkflowUserId: workflowUserId,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      }
    }
  }

  revalidatePath("/dashboard/identity-card");
}
