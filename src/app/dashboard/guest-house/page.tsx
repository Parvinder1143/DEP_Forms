import { redirect } from "next/navigation";
import {
  getDashboardPathForUser,
  getQueueRoleForUser,
  getRoleDisplayContext,
  requireUser,
} from "@/lib/auth";
import {
  listActionableGuestHouseForms,
  listGuestHouseCompletedForms,
  listGuestHouseOngoingForms,
} from "@/lib/guest-house-store";
import { getWorkflow, getStagesForRole } from "@/lib/workflow-engine";
import { bulkReviewGuestHouseForms } from "@/app/actions/guest-house";
import {
  getGuestHouseStatusBadgeClass,
  getGuestHouseStatusLabel,
} from "@/lib/guest-house-status";
import { listRoleStageApprovalsForSubmissions } from "@/lib/workflow-stage-approvals";
import { getWorkflowStageMode } from "@/lib/workflow-engine";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";
import { StakeholderDashboardScaffold } from "@/components/stakeholder/dashboard-scaffold";
import { QueueToggleClient } from "@/components/stakeholder/queue-toggle-client";
import { listDepartments } from "@/lib/department-store";

export default async function GenericGuestHouseDashboardPage() {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "guest-house",
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

  const workflow = await getWorkflow("guest-house");
  if (!workflow) {
    throw new Error("Guest House workflow blueprint not found in database.");
  }

  const validStages = getStagesForRole(workflow, activeRole);
  const isSystemAdmin = activeRole === "SYSTEM_ADMIN";

  if (validStages.length === 0 && !isSystemAdmin) {
    const fallbackPath = await getDashboardPathForUser(user.id, user.role);
    if (fallbackPath !== "/dashboard/guest-house") {
      redirect(fallbackPath);
    }
    redirect("/");
  }

  let filterDept: string[] | null = null;
  if (activeRole === "HOD") {
    const departments = await listDepartments();
    filterDept = departments.filter((d) => d.hodEmail === user.email).map((d) => d.name);
  }

  const actionableForms = await listActionableGuestHouseForms(activeRole, filterDept);
  const allInProgressForms = await listGuestHouseOngoingForms(filterDept);

  const roleStageApprovals = await listRoleStageApprovalsForSubmissions(
    activeRole,
    actionableForms.map((form) => form.submissionId)
  );

  const pendingForms = actionableForms.filter((form) => {
    const stageDef = workflow.stages.find((stage) => stage.stage === form.currentStage);
    const stageMode = stageDef ? getWorkflowStageMode(stageDef) : "OR";
    if (stageMode !== "AND") {
      return true;
    }

    return !Boolean(roleStageApprovals.get(form.submissionId)?.has(form.currentStage));
  });

  const andStageOngoingForms = actionableForms.filter((form) => {
    const stageDef = workflow.stages.find((stage) => stage.stage === form.currentStage);
    const stageMode = stageDef ? getWorkflowStageMode(stageDef) : "OR";
    if (stageMode !== "AND") {
      return false;
    }

    return Boolean(roleStageApprovals.get(form.submissionId)?.has(form.currentStage));
  });

  const pendingIds = new Set(pendingForms.map((form) => form.submissionId));
  const andOngoingIds = new Set(andStageOngoingForms.map((form) => form.submissionId));
  const ongoingForms = allInProgressForms.filter((form) => {
    if (pendingIds.has(form.submissionId)) return false;
    if (andOngoingIds.has(form.submissionId)) return true;
    return form.approvals.some(
      (approval) => validStages.includes(approval.stageNumber) && approval.decision !== "pending"
    );
  });
  const completedForms = await listGuestHouseCompletedForms(filterDept);

  const currentStagePendingCount = pendingForms.length;

  async function handleBulkReview(input: {
    ids: string[];
    decision: "approve" | "reject";
    approverName: string;
    remark: string;
  }) {
    "use server";
    const activeStageTarget = validStages[0] || 1;
    await bulkReviewGuestHouseForms({
      submissionIds: input.ids,
      decision: input.decision,
      approverName: input.approverName,
      remark: input.remark,
      stage: activeStageTarget,
    });
  }

  const pendingRows = pendingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.guestName,
    cell2: form.contactNumber,
    cell3: form.purposeOfBooking,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getGuestHouseStatusLabel(form.overallStatus),
    statusClassName: getGuestHouseStatusBadgeClass(form.overallStatus),
    viewHref: `/dashboard/guest-house/${form.submissionId}`,
  }));

  const completedRows = completedForms.map((form) => ({
    id: form.submissionId,
    cell1: form.guestName,
    cell2: form.contactNumber,
    cell3: form.purposeOfBooking,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getGuestHouseStatusLabel(form.overallStatus),
    statusClassName: getGuestHouseStatusBadgeClass(form.overallStatus),
    viewHref: `/dashboard/guest-house/${form.submissionId}`,
  }));

  const ongoingRows = ongoingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.guestName,
    cell2: form.contactNumber,
    cell3: form.purposeOfBooking,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getGuestHouseStatusLabel(form.overallStatus),
    statusClassName: getGuestHouseStatusBadgeClass(form.overallStatus),
    viewHref: `/dashboard/guest-house/${form.submissionId}`,
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
        title="Guest House Review Queue"
        description="Process pending reservation recommendations configured via Workflow Engine."
        pendingCount={currentStagePendingCount}
        defaultOpen={true}
      >
        <BulkReviewGrid
          pendingRows={pendingRows}
          ongoingRows={ongoingRows}
          completedRows={completedRows}
          cell1Header="Guest Name"
          cell2Header="Contact"
          cell3Header="Purpose"
          onBulkReview={handleBulkReview}
        />
      </QueueToggleClient>
    </StakeholderDashboardScaffold>
  );
}
