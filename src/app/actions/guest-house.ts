"use server";

import { canAccessApplicantForm, getQueueRoleForUser, requireUser } from "@/lib/auth";
import {
  approveGuestHouseAtStage,
  approveGuestHouseStage1,
  approveGuestHouseStage2,
  approveGuestHouseStage3,
  createGuestHouseForm,
  getGuestHouseFormById,
  rejectGuestHouseAtStage,
  rejectGuestHouseStage1,
  rejectGuestHouseStage2,
  rejectGuestHouseStage3,
} from "@/lib/guest-house-store";
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

async function getGuestHouseWorkflowOrThrow() {
  const workflow = await getWorkflow("guest-house");
  if (!workflow) {
    throw new Error("Guest House workflow blueprint not found in database.");
  }
  return workflow;
}

async function resolveGuestHouseRoleContext() {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "guest-house",
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

async function resolveGuestHouseActionContext(submissionId: string) {
  const roleContext = await resolveGuestHouseRoleContext();
  const workflow = await getGuestHouseWorkflowOrThrow();
  const form = await getGuestHouseFormById(submissionId);

  if (!form) {
    throw new Error("Guest house form not found.");
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
    let hasAccess = false;
    for (const proposer of form.proposers) {
      if (proposer.department) {
        const canAccess = await checkHodDepartmentAccess(roleContext.user.email, proposer.department);
        if (canAccess) {
          hasAccess = true;
          break;
        }
      }
    }
    if (!hasAccess && form.proposers.length > 0) {
      throw new Error("You are not authorized to approve requests for this department.");
    }
  }

  return {
    ...roleContext,
    workflow,
    form,
  };
}

async function assertGuestHouseBulkStageAccess(stage: number) {
  const roleContext = await resolveGuestHouseRoleContext();
  const workflow = await getGuestHouseWorkflowOrThrow();

  if (!roleContext.isSystemAdmin) {
    const roleStages = getStagesForRole(workflow, roleContext.activeRole);
    if (!roleStages.includes(stage)) {
      throw new Error("You are not authorized to review this stage in bulk.");
    }
  }

  return { ...roleContext, workflow };
}

async function shouldFinalizeGuestHouseStageApproval(input: {
  submissionId: string;
  stageNumber: number;
  activeRole: string;
  isSystemAdmin: boolean;
  workflow: Awaited<ReturnType<typeof getGuestHouseWorkflowOrThrow>>;
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

export async function submitGuestHouseForm(formData: FormData) {
  const FIXED_ARRIVAL_TIME = "13:00";
  const FIXED_DEPARTURE_TIME = "11:00";
  const now = new Date();
  const bookingDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const user = await requireUser();
  if (!canAccessApplicantForm(user.email, user.role, "guest-house")) {
    throw new Error("You are not allowed to submit Guest House form.");
  }

  const guestName = String(formData.get("guestName") ?? "").trim();
  const guestGender = String(formData.get("guestGender") ?? "").trim();
  const guestAddress = String(formData.get("guestAddress") ?? "").trim();
  const contactNumber = String(formData.get("contactNumber") ?? "").trim();
  const purposeOfBooking = String(formData.get("purposeOfBooking") ?? "").trim();
  const numberOfGuests = String(formData.get("numberOfGuests") ?? "").trim();
  const numberOfRoomsRequired = String(formData.get("numberOfRoomsRequired") ?? "").trim();
  const occupancyType = String(formData.get("occupancyType") ?? "").trim();
  const arrivalDateRaw = String(formData.get("arrivalDate") ?? "").trim();
  const departureDateRaw = String(formData.get("departureDate") ?? "").trim();
  const roomType = String(formData.get("roomType") ?? "").trim();
  const bookingCategory = String(formData.get("bookingCategory") ?? "").trim();
  const remarksIfAny = String(formData.get("remarksIfAny") ?? "").trim();
  const budgetDepartment = String(formData.get("budgetDepartment") ?? "").trim();
  const proposerName = String(formData.get("proposerName") ?? "").trim();
  const proposerDesignation = String(formData.get("proposerDesignation") ?? "").trim();
  const proposerDepartment = String(formData.get("proposerDepartment") ?? "").trim();
  const proposerEmployeeCode = String(formData.get("proposerEmployeeCode") ?? "").trim();
  const proposerEntryNumber = String(formData.get("proposerEntryNumber") ?? "").trim();
  const proposerMobile = String(formData.get("proposerMobile") ?? "").trim();
  const isInstituteGuestRaw = String(formData.get("isInstituteGuest") ?? "").trim().toLowerCase();
  const guestToBeCharged = formData.get("guestToBeCharged") === "on";
  const boardingLodgingByGuestRaw = String(formData.get("boardingLodgingByGuest") ?? "").trim().toLowerCase();
  const undertakingAccepted = formData.get("undertakingAccepted") === "on";

  const categoryAmountMap: Record<string, Record<string, number>> = {
    executive_suite: {
      cat_a: 0,
      cat_b: 3500,
    },
    business_room: {
      cat_a: 0,
      b_1: 2000,
      b_2: 1200,
    },
  };

  if (
    !guestName ||
    !guestGender ||
    !guestAddress ||
    !contactNumber ||
    !purposeOfBooking ||
    !numberOfGuests ||
    !numberOfRoomsRequired ||
    !occupancyType ||
    !arrivalDateRaw ||
    !departureDateRaw ||
    !roomType ||
    !bookingCategory ||
    !proposerName ||
    !proposerDesignation ||
    !proposerDepartment ||
    !proposerMobile ||
    !isInstituteGuestRaw ||
    !boardingLodgingByGuestRaw
  ) {
    throw new Error("Please fill all required guest house form fields.");
  }

  const roomTypeKey = roomType === "business_room" ? "business_room" : "executive_suite";
  const validCategoryMap = categoryAmountMap[roomTypeKey];
  const expectedAmount = validCategoryMap[bookingCategory];
  if (expectedAmount === undefined) {
    throw new Error("Selected booking category is invalid for the chosen room type.");
  }
  const parsedTariffAmount = expectedAmount;

  const guestNotToBeCharged = !guestToBeCharged;
  if (guestNotToBeCharged && !budgetDepartment) {
    throw new Error("Project no / Budget Head is required when guest is not to be charged.");
  }
  if (!undertakingAccepted) {
    throw new Error("Please accept the undertaking to submit this form.");
  }

  const isInstituteGuest = isInstituteGuestRaw === "yes";

  const createdId = await createGuestHouseForm({
    submitter: {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    guestName,
    guestGender,
    guestAddress,
    contactNumber,
    numberOfGuests: Number(numberOfGuests),
    numberOfRoomsRequired: Number(numberOfRoomsRequired),
    occupancyType: occupancyType === "double" ? "double" : "single",
    arrivalDate: arrivalDateRaw,
    arrivalTime: FIXED_ARRIVAL_TIME,
    departureDate: departureDateRaw,
    departureTime: FIXED_DEPARTURE_TIME,
    purposeOfBooking,
    roomType: roomType === "business_room" ? "business_room" : "executive_suite",
    bookExecutiveSuite: roomType === "executive_suite",
    bookBusinessRoom: roomType === "business_room",
    bookingCategory,
    categoryTariffAmount: String(parsedTariffAmount),
    remarksIfAny,
    boardingLodgingByGuest: boardingLodgingByGuestRaw === "yes",
    isInstituteGuest,
    guestNotToBeCharged,
    budgetDepartment: budgetDepartment || null,
    bookingDate,
    proposer: {
      nameOfProposer: proposerName,
      designation: proposerDesignation,
      department: proposerDepartment,
      employeeCode: proposerEmployeeCode,
      entryNumber: proposerEntryNumber,
      mobileNumber: proposerMobile,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard/guest-house");
  redirect(`/forms/guest-house/${createdId}`);
}

export async function approveGuestHouseByApprovingAuthority(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveGuestHouseActionContext(submissionId);

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and remark are required.");
  }

  if (form.currentStage !== 1) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const finalizeStage = await shouldFinalizeGuestHouseStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath("/dashboard/guest-house");
    revalidatePath(`/dashboard/guest-house/${submissionId}`);
    return;
  }

  await approveGuestHouseStage1({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath("/dashboard/guest-house");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function rejectGuestHouseByApprovingAuthority(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form } = await resolveGuestHouseActionContext(submissionId);

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and rejection remark are required.");
  }

  if (form.currentStage !== 1) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  await rejectGuestHouseStage1({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath("/dashboard/guest-house");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function approveGuestHouseByIncharge(input: {
  submissionId: string;
  approverName: string;
  roomNoConfirmed: string;
  entryDate: string;
  checkInDateTime: string;
  checkOutDateTime: string;
  officeRemarks: string;
}) {
  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveGuestHouseActionContext(input.submissionId);

  if (
    !input.approverName.trim() ||
    !input.roomNoConfirmed.trim() ||
    !input.entryDate.trim() ||
    !input.checkInDateTime.trim() ||
    !input.checkOutDateTime.trim() ||
    !input.officeRemarks.trim()
  ) {
    throw new Error("All Stage 2 fields are required.");
  }

  if (form.currentStage !== 2) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const finalizeStage = await shouldFinalizeGuestHouseStageApproval({
    submissionId: input.submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath("/dashboard/guest-house");
    revalidatePath(`/dashboard/guest-house/${input.submissionId}`);
    return;
  }

  await approveGuestHouseStage2({
    submissionId: input.submissionId,
    approverName: input.approverName.trim(),
    roomNoConfirmed: input.roomNoConfirmed.trim(),
    entryDate: input.entryDate.trim(),
    checkInDateTime: input.checkInDateTime.trim(),
    checkOutDateTime: input.checkOutDateTime.trim(),
    officeRemarks: input.officeRemarks.trim(),
  });
  await clearStageRoleApprovals(input.submissionId, form.currentStage);

  revalidatePath("/dashboard/guest-house");
  revalidatePath(`/dashboard/guest-house/${input.submissionId}`);
  revalidatePath(`/forms/guest-house/${input.submissionId}`);
}

export async function rejectGuestHouseByIncharge(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form } = await resolveGuestHouseActionContext(submissionId);

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and rejection remark are required.");
  }

  if (form.currentStage !== 2) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  await rejectGuestHouseStage2({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath("/dashboard/guest-house");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function approveGuestHouseByChairman(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveGuestHouseActionContext(submissionId);

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and remark are required.");
  }

  if (form.currentStage !== 3) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  const finalizeStage = await shouldFinalizeGuestHouseStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath("/dashboard/guest-house");
    revalidatePath(`/dashboard/guest-house/${submissionId}`);
    return;
  }

  await approveGuestHouseStage3({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath("/dashboard/guest-house");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function rejectGuestHouseByChairman(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form } = await resolveGuestHouseActionContext(submissionId);

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and rejection remark are required.");
  }

  if (form.currentStage !== 3) {
    throw new Error("This request is not in the expected stage for this action.");
  }

  await rejectGuestHouseStage3({
    submissionId,
    approverName: approverName.trim(),
    remark: remark.trim(),
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath("/dashboard/guest-house");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function approveGuestHouseAtCurrentStage(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form, workflow, activeRole, isSystemAdmin, user } =
    await resolveGuestHouseActionContext(submissionId);

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and remark are required.");
  }

  const finalizeStage = await shouldFinalizeGuestHouseStageApproval({
    submissionId,
    stageNumber: form.currentStage,
    activeRole,
    isSystemAdmin,
    workflow,
    user,
  });
  if (!finalizeStage) {
    revalidatePath("/dashboard/guest-house");
    revalidatePath(`/dashboard/guest-house/${submissionId}`);
    return;
  }

  const nextStage = getNextStage(workflow, form.currentStage);
  await approveGuestHouseAtStage({
    submissionId,
    stageNumber: form.currentStage,
    nextStage: nextStage ?? form.currentStage,
    markApproved: nextStage === null,
    recommendationText: `${activeRole}: ${approverName.trim()} | ${remark.trim()}`,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath("/dashboard/guest-house");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function rejectGuestHouseAtCurrentStage(
  submissionId: string,
  approverName: string,
  remark: string
) {
  const { form, activeRole } = await resolveGuestHouseActionContext(submissionId);

  if (!approverName.trim() || !remark.trim()) {
    throw new Error("Approver name and rejection remark are required.");
  }

  await rejectGuestHouseAtStage({
    submissionId,
    stageNumber: form.currentStage,
    recommendationText: `Rejected by ${activeRole}: ${approverName.trim()} | ${remark.trim()}`,
  });
  await clearStageRoleApprovals(submissionId, form.currentStage);

  revalidatePath("/dashboard/guest-house");
  revalidatePath(`/dashboard/guest-house/${submissionId}`);
  revalidatePath(`/forms/guest-house/${submissionId}`);
}

export async function bulkReviewGuestHouseForms(input: {
  submissionIds: string[];
  decision: "approve" | "reject";
  approverName: string;
  remark: string;
  stage: number;
}) {
  if (!input.submissionIds.length) {
    throw new Error("No forms selected for bulk review.");
  }

  if (!input.approverName.trim() || !input.remark.trim()) {
    throw new Error("Approver name and remark are required.");
  }

  const { user, activeRole, isSystemAdmin, workflow } = await assertGuestHouseBulkStageAccess(input.stage);

  for (const submissionId of input.submissionIds) {
    const form = await getGuestHouseFormById(submissionId);
    if (!form || form.currentStage !== input.stage) {
      continue;
    }
    if (form.overallStatus === "approved" || form.overallStatus === "rejected") {
      continue;
    }

    if (activeRole === "HOD") {
      let hasAccess = false;
      for (const proposer of form.proposers) {
        if (proposer.department) {
          const canAccess = await checkHodDepartmentAccess(user.email, proposer.department);
          if (canAccess) {
            hasAccess = true;
            break;
          }
        }
      }
      if (!hasAccess && form.proposers.length > 0) continue;
    }

    if (input.stage === 1) {
      if (input.decision === "approve") {
        const finalizeStage = await shouldFinalizeGuestHouseStageApproval({
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

        await approveGuestHouseStage1({
          submissionId,
          approverName: input.approverName,
          remark: input.remark,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      } else {
        await rejectGuestHouseStage1({
          submissionId,
          approverName: input.approverName,
          remark: input.remark,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      }
      continue;
    }

    if (input.stage === 2) {
      if (input.decision === "approve") {
        const finalizeStage = await shouldFinalizeGuestHouseStageApproval({
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

        await approveGuestHouseStage2({
          submissionId,
          approverName: input.approverName,
          roomNoConfirmed: "To be allotted",
          entryDate: new Date().toISOString().slice(0, 10),
          checkInDateTime: new Date().toISOString(),
          checkOutDateTime: new Date().toISOString(),
          officeRemarks: input.remark,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      } else {
        await rejectGuestHouseStage2({
          submissionId,
          approverName: input.approverName,
          remark: input.remark,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      }
      continue;
    }

    if (input.stage === 3) {
      if (input.decision === "approve") {
        const finalizeStage = await shouldFinalizeGuestHouseStageApproval({
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

        await approveGuestHouseStage3({
          submissionId,
          approverName: input.approverName,
          remark: input.remark,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      } else {
        await rejectGuestHouseStage3({
          submissionId,
          approverName: input.approverName,
          remark: input.remark,
        });
        await clearStageRoleApprovals(submissionId, form.currentStage);
      }
      continue;
    }

    if (input.decision === "approve") {
      const finalizeStage = await shouldFinalizeGuestHouseStageApproval({
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

      const nextStage = getNextStage(workflow, form.currentStage);
      await approveGuestHouseAtStage({
        submissionId,
        stageNumber: form.currentStage,
        nextStage: nextStage ?? form.currentStage,
        markApproved: nextStage === null,
        recommendationText: `${activeRole}: ${input.approverName} | ${input.remark}`,
      });
      await clearStageRoleApprovals(submissionId, form.currentStage);
    } else {
      await rejectGuestHouseAtStage({
        submissionId,
        stageNumber: form.currentStage,
        recommendationText: `Rejected by ${activeRole}: ${input.approverName} | ${input.remark}`,
      });
      await clearStageRoleApprovals(submissionId, form.currentStage);
    }
  }

  revalidatePath("/dashboard/guest-house");
}
