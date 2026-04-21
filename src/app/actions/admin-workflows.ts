"use server";

import { requireRole } from "@/lib/auth";
import { listCustomRoles, normalizeAssignableRoleCode } from "@/lib/custom-role-store";
import { BUILT_IN_ROLE_OPTIONS } from "@/lib/roles";
import { getPgPool } from "@/lib/db";
import { revalidatePath } from "next/cache";

type WorkflowStageInput = {
  stage?: number;
  role?: string;
  mode?: string;
};

export async function updateWorkflowStages(formId: string, stages: WorkflowStageInput[]) {
  await requireRole(["SYSTEM_ADMIN"]);

  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database connection not ready.");
  }

  const customRoles = await listCustomRoles();
  const allowedRoleCodes = new Set<string>([
    ...BUILT_IN_ROLE_OPTIONS.map((role) => String(role).toUpperCase()),
    ...customRoles.map((role) => role.roleCode.toUpperCase()),
  ]);

  const normalizedStages = stages.map((stage) => {
    const rawRoleCodes = String(stage.role ?? "")
      .split(",")
      .map((roleCode) => normalizeAssignableRoleCode(roleCode))
      .filter(Boolean);

    const uniqueRoleCodes = Array.from(new Set(rawRoleCodes));
    const validRoleCodes = uniqueRoleCodes.filter((roleCode) => allowedRoleCodes.has(roleCode));

    if (validRoleCodes.length === 0) {
      throw new Error("Each workflow stage must have at least one assignable role.");
    }

    const mode = String(stage.mode ?? "OR").toUpperCase() === "AND" ? "AND" : "OR";

    return {
      role: validRoleCodes.join(","),
      mode,
    };
  });

  // Ensure stages numeric order is correctly maintained when saving back to DB
  const mappedStages = normalizedStages.map((s, index) => ({
    stage: index + 1,
    role: s.role,
    mode: s.mode,
  }));

  await pool.query(
    "UPDATE app_workflows SET stages = $1::jsonb, updated_at = NOW() WHERE id = $2",
    [JSON.stringify(mappedStages), formId]
  );

  const formTypeByWorkflowId: Record<string, string> = {
    "email-id": "email_id_request",
    "identity-card": "identity_card",
    "vehicle-sticker": "vehicle_sticker",
    "guest-house": "guest_house_reservation",
    "hostel-undertaking": "hostel_undertaking",
  };

  const formType = formTypeByWorkflowId[formId];
  if (formType) {
    const maxStage = mappedStages.length;
    await pool.query(
      `
      UPDATE form_submissions
      SET overall_status = 'approved'::submission_status,
          current_stage = $2,
          updated_at = NOW()
      WHERE form_type = $1::form_type
        AND overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)
        AND current_stage > $2
    `,
      [formType, maxStage]
    );
  }

  revalidatePath("/admin/workflows");
}
