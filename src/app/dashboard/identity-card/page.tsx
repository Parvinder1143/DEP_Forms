import { redirect } from "next/navigation";
import {
  getDashboardPathForUser,
  getQueueRoleForUser,
  getRoleDisplayContext,
  requireUser,
} from "@/lib/auth";
import {
  listActionableIdentityCardForms,
  listIdentityCardCompletedForms,
  listIdentityCardOngoingForms,
} from "@/lib/identity-card-store";
import { getWorkflow, getStagesForRole } from "@/lib/workflow-engine";
import {
  getIdentityCardStatusBadgeClass,
  getIdentityCardStatusText,
} from "@/lib/identity-card-status";
import { listRoleStageApprovalsForSubmissions } from "@/lib/workflow-stage-approvals";
import { getWorkflowStageMode } from "@/lib/workflow-engine";
import { bulkReviewIdentityCardForms } from "@/app/actions/identity-card";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";
import { StakeholderDashboardScaffold } from "@/components/stakeholder/dashboard-scaffold";
import { QueueToggleClient } from "@/components/stakeholder/queue-toggle-client";
import { listDepartments } from "@/lib/department-store";

export default async function GenericIdentityCardDashboardPage() {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "identity-card",
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

  const workflow = await getWorkflow("identity-card");
  if (!workflow) {
    throw new Error("Identity Card workflow blueprint not found in database.");
  }

  const validStages = getStagesForRole(workflow, activeRole);
  const isSystemAdmin = activeRole === "SYSTEM_ADMIN";

  // If the user's role has zero actionable stages defined in the blueprint, they can't review anything here.
  if (validStages.length === 0 && !isSystemAdmin) {
    const fallbackPath = await getDashboardPathForUser(user.id, user.role);
    if (fallbackPath !== "/dashboard/identity-card") {
      redirect(fallbackPath);
    }
    redirect("/");
  }

  let filterDept: string[] | null = null;
  if (activeRole === "HOD") {
    const departments = await listDepartments();
    filterDept = departments.filter((d) => d.hodEmail === user.email).map((d) => d.name);
  }

  // We fetch actionable forms dynamically based on the stages evaluated from the workflow
  const actionableForms = await listActionableIdentityCardForms(activeRole, filterDept);
  const allInProgressForms = await listIdentityCardOngoingForms(filterDept);

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
  
  // We fetch fully completed forms
  const completedForms = await listIdentityCardCompletedForms(filterDept);

  const currentStagePendingCount = pendingForms.length;

  async function handleBulkReview(input: {
    ids: string[];
    decision: "approve" | "reject";
    approverName: string;
    remark: string;
  }) {
    "use server";
    // We assume the forms being actioned belong to the first valid stage the user holds.
    // In a fully developed multi-stage holding system, this would be derived from the selected row.
    const activeStageTarget = validStages[0] || 1; 
    
    await bulkReviewIdentityCardForms({
      submissionIds: input.ids,
      decision: input.decision,
      approverName: input.approverName,
      remark: input.remark,
      stage: activeStageTarget,
    });
  }

  const pendingRows = pendingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.nameInCapitals,
    cell2: form.employeeCodeSnapshot ?? "-",
    cell3: form.departmentSnapshot ?? "-",
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getIdentityCardStatusText(form),
    statusClassName: getIdentityCardStatusBadgeClass(form),
    viewHref: `/dashboard/identity-card/${form.submissionId}`,
  }));

  const ongoingRows = ongoingForms.map((form) => ({
    id: form.submissionId,
    cell1: form.nameInCapitals,
    cell2: form.employeeCodeSnapshot ?? "-",
    cell3: form.departmentSnapshot ?? "-",
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getIdentityCardStatusText(form),
    statusClassName: getIdentityCardStatusBadgeClass(form),
    viewHref: `/dashboard/identity-card/${form.submissionId}`,
  }));

  const completedRows = completedForms.map((form) => ({
    id: form.submissionId,
    cell1: form.nameInCapitals,
    cell2: form.employeeCodeSnapshot ?? "-",
    cell3: form.departmentSnapshot ?? "-",
    submittedAt: new Date(form.createdAt).toLocaleString("en-IN"),
    statusText: getIdentityCardStatusText(form),
    statusClassName: getIdentityCardStatusBadgeClass(form),
    viewHref: `/dashboard/identity-card/${form.submissionId}`,
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
        title="Identity Card Queue"
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
          onBulkReview={handleBulkReview}
        />
      </QueueToggleClient>
    </StakeholderDashboardScaffold>
  );
}
