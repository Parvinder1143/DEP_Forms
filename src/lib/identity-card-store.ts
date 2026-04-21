import { getPgPool } from "@/lib/db";
import type { AppRole } from "@/lib/mock-db";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type IdentityCardType = "fresh" | "renewal" | "duplicate";

export type IdentityCardStageApproval = {
  stageNumber: number;
  stageName: string;
  decision: "pending" | "approved" | "rejected" | "forwarded";
  recommendationText: string | null;
  decidedAt: Date | null;
};

export type IdentityCardAttachmentType =
  | "passport_photo"
  | "previous_id_card"
  | "deposit_slip"
  | "fir_copy";

export type IdentityCardAttachmentRecord = {
  id: string;
  documentType: IdentityCardAttachmentType;
  filePath: string;
  originalFilename: string;
  mimeType: string | null;
};

export type IdentityCardFormRecord = {
  submissionId: string;
  submittedById: string;
  submittedByEmail: string;
  createdAt: Date;
  updatedAt: Date;
  currentStage: number;
  overallStatus: string;
  nameInCapitals: string;
  employeeCodeSnapshot: string | null;
  designationSnapshot: string | null;
  employmentType: string | null;
  contractUpto: Date | null;
  departmentSnapshot: string | null;
  fathersHusbandName: string;
  dateOfBirth: Date;
  dateOfJoining: Date;
  bloodGroup: string | null;
  presentAddress: string;
  presentAddressLine2: string | null;
  officePhone: string | null;
  mobileNumber: string;
  emailId: string;
  cardType: IdentityCardType;
  previousCardValidity: string | null;
  reasonForRenewal: string | null;
  depositAmount: number | null;
  bankAccountNo: string | null;
  hodSectionHeadName: string | null;
  hodForwardedAt: Date | null;
  deputyRegistrarDecision: string | null;
  deputyRegistrarDecidedAt: Date | null;
  registrarDecision: string | null;
  registrarDecidedAt: Date | null;
  approvals: IdentityCardStageApproval[];
  attachments: IdentityCardAttachmentRecord[];
};

type UploadAttachmentInput = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getAttachmentExtension(fileName: string) {
  const ext = path.extname(fileName);
  return ext || ".bin";
}

function mapAppRoleToWorkflowRole(role: AppRole | null): string {
  switch (role) {
    case "STUDENT":
      return "student";
    case "INTERN":
    case "EMPLOYEE":
      return "non_tech_staff";
    case "HOD":
    case "SECTION_HEAD":
      return "hod";
    case "ESTABLISHMENT":
      return "deputy_registrar";
    case "REGISTRAR":
      return "registrar";
    case "DEAN_FAA":
      return "dean_faa";
    case "SYSTEM_ADMIN":
      return "system_admin";
    default:
      return "student";
  }
}

async function ensureWorkflowUser(input: {
  email: string;
  fullName: string | null;
  appRole: AppRole | null;
}) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  const existing = await pool.query(
    `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [input.email]
  );

  if ((existing.rowCount ?? 0) > 0) {
    return String(existing.rows[0].id);
  }

  const fallbackName = input.fullName?.trim() || input.email.split("@")[0] || "User";
  const role = mapAppRoleToWorkflowRole(input.appRole);

  const inserted = await pool.query(
    `
    INSERT INTO users (email, full_name, primary_role, is_active)
    VALUES ($1, $2, $3::user_role, TRUE)
    RETURNING id
  `,
    [input.email.toLowerCase(), fallbackName, role]
  );

  return String(inserted.rows[0].id);
}

async function getApprovalsBySubmissionIds(submissionIds: string[]) {
  const pool = getPgPool();
  if (!pool || submissionIds.length === 0) {
    return new Map<string, IdentityCardStageApproval[]>();
  }

  const approvals = await pool.query(
    `
    SELECT
      submission_id,
      stage_number,
      stage_name,
      decision,
      recommendation_text,
      decided_at
    FROM approval_stages
    WHERE submission_id = ANY($1::uuid[])
    ORDER BY stage_number ASC
  `,
    [submissionIds]
  );

  const map = new Map<string, IdentityCardStageApproval[]>();
  for (const row of approvals.rows) {
    const key = String(row.submission_id);
    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)?.push({
      stageNumber: Number(row.stage_number),
      stageName: String(row.stage_name),
      decision: String(row.decision) as IdentityCardStageApproval["decision"],
      recommendationText: row.recommendation_text ? String(row.recommendation_text) : null,
      decidedAt: row.decided_at ? new Date(row.decided_at) : null,
    });
  }

  return map;
}

async function getAttachmentsBySubmissionIds(submissionIds: string[]) {
  const pool = getPgPool();
  if (!pool || submissionIds.length === 0) {
    return new Map<string, IdentityCardAttachmentRecord[]>();
  }

  const result = await pool.query(
    `
    SELECT submission_id, id, document_type, file_path, original_filename, mime_type
    FROM documents
    WHERE submission_id = ANY($1::uuid[])
      AND document_type = ANY($2::document_type[])
    ORDER BY uploaded_at ASC
  `,
    [submissionIds, ["passport_photo", "previous_id_card", "deposit_slip", "fir_copy"]]
  );

  const map = new Map<string, IdentityCardAttachmentRecord[]>();
  for (const row of result.rows) {
    const key = String(row.submission_id);
    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)?.push({
      id: String(row.id),
      documentType: String(row.document_type) as IdentityCardAttachmentType,
      filePath: String(row.file_path),
      originalFilename: String(row.original_filename),
      mimeType: row.mime_type ? String(row.mime_type) : null,
    });
  }

  return map;
}

function combineRecords(
  rows: Array<Record<string, unknown>>,
  approvalsMap: Map<string, IdentityCardStageApproval[]>,
  attachmentsMap: Map<string, IdentityCardAttachmentRecord[]>
) {
  return rows.map((row) => {
    const submissionId = String(row.submission_id);

    return {
      submissionId,
      submittedById: String(row.submitted_by),
      submittedByEmail: String(row.submitted_by_email),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
      currentStage: Number(row.current_stage),
      overallStatus: String(row.overall_status),
      nameInCapitals: String(row.name_in_capitals),
      employeeCodeSnapshot: row.employee_code_snapshot ? String(row.employee_code_snapshot) : null,
      designationSnapshot: row.designation_snapshot ? String(row.designation_snapshot) : null,
      employmentType: row.employment_type ? String(row.employment_type) : null,
      contractUpto: row.contract_upto ? new Date(String(row.contract_upto)) : null,
      departmentSnapshot: row.department_snapshot ? String(row.department_snapshot) : null,
      fathersHusbandName: String(row.fathers_husband_name),
      dateOfBirth: new Date(String(row.date_of_birth)),
      dateOfJoining: new Date(String(row.date_of_joining)),
      bloodGroup: row.blood_group ? String(row.blood_group) : null,
      presentAddress: String(row.present_address),
      presentAddressLine2: row.present_address_line2 ? String(row.present_address_line2) : null,
      officePhone: row.office_phone ? String(row.office_phone) : null,
      mobileNumber: String(row.mobile_number),
      emailId: String(row.email_id),
      cardType: String(row.card_type) as IdentityCardType,
      previousCardValidity: row.previous_card_validity ? String(row.previous_card_validity) : null,
      reasonForRenewal: row.reason_for_renewal ? String(row.reason_for_renewal) : null,
      depositAmount: row.deposit_amount === null || row.deposit_amount === undefined ? null : Number(row.deposit_amount),
      bankAccountNo: row.bank_account_no ? String(row.bank_account_no) : null,
      hodSectionHeadName: row.hod_section_head_name ? String(row.hod_section_head_name) : null,
      hodForwardedAt: row.hod_forwarded_at ? new Date(String(row.hod_forwarded_at)) : null,
      deputyRegistrarDecision: row.deputy_registrar_decision ? String(row.deputy_registrar_decision) : null,
      deputyRegistrarDecidedAt: row.deputy_registrar_decided_at
        ? new Date(String(row.deputy_registrar_decided_at))
        : null,
      registrarDecision: row.registrar_decision ? String(row.registrar_decision) : null,
      registrarDecidedAt: row.registrar_decided_at ? new Date(String(row.registrar_decided_at)) : null,
      approvals: approvalsMap.get(submissionId) ?? [],
      attachments: attachmentsMap.get(submissionId) ?? [],
    } satisfies IdentityCardFormRecord;
  });
}

export async function createIdentityCardForm(input: {
  submitter: {
    id: string;
    email: string;
    fullName: string | null;
    role: AppRole | null;
  };
  nameInCapitals: string;
  employeeCodeSnapshot: string;
  designationSnapshot: string;
  employmentType: string;
  contractUpto: string | null;
  departmentSnapshot: string;
  fathersHusbandName: string;
  dateOfBirth: string;
  dateOfJoining: string;
  bloodGroup: string;
  presentAddress: string;
  presentAddressLine2: string;
  officePhone: string;
  mobileNumber: string;
  emailId: string;
  cardType: IdentityCardType;
  previousCardValidity: string | null;
  reasonForRenewal: string | null;
  attachments: {
    passportPhoto: UploadAttachmentInput;
    previousIdCard: UploadAttachmentInput | null;
    depositSlip: UploadAttachmentInput | null;
    firCopy: UploadAttachmentInput | null;
  };
}) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  const workflowUserId = await ensureWorkflowUser({
    email: input.submitter.email,
    fullName: input.submitter.fullName,
    appRole: input.submitter.role,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const submission = await client.query(
      `
      INSERT INTO form_submissions (
        form_type,
        submitted_by,
        current_stage,
        overall_status,
        metadata,
        submitted_at
      )
      VALUES (
        'identity_card'::form_type,
        $1::uuid,
        1,
        'submitted'::submission_status,
        $2::jsonb,
        NOW()
      )
      RETURNING id
    `,
      [
        workflowUserId,
        JSON.stringify({
          applicantName: input.nameInCapitals,
          employeeCode: input.employeeCodeSnapshot,
          department: input.departmentSnapshot,
        }),
      ]
    );

    const submissionId = String(submission.rows[0].id);

    const identity = await client.query(
      `
      INSERT INTO identity_card_data (
        submission_id,
        name_in_capitals,
        employee_code_snapshot,
        designation_snapshot,
        employment_type,
        contract_upto,
        department_snapshot,
        fathers_husband_name,
        date_of_birth,
        date_of_joining,
        blood_group,
        present_address,
        present_address_line2,
        office_phone,
        mobile_number,
        email_id,
        card_type,
        previous_card_validity,
        reason_for_renewal
      )
      VALUES (
        $1::uuid, $2, $3, $4, $5, $6::date,
        $7, $8, $9::date, $10::date, $11,
        $12, $13, $14, $15, $16,
        $17::id_card_type, $18, $19
      )
      RETURNING id
    `,
      [
        submissionId,
        input.nameInCapitals,
        input.employeeCodeSnapshot,
        input.designationSnapshot,
        input.employmentType,
        input.contractUpto,
        input.departmentSnapshot,
        input.fathersHusbandName,
        input.dateOfBirth,
        input.dateOfJoining,
        input.bloodGroup,
        input.presentAddress,
        input.presentAddressLine2,
        input.officePhone,
        input.mobileNumber,
        input.emailId,
        input.cardType,
        input.previousCardValidity,
        input.reasonForRenewal,
      ]
    );

    const identityId = String(identity.rows[0].id);

    const stageRows = [
      [1, "HoD / Section Head Forwarding", "hod"],
      [2, "Establishment Review", "deputy_registrar"],
      [3, "Registrar / Dean Final Approval", "registrar"],
    ] as const;

    for (const stage of stageRows) {
      await client.query(
        `
        INSERT INTO approval_stages (
          submission_id,
          stage_number,
          stage_name,
          role_required,
          decision,
          requires_stamp
        )
        VALUES ($1::uuid, $2, $3, $4::user_role, 'pending'::stage_decision, FALSE)
      `,
        [submissionId, stage[0], stage[1], stage[2]]
      );
    }

    const uploadDirAbsolute = path.join(process.cwd(), "public", "uploads", "identity-card", submissionId);
    await mkdir(uploadDirAbsolute, { recursive: true });

    const attachments: Array<{ type: IdentityCardAttachmentType; payload: UploadAttachmentInput | null }> = [
      { type: "passport_photo", payload: input.attachments.passportPhoto },
      { type: "previous_id_card", payload: input.attachments.previousIdCard },
      { type: "deposit_slip", payload: input.attachments.depositSlip },
      { type: "fir_copy", payload: input.attachments.firCopy },
    ];

    let previousIdCardDocId: string | null = null;
    let depositSlipDocId: string | null = null;
    let firCopyDocId: string | null = null;

    for (const attachment of attachments) {
      if (!attachment.payload) {
        continue;
      }

      const safeFileName = sanitizeFileName(attachment.payload.fileName);
      const ext = getAttachmentExtension(safeFileName);
      const finalFileName = `${attachment.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

      const absoluteFilePath = path.join(uploadDirAbsolute, finalFileName);
      const publicFilePath = `/uploads/identity-card/${submissionId}/${finalFileName}`;

      await writeFile(absoluteFilePath, attachment.payload.buffer);

      const insertedDoc = await client.query(
        `
        INSERT INTO documents (
          submission_id,
          document_type,
          file_path,
          original_filename,
          file_size_bytes,
          mime_type,
          uploaded_by
        )
        VALUES ($1::uuid, $2::document_type, $3, $4, $5, $6, $7::uuid)
        RETURNING id
      `,
        [
          submissionId,
          attachment.type,
          publicFilePath,
          safeFileName,
          attachment.payload.buffer.length,
          attachment.payload.mimeType,
          workflowUserId,
        ]
      );

      const docId = String(insertedDoc.rows[0].id);
      if (attachment.type === "previous_id_card") {
        previousIdCardDocId = docId;
      }
      if (attachment.type === "deposit_slip") {
        depositSlipDocId = docId;
      }
      if (attachment.type === "fir_copy") {
        firCopyDocId = docId;
      }
    }

    await client.query(
      `
      UPDATE identity_card_data
      SET previous_id_card_doc_id = $2::uuid,
          deposit_slip_doc_id = $3::uuid,
          fir_copy_doc_id = $4::uuid
      WHERE id = $1::uuid
    `,
      [identityId, previousIdCardDocId, depositSlipDocId, firCopyDocId]
    );

    await client.query("COMMIT");
    return submissionId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listByWhere(whereClause: string, values: unknown[] = []) {
  const pool = getPgPool();
  if (!pool) {
    return [] as IdentityCardFormRecord[];
  }

  const result = await pool.query(
    `
    SELECT
      fs.id AS submission_id,
      fs.submitted_by,
      fs.current_stage,
      fs.overall_status,
      fs.created_at,
      fs.updated_at,
      u.email AS submitted_by_email,
      icd.name_in_capitals,
      icd.employee_code_snapshot,
      icd.designation_snapshot,
      icd.employment_type,
      icd.contract_upto,
      icd.department_snapshot,
      icd.fathers_husband_name,
      icd.date_of_birth,
      icd.date_of_joining,
      icd.blood_group,
      icd.present_address,
      icd.present_address_line2,
      icd.office_phone,
      icd.mobile_number,
      icd.email_id,
      icd.card_type,
      icd.previous_card_validity,
      icd.reason_for_renewal,
      icd.deposit_amount,
      icd.bank_account_no,
      icd.hod_section_head_name,
      icd.hod_forwarded_at,
      icd.deputy_registrar_decision,
      icd.deputy_registrar_decided_at,
      icd.registrar_decision,
      icd.registrar_decided_at
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN identity_card_data icd ON icd.submission_id = fs.id
    WHERE fs.form_type = 'identity_card'::form_type
      ${whereClause}
    ORDER BY fs.created_at DESC
  `,
    values
  );

  const ids = result.rows.map((row) => String(row.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const attachmentsMap = await getAttachmentsBySubmissionIds(ids);

  return combineRecords(result.rows, approvalsMap, attachmentsMap);
}

import { getNextStage, getWorkflow, getStagesForRole } from "@/lib/workflow-engine";

export async function listActionableIdentityCardForms(activeRole: AppRole, department?: string | null) {
  const workflow = await getWorkflow("identity-card");
  if (!workflow) return [];

  const validStages = getStagesForRole(workflow, activeRole);
  if (validStages.length === 0) return [];

  // Transform [1, 2] into dynamically bound parameters
  const placeholders = validStages.map((_, i) => `$${i + 1}`).join(", ");
  let whereClause = `AND fs.current_stage IN (${placeholders}) AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)`;
  
  const params: unknown[] = [...validStages];

  if (department) {
    params.push(department);
    whereClause += ` AND icd.department_snapshot = $${params.length}`;
  }

  return listByWhere(whereClause, params);
}

export async function listIdentityCardFormsForStage(stageNumber: number, department?: string | null) {
  let whereClause = "AND fs.current_stage = $1 AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)";
  const params: unknown[] = [stageNumber];

  if (department) {
    params.push(department);
    whereClause += ` AND icd.department_snapshot = $${params.length}`;
  }

  return listByWhere(whereClause, params);
}

export async function listIdentityCardCompletedForms(department?: string | null) {
  let whereClause = "AND fs.overall_status IN ('approved'::submission_status, 'rejected'::submission_status)";
  const params: unknown[] = [];

  if (department) {
    params.push(department);
    whereClause += ` AND icd.department_snapshot = $${params.length}`;
  }

  return listByWhere(whereClause, params);
}

export async function listIdentityCardOngoingForms(department?: string | null) {
  let whereClause = "AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)";
  const params: unknown[] = [];

  if (department) {
    params.push(department);
    whereClause += ` AND icd.department_snapshot = $${params.length}`;
  }

  return listByWhere(whereClause, params);
}

export async function listIdentityCardFormsBySubmitterEmail(email: string) {
  return listByWhere("AND lower(u.email) = lower($1)", [email]);
}

export async function getIdentityCardFormById(submissionId: string) {
  const rows = await listByWhere("AND fs.id = $1::uuid", [submissionId]);
  return rows[0] ?? null;
}

export async function listIdentityCardAttachmentsBySubmissionId(submissionId: string) {
  const map = await getAttachmentsBySubmissionIds([submissionId]);
  return map.get(submissionId) ?? [];
}

async function approveStage(input: {
  submissionId: string;
  stageNumber: number;
  recommendationText: string;
  nextStage: number;
  markApproved: boolean;
  actorUserId?: string;
  actorName?: string;
}) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const row = await client.query(
      `
      SELECT current_stage
      FROM form_submissions
      WHERE id = $1::uuid
      LIMIT 1
    `,
      [input.submissionId]
    );

    if ((row.rowCount ?? 0) === 0) {
      throw new Error("Identity card form not found.");
    }

    const currentStage = Number(row.rows[0].current_stage);
    if (currentStage !== input.stageNumber) {
      throw new Error("This form is not at your stage right now.");
    }

    await client.query(
      `
      UPDATE approval_stages
      SET decision = 'approved'::stage_decision,
          recommendation_text = $3,
          decided_at = NOW()
      WHERE submission_id = $1::uuid
        AND stage_number = $2
    `,
      [input.submissionId, input.stageNumber, input.recommendationText]
    );

    if (input.stageNumber === 1) {
      await client.query(
        `
        UPDATE identity_card_data
        SET hod_section_head_name = $2,
            hod_forwarded_at = NOW()
        WHERE submission_id = $1::uuid
      `,
        [input.submissionId, input.actorName ?? null]
      );
    }

    if (input.stageNumber === 2) {
      await client.query(
        `
        UPDATE identity_card_data
        SET deputy_registrar_decision = 'Recommended',
            deputy_registrar_id = $2::uuid,
            deputy_registrar_decided_at = NOW()
        WHERE submission_id = $1::uuid
      `,
        [input.submissionId, input.actorUserId ?? null]
      );
    }

    if (input.stageNumber === 3) {
      await client.query(
        `
        UPDATE identity_card_data
        SET registrar_decision = 'Approved',
            registrar_id = $2::uuid,
            registrar_decided_at = NOW()
        WHERE submission_id = $1::uuid
      `,
        [input.submissionId, input.actorUserId ?? null]
      );
    }

    if (input.markApproved) {
      await client.query(
        `
        UPDATE form_submissions
        SET overall_status = 'approved'::submission_status,
            current_stage = $2,
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
        [input.submissionId, input.stageNumber]
      );
    } else {
      await client.query(
        `
        UPDATE form_submissions
        SET overall_status = 'in_review'::submission_status,
            current_stage = $2,
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
        [input.submissionId, input.nextStage]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function rejectStage(input: {
  submissionId: string;
  stageNumber: number;
  recommendationText: string;
  actorUserId?: string;
}) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const row = await client.query(
      `
      SELECT current_stage
      FROM form_submissions
      WHERE id = $1::uuid
      LIMIT 1
    `,
      [input.submissionId]
    );

    if ((row.rowCount ?? 0) === 0) {
      throw new Error("Identity card form not found.");
    }

    const currentStage = Number(row.rows[0].current_stage);
    if (currentStage !== input.stageNumber) {
      throw new Error("This form is not at your stage right now.");
    }

    await client.query(
      `
      UPDATE approval_stages
      SET decision = 'rejected'::stage_decision,
          recommendation_text = $3,
          decided_at = NOW()
      WHERE submission_id = $1::uuid
        AND stage_number = $2
    `,
      [input.submissionId, input.stageNumber, input.recommendationText]
    );

    if (input.stageNumber === 2) {
      await client.query(
        `
        UPDATE identity_card_data
        SET deputy_registrar_decision = 'Not Recommended',
            deputy_registrar_id = $2::uuid,
            deputy_registrar_decided_at = NOW()
        WHERE submission_id = $1::uuid
      `,
        [input.submissionId, input.actorUserId ?? null]
      );
    }

    if (input.stageNumber === 3) {
      await client.query(
        `
        UPDATE identity_card_data
        SET registrar_decision = 'Not Approved',
            registrar_id = $2::uuid,
            registrar_decided_at = NOW()
        WHERE submission_id = $1::uuid
      `,
        [input.submissionId, input.actorUserId ?? null]
      );
    }

    await client.query(
      `
      UPDATE form_submissions
      SET overall_status = 'rejected'::submission_status,
          updated_at = NOW()
      WHERE id = $1::uuid
    `,
      [input.submissionId]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function approveIdentityCardStage1(input: {
  submissionId: string;
  approverName: string;
  approverRoleLabel: string;
}) {
  const workflow = await getWorkflow("identity-card");
  if (!workflow) {
    throw new Error("Identity Card workflow blueprint not found in database.");
  }

  const nextStage = getNextStage(workflow, 1);

  return approveStage({
    submissionId: input.submissionId,
    stageNumber: 1,
    nextStage: nextStage ?? 1,
    markApproved: nextStage === null,
    actorName: input.approverName,
    recommendationText: `${input.approverRoleLabel}: ${input.approverName}`,
  });
}

export async function approveIdentityCardStage2(input: {
  submissionId: string;
  approverName: string;
  approverWorkflowUserId: string;
}) {
  const workflow = await getWorkflow("identity-card");
  if (!workflow) {
    throw new Error("Identity Card workflow blueprint not found in database.");
  }

  const nextStage = getNextStage(workflow, 2);

  return approveStage({
    submissionId: input.submissionId,
    stageNumber: 2,
    nextStage: nextStage ?? 2,
    markApproved: nextStage === null,
    actorUserId: input.approverWorkflowUserId,
    recommendationText: `Establishment: ${input.approverName} | Recommended`,
  });
}

export async function approveIdentityCardStage3(input: {
  submissionId: string;
  approverName: string;
  approverRoleLabel: string;
  approverWorkflowUserId: string;
}) {
  const workflow = await getWorkflow("identity-card");
  if (!workflow) {
    throw new Error("Identity Card workflow blueprint not found in database.");
  }

  const nextStage = getNextStage(workflow, 3);

  return approveStage({
    submissionId: input.submissionId,
    stageNumber: 3,
    nextStage: nextStage ?? 3,
    markApproved: nextStage === null,
    actorUserId: input.approverWorkflowUserId,
    recommendationText: `${input.approverRoleLabel}: ${input.approverName} | Approved`,
  });
}

export async function rejectIdentityCardStage(input: {
  submissionId: string;
  stageNumber: number;
  approverName: string;
  approverRoleLabel: string;
  remark: string;
  approverWorkflowUserId?: string;
}) {
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: input.stageNumber,
    actorUserId: input.approverWorkflowUserId,
    recommendationText: `Rejected by ${input.approverRoleLabel}: ${input.approverName} | ${input.remark}`,
  });
}

export async function approveIdentityCardAtStage(input: {
  submissionId: string;
  stageNumber: number;
  nextStage: number;
  markApproved: boolean;
  recommendationText: string;
  approverWorkflowUserId?: string;
  approverName?: string;
}) {
  return approveStage({
    submissionId: input.submissionId,
    stageNumber: input.stageNumber,
    nextStage: input.nextStage,
    markApproved: input.markApproved,
    recommendationText: input.recommendationText,
    actorUserId: input.approverWorkflowUserId,
    actorName: input.approverName,
  });
}

export async function rejectIdentityCardAtStage(input: {
  submissionId: string;
  stageNumber: number;
  recommendationText: string;
  approverWorkflowUserId?: string;
}) {
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: input.stageNumber,
    recommendationText: input.recommendationText,
    actorUserId: input.approverWorkflowUserId,
  });
}

export async function resolveWorkflowUserIdForActor(input: {
  email: string;
  fullName: string | null;
  role: AppRole | null;
}) {
  return ensureWorkflowUser({
    email: input.email,
    fullName: input.fullName,
    appRole: input.role,
  });
}
