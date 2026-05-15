import {
  getDashboardPathForUser,
  getQueueRoleForUser,
  getRoleDisplayContext,
  requireUser,
} from "@/lib/auth";
import {
  listVehicleStickerCompletedForms,
  listVehicleStickerOngoingForms,
} from "@/lib/vehicle-sticker-store";
import {
  getWorkflow,
  getStagesForRole,
  getWorkflowStageMode,
  getWorkflowStageRoleCodes,
} from "@/lib/workflow-engine";
import { bulkReviewVehicleStickerForms } from "@/app/actions/vehicle-sticker";
import {
  getVehicleStickerStatusBadgeClass,
  getVehicleStickerStatusText,
} from "@/lib/vehicle-sticker-status";
import { listRoleStageApprovalsForSubmissions } from "@/lib/workflow-stage-approvals";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";
import { StakeholderDashboardScaffold } from "@/components/stakeholder/dashboard-scaffold";
import { QueueToggleClient } from "@/components/stakeholder/queue-toggle-client";
import { redirect } from "next/navigation";
import { listDepartments } from "@/lib/department-store";

export default async function GenericVehicleStickerDashboardPage() {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "vehicle-sticker",
  });
  const activeRole = queueRole.activeRole;

  if (!activeRole) {
    redirect("/pending-role");
  }

  const roleDisplay = getRoleDisplayContext({
    role: activeRole,
    baseRole: user.role,
    isTemporarilyAssigned: queueRole.isTemporarilyAssigned,
  });

  const workflow = await getWorkflow("vehicle-sticker");
  if (!workflow) {
    throw new Error("Vehicle Sticker workflow blueprint not found in database.");
  }

  const validStages = getStagesForRole(workflow, activeRole);
  const isSystemAdmin = activeRole === "SYSTEM_ADMIN";

  if (validStages.length === 0 && !isSystemAdmin) {
    const fallbackPath = await getDashboardPathForUser(user.id, user.role);
    if (fallbackPath !== "/dashboard/vehicle-sticker") {
      redirect(fallbackPath);
    }
    redirect("/");
  }

  let filterDept: string[] | null = null;
  if (activeRole === "HOD") {
    const departments = await listDepartments();
    filterDept = departments.filter((d) => d.hodEmail === user.email).map((d) => d.name);
  }

  const allInProgressForms = await listVehicleStickerOngoingForms(filterDept);
  const completedForms = await listVehicleStickerCompletedForms(filterDept);
  const activeStageTarget = validStages[0] || 1;
  const finalStageNumber = workflow.stages
    .map((stage) => stage.stage)
    .sort((a, b) => b - a)[0];
  const activeRoleCode = String(activeRole).toUpperCase();
  const aliasRoleCode =
    activeRoleCode === "HOD"
      ? "SECTION_HEAD"
      : activeRoleCode === "SECTION_HEAD"
        ? "HOD"
        : null;

  const roleCanActAtStage = (stageNumber: number) => {
    const stageDef = workflow.stages.find((stage) => stage.stage === stageNumber);
    if (!stageDef) {
      return false;
    }

    const stageRoles = getWorkflowStageRoleCodes(stageDef);
    if (stageRoles.includes(activeRoleCode)) {
      return true;
    }

    return aliasRoleCode ? stageRoles.includes(aliasRoleCode) : false;
  };

  const roleStageApprovals = await listRoleStageApprovalsForSubmissions(
    activeRoleCode,
    allInProgressForms.map((form) => form.submissionId)
  );

  const pendingForms = allInProgressForms.filter((form) => {
    const currentStageIsActionable = roleCanActAtStage(form.currentStage);
    if (!currentStageIsActionable) {
      return false;
    }

    const stageDef = workflow.stages.find((stage) => stage.stage === form.currentStage);
    const stageMode = stageDef ? getWorkflowStageMode(stageDef) : "OR";
    if (stageMode !== "AND") {
      return true;
    }

    return !Boolean(roleStageApprovals.get(form.submissionId)?.has(form.currentStage));
  });

  const ongoingForms = allInProgressForms.filter((form) => {
    const currentStageIsActionable = roleCanActAtStage(form.currentStage);
    const stageDef = workflow.stages.find((stage) => stage.stage === form.currentStage);
    const stageMode = stageDef ? getWorkflowStageMode(stageDef) : "OR";
    const alreadyApprovedCurrentStage = Boolean(
      roleStageApprovals.get(form.submissionId)?.has(form.currentStage)
    );

    if (currentStageIsActionable) {
      return stageMode === "AND" && alreadyApprovedCurrentStage;
    }

    return form.approvals.some(
      (approval) => roleCanActAtStage(approval.stageNumber) && approval.decision !== "pending"
    );
  });

  const currentStagePendingCount = pendingForms.length;

  async function handleBulkReview(input: {
    ids: string[];
    decision: "approve" | "reject";
    approverName: string;
    remark: string;
    validUpto?: string;
    issuedStickerNo?: string;
  }) {
    "use server";
    await bulkReviewVehicleStickerForms({
      submissionIds: input.ids,
      decision: input.decision,
      approverName: input.approverName,
      remark: input.remark,
      stage: activeStageTarget,
      validUpto: input.validUpto,
      issuedStickerNo: input.issuedStickerNo,
    });
  }

  const pendingRows = pendingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.applicantName,
    cell2: form.entryOrEmpNo ?? form.designation,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getVehicleStickerStatusText(form),
    statusClassName: getVehicleStickerStatusBadgeClass(form),
    viewHref: `/dashboard/vehicle-sticker/${form.submissionId}`,
  }));

  const completedRows = completedForms.map((form) => ({
    id: form.submissionId,
    cell1: form.applicantName,
    cell2: form.entryOrEmpNo ?? form.designation,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getVehicleStickerStatusText(form),
    statusClassName: getVehicleStickerStatusBadgeClass(form),
    viewHref: `/dashboard/vehicle-sticker/${form.submissionId}`,
  }));

  const ongoingRows = ongoingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.applicantName,
    cell2: form.entryOrEmpNo ?? form.designation,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getVehicleStickerStatusText(form),
    statusClassName: getVehicleStickerStatusBadgeClass(form),
    viewHref: `/dashboard/vehicle-sticker/${form.submissionId}`,
  }));

  return (
    <StakeholderDashboardScaffold
      userId={user.id}
      queueLinkRole={user.role}
      roleLabel={roleDisplay.activeRoleLabel}
      baseRoleLabel={roleDisplay.baseRoleLabel}
      isTemporarilyAssigned={roleDisplay.isTemporarilyAssigned}
      activeRole={activeRole}
    >
      <QueueToggleClient
        title="Vehicle Sticker Queue"
        description="Process pending recommendations configured via Workflow Engine."
        pendingCount={currentStagePendingCount}
        defaultOpen={true}
      >
        <BulkReviewGrid
          pendingRows={pendingRows}
          ongoingRows={ongoingRows}
          completedRows={completedRows}
          cell1Header="Applicant"
          cell2Header="Employee Code"
          cell3Header="Department"
          showBulkValidUptoField={activeStageTarget === 2}
          showBulkStickerNumberField={activeStageTarget === finalStageNumber}
          onBulkReview={handleBulkReview}
        />
      </QueueToggleClient>
    </StakeholderDashboardScaffold>
  );
}
