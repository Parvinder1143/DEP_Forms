import { redirect } from "next/navigation";
import {
  getDashboardPathForUser,
  getQueueRoleForUser,
  getRoleDisplayContext,
  requireUser,
} from "@/lib/auth";
import {
  listActionableHostelUndertakingForms,
  listHostelUndertakingCompletedForms,
  listHostelUndertakingOngoingForms,
} from "@/lib/hostel-undertaking-store";
import { getWorkflow, getStagesForRole } from "@/lib/workflow-engine";
import {
  getHostelUndertakingStatusBadgeClass,
  getHostelUndertakingStatusText,
} from "@/lib/hostel-undertaking-status";
import { listRoleStageApprovalsForSubmissions } from "@/lib/workflow-stage-approvals";
import { getWorkflowStageMode } from "@/lib/workflow-engine";
import { bulkReviewHostelUndertakingForms } from "@/app/actions/hostel-undertaking";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";
import { StakeholderDashboardScaffold } from "@/components/stakeholder/dashboard-scaffold";
import { QueueToggleClient } from "@/components/stakeholder/queue-toggle-client";

export default async function GenericHostelUndertakingDashboardPage() {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "hostel-undertaking",
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

  const workflow = await getWorkflow("hostel-undertaking");
  if (!workflow) {
    throw new Error("Hostel Undertaking workflow blueprint not found in database.");
  }

  const validStages = getStagesForRole(workflow, activeRole);
  const isSystemAdmin = activeRole === "SYSTEM_ADMIN";

  if (validStages.length === 0 && !isSystemAdmin) {
    const fallbackPath = await getDashboardPathForUser(user.id, user.role);
    if (fallbackPath !== "/dashboard/hostel-undertaking") {
      redirect(fallbackPath);
    }
    redirect("/");
  }

  const actionableForms = await listActionableHostelUndertakingForms(activeRole);
  const allInProgressForms = await listHostelUndertakingOngoingForms();

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
  const completedForms = await listHostelUndertakingCompletedForms();

  const currentStagePendingCount = pendingForms.length;

  async function handleBulkReview(input: {
    ids: string[];
    decision: "approve" | "reject";
    approverName: string;
    remark: string;
  }) {
    "use server";
    const activeStageTarget = validStages[0] || 1;
    await bulkReviewHostelUndertakingForms({
      submissionIds: input.ids,
      decision: input.decision,
      approverName: input.approverName,
      remark: input.remark,
      stage: activeStageTarget,
    });
  }

  const pendingRows = pendingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.studentName,
    cell2: form.entryNumber,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getHostelUndertakingStatusText(form),
    statusClassName: getHostelUndertakingStatusBadgeClass(form),
    viewHref: `/dashboard/hostel-undertaking/${form.submissionId}`,
  }));

  const completedRows = completedForms.map((form) => ({
    id: form.submissionId,
    cell1: form.studentName,
    cell2: form.entryNumber,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getHostelUndertakingStatusText(form),
    statusClassName: getHostelUndertakingStatusBadgeClass(form),
    viewHref: `/dashboard/hostel-undertaking/${form.submissionId}`,
  }));

  const ongoingRows = ongoingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.studentName,
    cell2: form.entryNumber,
    cell3: form.department,
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getHostelUndertakingStatusText(form),
    statusClassName: getHostelUndertakingStatusBadgeClass(form),
    viewHref: `/dashboard/hostel-undertaking/${form.submissionId}`,
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
        title="Hostel Undertaking Queue"
        description="Process pending undertaking approvals configured via Workflow Engine."
        pendingCount={currentStagePendingCount}
        defaultOpen={true}
      >
        <BulkReviewGrid
          pendingRows={pendingRows}
          ongoingRows={ongoingRows}
          completedRows={completedRows}
          cell1Header="Student Name"
          cell2Header="Entry Number"
          cell3Header="Department"
          onBulkReview={handleBulkReview}
        />
      </QueueToggleClient>
    </StakeholderDashboardScaffold>
  );
}
