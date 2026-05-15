import { redirect } from "next/navigation";
import { getQueueRoleForUser, getRoleDisplayContext, requireUser } from "@/lib/auth";
import {
  listEmailIdForms,
  type EmailFormWithApprovals,
} from "@/lib/email-id-store";
import { getWorkflow, getStagesForRole } from "@/lib/workflow-engine";
import {
  getCurrentEmailWorkflowStage,
  getStageDefinitionByNumber,
  roleCanApproveStage,
  stageRequiresIssuanceFields,
} from "@/lib/email-id-workflow";
import { listRoleStageApprovalsForSubmissions } from "@/lib/workflow-stage-approvals";
import { getWorkflowStageMode } from "@/lib/workflow-engine";
import {
  getEmailFormStatusBadgeClass,
  getEmailFormStatusText,
} from "@/lib/email-id-status";
import { StakeholderDashboardScaffold } from "@/components/stakeholder/dashboard-scaffold";
import { QueueToggleClient } from "@/components/stakeholder/queue-toggle-client";
import { BulkReviewGrid } from "@/components/stakeholder/bulk-review-grid";
import { bulkIssueEmailIds, bulkReviewEmailIdForms } from "@/app/actions/email-id";
import { listDepartments } from "@/lib/department-store";

export default async function GenericEmailIdDashboard() {
  const user = await requireUser();
  const queueRole = await getQueueRoleForUser({
    userId: user.id,
    baseRole: user.role,
    queueKey: "email-id",
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

  const workflow = await getWorkflow("email-id");
  if (!workflow) {
    throw new Error("Email ID workflow blueprint not found in database.");
  }
  const emailWorkflow = workflow;

  const validStages = getStagesForRole(emailWorkflow, activeRole);
  const isSystemAdmin = activeRole === "SYSTEM_ADMIN";

  if (validStages.length === 0 && !isSystemAdmin) {
    redirect("/");
  }

  const inProgressForms = (await listEmailIdForms({
    includeApprovals: true,
  })) as EmailFormWithApprovals[];

  const roleStageApprovals = await listRoleStageApprovalsForSubmissions(
    activeRole,
    inProgressForms.map((form) => form.id)
  );

  const actionablePending: EmailFormWithApprovals[] = [];
  const inReview: EmailFormWithApprovals[] = [];

  for (const form of inProgressForms) {
    if (form.status === "ISSUED" || form.status === "REJECTED") {
      continue;
    }

    if (activeRole === "HOD") {
      const departments = await listDepartments();
      const hodDepartments = departments.filter((d) => d.hodEmail === user.email).map((d) => d.name);
      if (!hodDepartments.includes(form.department)) {
        continue;
      }
    }

    const currentStageNumber = getCurrentEmailWorkflowStage(form, emailWorkflow);
    if (currentStageNumber === null) {
      continue;
    }

    const stageDefinition = getStageDefinitionByNumber(emailWorkflow, currentStageNumber);
    if (!stageDefinition) {
      continue;
    }

    const canActOnStage = isSystemAdmin || roleCanApproveStage(stageDefinition, user.role ?? null);
    if (canActOnStage) {
      const stageMode = getWorkflowStageMode(stageDefinition);
      const alreadyApprovedThisStage = Boolean(
        roleStageApprovals.get(form.id)?.has(currentStageNumber)
      );

      if (stageMode === "AND" && alreadyApprovedThisStage) {
        inReview.push(form);
      } else {
        actionablePending.push(form);
      }
    } else {
      inReview.push(form);
    }
  }

  const pendingForms = actionablePending;
  const ongoingForms = inReview;

  const [issuedForms, rejectedForms] = (await Promise.all([
    listEmailIdForms({ status: "ISSUED", includeApprovals: true }),
    listEmailIdForms({ status: "REJECTED", includeApprovals: true }),
  ])) as [EmailFormWithApprovals[], EmailFormWithApprovals[]];

  const completedForms = [...issuedForms, ...rejectedForms].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  async function handleBulkAction(input: {
    ids: string[];
    decision: "approve" | "reject";
    approverName: string;
    remark: string;
    dateOfCreation?: string;
    tentativeRemovalDate?: string | null;
  }) {
    "use server";
    
    const selectedForms = pendingForms.filter((form) => input.ids.includes(form.id));
    const issuanceIds = selectedForms
      .filter((form) => {
        const stageNumber = getCurrentEmailWorkflowStage(form, emailWorkflow);
        return stageNumber !== null && stageRequiresIssuanceFields(emailWorkflow, stageNumber);
      })
      .map((form) => form.id);

    const reviewIds = selectedForms
      .filter((form) => !issuanceIds.includes(form.id))
      .map((form) => form.id);

    if (issuanceIds.length > 0) {
      if (input.decision === "reject") {
        throw new Error("Final-stage issuance requests cannot be rejected in bulk.");
      }
      await bulkIssueEmailIds({
        formIds: issuanceIds,
        approverName: input.approverName,
        dateOfCreation: input.dateOfCreation ?? new Date().toISOString().split("T")[0],
        tentativeRemovalDate: input.tentativeRemovalDate ?? null,
      });
    }

    if (reviewIds.length > 0) {
      let sectionTarget: "ACADEMICS" | "ESTABLISHMENT" | "RESEARCH_AND_DEVELOPMENT" = "ESTABLISHMENT";
      if (activeRole === "FORWARDING_AUTHORITY_ACADEMICS") sectionTarget = "ACADEMICS";
      if (activeRole === "FORWARDING_AUTHORITY_R_AND_D") sectionTarget = "RESEARCH_AND_DEVELOPMENT";

      await bulkReviewEmailIdForms({
        formIds: reviewIds,
        section: sectionTarget,
        approverName: input.approverName,
        remark: input.remark,
        decision: input.decision,
      });
    }
  }

  const mapFormToRow = (f: EmailFormWithApprovals) => ({
    id: f.id,
    cell1: `${f.initials} ${f.firstName} ${f.lastName}`,
    cell2: f.role,
    cell3: f.department,
    submittedAt: new Date(f.createdAt).toLocaleDateString("en-IN"),
    statusText: getEmailFormStatusText({ status: f.status, approvals: f.approvals }),
    statusClassName: getEmailFormStatusBadgeClass(f.status),
    viewHref: `/dashboard/email-id/${f.id}`,
  });

  const pendingRows = pendingForms.map(mapFormToRow);
  const ongoingRows = ongoingForms.map(mapFormToRow);
  const completedRows = completedForms.map(mapFormToRow);

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
        title="Email Approval Queue"
        description="Process pending recommendations configured via Workflow Engine."
        pendingCount={pendingRows.length}
        defaultOpen={true}
      >
        <BulkReviewGrid
          pendingRows={pendingRows}
          ongoingRows={ongoingRows}
          completedRows={completedRows}
          cell1Header="Applicant"
          cell2Header="Role"
          cell3Header="Department"
          showBulkIssuanceFields={true}
          onBulkReview={handleBulkAction}
        />
      </QueueToggleClient>
    </StakeholderDashboardScaffold>
  );
}
