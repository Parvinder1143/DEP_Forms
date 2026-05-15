"use server";

import { getQueueRoleForUser, requireRole, requireUser } from "@/lib/auth";
import {
  addForwardingApproval,
  addIssueApproval,
  createEmailIdForm,
  getEmailIdFormById,
  hasIssuedEmailForUser,
  rejectEmailIdForm,
} from "@/lib/email-id-store";
import {
  getCurrentEmailWorkflowStage,
  getStageDefinitionByNumber,
  roleCanApproveStage,
  stageRequiresIssuanceFields,
} from "@/lib/email-id-workflow";
import {
  addRoleApprovalForStage,
  clearStageRoleApprovals,
  listApprovedRolesForStage,
} from "@/lib/workflow-stage-approvals";
import { getWorkflowStageMode, getWorkflowStageRoleCodes } from "@/lib/workflow-engine";
import { getWorkflow } from "@/lib/workflow-engine";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkHodDepartmentAccess } from "@/lib/department-store";

// Mirrors the Prisma enum – safe to use before client generation
export type ForwardingSection =
  | "ACADEMICS"
  | "ESTABLISHMENT"
  | "RESEARCH_AND_DEVELOPMENT";

async function getEmailWorkflowOrThrow() {
  const workflow = await getWorkflow("email-id");
  if (!workflow) {
    throw new Error("Email workflow is not configured.");
  }
  return workflow;
}

async function resolveActionableStageForUser(formId: string) {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "email-id",
  });
  const activeRole = queueRole.activeRole;

  if (!activeRole) {
    throw new Error("You do not have an assigned stakeholder role.");
  }

  const form = await getEmailIdFormById(formId);
  if (!form) {
    throw new Error("Form not found.");
  }

  const workflow = await getEmailWorkflowOrThrow();
  const stageNumber = getCurrentEmailWorkflowStage(form, workflow);
  if (stageNumber === null) {
    throw new Error("Form is already completed.");
  }

  const stage = getStageDefinitionByNumber(workflow, stageNumber);
  if (!stage) {
    throw new Error(`Stage ${stageNumber} is not defined in workflow.`);
  }

  const isSystemAdmin = activeRole === "SYSTEM_ADMIN";
  if (!isSystemAdmin && !roleCanApproveStage(stage, activeRole)) {
    throw new Error("You are not authorized for the current stage.");
  }

  if (activeRole === "HOD") {
    const hasAccess = await checkHodDepartmentAccess(user.email, form.department);
    if (!hasAccess) {
      throw new Error("You are not authorized to approve requests for this department.");
    }
  }

  return { user, activeRole, form, workflow, stageNumber, stage, isSystemAdmin };
}

async function shouldFinalizeEmailStageApproval(input: {
  formId: string;
  stageNumber: number;
  stage: NonNullable<Awaited<ReturnType<typeof resolveActionableStageForUser>>["stage"]>;
  activeRole: string;
  isSystemAdmin: boolean;
  user: { id: string; email: string; fullName?: string | null };
}) {
  if (input.isSystemAdmin) {
    return true;
  }

  const mode = getWorkflowStageMode(input.stage);
  const requiredRoles = getWorkflowStageRoleCodes(input.stage).filter((role) => role !== "SYSTEM_ADMIN");
  if (mode !== "AND" || requiredRoles.length <= 1) {
    return true;
  }

  const insertResult = await addRoleApprovalForStage({
    submissionId: input.formId,
    stageNumber: input.stageNumber,
    roleCode: input.activeRole,
    approverUserId: input.user.id,
    approverEmail: input.user.email,
    approverName: input.user.fullName ?? null,
  });

  if (!insertResult.inserted) {
    throw new Error("This role has already approved this stage. Waiting for remaining approvals.");
  }

  const approvedRoles = new Set(await listApprovedRolesForStage(input.formId, input.stageNumber));
  return requiredRoles.every((roleCode) => approvedRoles.has(roleCode));
}

function requiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

// ─── Submit (anyone) ─────────────────────────────────────────────────────────

export async function submitEmailIdForm(formData: FormData) {
  const user = await requireRole(["STUDENT", "INTERN", "EMPLOYEE"]);

  const alreadyIssued = await hasIssuedEmailForUser(user.id);
  if (alreadyIssued) {
    throw new Error(
      "An Email ID has already been issued for your account. You cannot submit this form again."
    );
  }

  const natureOfEngagement = requiredString(
    formData,
    "natureOfEngagement",
    "Nature of engagement"
  );
  const isTemp =
    natureOfEngagement.toLowerCase().includes("temp") ||
    natureOfEngagement.toLowerCase().includes("project");

  const joiningRaw = String(formData.get("joiningDate") ?? "").trim();
  const endRaw = String(formData.get("anticipatedEndDate") ?? "").trim();
  const projectName = String(formData.get("projectName") ?? "").trim();
  const reportingOfficerName = String(formData.get("reportingOfficerName") ?? "").trim();
  const reportingOfficerEmail = String(formData.get("reportingOfficerEmail") ?? "").trim();
  const department = requiredString(formData, "department", "Department / Section");
  const departmentOther = String(formData.get("departmentOther") ?? "").trim();

  const resolvedDepartment = department === "Other" ? departmentOther : department;

  if (!resolvedDepartment) {
    throw new Error("Other Department / Section is required when Department / Section is Other.");
  }

  if (isTemp) {
    if (!projectName || !joiningRaw || !endRaw || !reportingOfficerName || !reportingOfficerEmail) {
      throw new Error("All Temp / Project Staff details are required.");
    }
  }

  const consentAccepted = formData.get("consentAccepted") === "on";
  if (!consentAccepted) {
    throw new Error("Consent acceptance is required.");
  }

  const form = await createEmailIdForm({
    submittedById: user.id,
    submittedByEmail: user.email,
    initials: requiredString(formData, "initials", "Initials"),
    firstName: requiredString(formData, "firstName", "First name"),
    lastName: requiredString(formData, "lastName", "Last name"),
    gender: requiredString(formData, "gender", "Gender"),
    permanentAddress: requiredString(formData, "permanentAddress", "Permanent address"),
    orgId: requiredString(formData, "orgId", "Organisation / Roll ID"),
    natureOfEngagement,
    role: requiredString(formData, "role", "Role"),
    department: resolvedDepartment,
    projectName: isTemp ? projectName : null,
    joiningDate: isTemp && joiningRaw ? new Date(joiningRaw) : null,
    anticipatedEndDate: isTemp && endRaw ? new Date(endRaw) : null,
    reportingOfficerName: isTemp
      ? reportingOfficerName
      : null,
    reportingOfficerEmail: isTemp
      ? reportingOfficerEmail
      : null,
    mobileNo: requiredString(formData, "mobileNo", "Mobile number"),
    alternateEmail: requiredString(formData, "alternateEmail", "Alternate email"),
    consentAccepted,
  });

  redirect(`/forms/email-id/${form.id}`);
}

// ─── Stage 1: Forwarding Authority ───────────────────────────────────────────

export async function forwardEmailIdForm(
  formId: string,
  section: ForwardingSection,
  approverName: string
) {
  const { stageNumber, workflow, stage, activeRole, isSystemAdmin, user } =
    await resolveActionableStageForUser(formId);

  if (stageRequiresIssuanceFields(workflow, stageNumber)) {
    throw new Error("This is the final stage. Use the issue action for completion.");
  }

  const finalizeStage = await shouldFinalizeEmailStageApproval({
    formId,
    stageNumber,
    stage,
    activeRole,
    isSystemAdmin,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/email-id/${formId}`);
    revalidatePath("/dashboard/email-id");
    return;
  }

  await addForwardingApproval({ formId, stage: stageNumber, section, approverName });
  await clearStageRoleApprovals(formId, stageNumber);

  revalidatePath(`/dashboard/email-id/${formId}`);
  revalidatePath("/dashboard/email-id");
  revalidatePath(`/forms/email-id/${formId}`);
}

// ─── Stage 2: IT Admin issues the email ID ────────────────────────────────────

export async function issueEmailId(
  formId: string,
  assignedEmailId: string,
  dateOfCreation: string,
  tentativeRemovalDate: string | null,
  idCreatedBy: string
) {
  const { stageNumber, workflow, stage, activeRole, isSystemAdmin, user } =
    await resolveActionableStageForUser(formId);

  if (!stageRequiresIssuanceFields(workflow, stageNumber)) {
    throw new Error("This request has not reached the final issuance stage yet.");
  }

  const finalizeStage = await shouldFinalizeEmailStageApproval({
    formId,
    stageNumber,
    stage,
    activeRole,
    isSystemAdmin,
    user,
  });
  if (!finalizeStage) {
    revalidatePath(`/dashboard/email-id/${formId}`);
    revalidatePath("/dashboard/email-id");
    return;
  }

  await addIssueApproval({
    formId,
    stage: stageNumber,
    assignedEmailId,
    dateOfCreation,
    tentativeRemovalDate,
    idCreatedBy,
  });
  await clearStageRoleApprovals(formId, stageNumber);

  revalidatePath(`/dashboard/email-id/${formId}`);
  revalidatePath(`/forms/email-id/${formId}`);
}

export async function rejectEmailIdByForwardingAuthority(
  formId: string,
  section: ForwardingSection,
  approverName: string,
  remark: string
) {
  if (!remark.trim()) {
    throw new Error("Rejection remark is required.");
  }

  const { stageNumber } = await resolveActionableStageForUser(formId);

  await rejectEmailIdForm({
    formId,
    stage: stageNumber,
    section,
    approverName,
    remark: remark.trim(),
  });
  await clearStageRoleApprovals(formId, stageNumber);

  revalidatePath(`/dashboard/email-id/${formId}`);
  revalidatePath("/dashboard/email-id");
  revalidatePath(`/forms/email-id/${formId}`);
}

export async function bulkReviewEmailIdForms(input: {
  formIds: string[];
  section: ForwardingSection;
  approverName: string;
  remark: string;
  decision: "approve" | "reject";
}) {
  await requireUser();

  const ids = input.formIds.filter(Boolean);
  if (ids.length === 0) {
    throw new Error("Please select at least one request.");
  }
  if (!input.approverName.trim()) {
    throw new Error("Approver name is required.");
  }
  if (!input.remark.trim()) {
    throw new Error("Bulk remark is required.");
  }

  for (const formId of ids) {
    let stageNumber: number;
    let workflow;
    let stage;
    let activeRole;
    let isSystemAdmin;
    let user;
    try {
      const resolved = await resolveActionableStageForUser(formId);
      stageNumber = resolved.stageNumber;
      workflow = resolved.workflow;
      stage = resolved.stage;
      activeRole = resolved.activeRole;
      isSystemAdmin = resolved.isSystemAdmin;
      user = resolved.user;
    } catch {
      continue;
    }

    if (stageRequiresIssuanceFields(workflow, stageNumber)) {
      continue;
    }

    if (input.decision === "approve") {
      const finalizeStage = await shouldFinalizeEmailStageApproval({
        formId,
        stageNumber,
        stage,
        activeRole,
        isSystemAdmin,
        user,
      });
      if (!finalizeStage) {
        continue;
      }

      await addForwardingApproval({
        formId,
        stage: stageNumber,
        section: input.section,
        approverName: `${input.approverName} | ${input.remark.trim()}`,
      });
      await clearStageRoleApprovals(formId, stageNumber);
    } else {
      await rejectEmailIdForm({
        formId,
        stage: stageNumber,
        section: input.section,
        approverName: input.approverName,
        remark: input.remark,
      });
      await clearStageRoleApprovals(formId, stageNumber);
    }
  }

  revalidatePath("/dashboard/email-id");
}

export async function bulkIssueEmailIds(input: {
  formIds: string[];
  approverName: string;
  dateOfCreation?: string;
  tentativeRemovalDate?: string | null;
}) {
  await requireUser();

  const ids = input.formIds.filter(Boolean);
  if (ids.length === 0) {
    throw new Error("Please select at least one request.");
  }
  if (!input.approverName.trim()) {
    throw new Error("IT Admin name is required.");
  }

  const sharedDateOfCreation = input.dateOfCreation?.trim() || new Date().toISOString().split("T")[0];
  const sharedTentativeRemovalDate = input.tentativeRemovalDate?.trim() || null;

  for (const formId of ids) {
    const form = await getEmailIdFormById(formId);
    if (!form) {
      continue;
    }

    let stageNumber: number;
    let workflow;
    let stage;
    let activeRole;
    let isSystemAdmin;
    let user;
    try {
      const resolved = await resolveActionableStageForUser(formId);
      stageNumber = resolved.stageNumber;
      workflow = resolved.workflow;
      stage = resolved.stage;
      activeRole = resolved.activeRole;
      isSystemAdmin = resolved.isSystemAdmin;
      user = resolved.user;
    } catch {
      continue;
    }

    if (!stageRequiresIssuanceFields(workflow, stageNumber)) {
      continue;
    }

    const finalizeStage = await shouldFinalizeEmailStageApproval({
      formId,
      stageNumber,
      stage,
      activeRole,
      isSystemAdmin,
      user,
    });
    if (!finalizeStage) {
      continue;
    }

    // Auto-generate the email from first and last name: firstname.lastname@iitrpr.ac.in
    const first = form.firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const last = form.lastName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const assignedEmailId = `${first}.${last}@iitrpr.ac.in`;

    await addIssueApproval({
      formId,
      stage: stageNumber,
      assignedEmailId,
      dateOfCreation: sharedDateOfCreation,
      tentativeRemovalDate: sharedTentativeRemovalDate,
      idCreatedBy: input.approverName,
    });
    await clearStageRoleApprovals(formId, stageNumber);
  }

  revalidatePath("/dashboard/email-id");
}
