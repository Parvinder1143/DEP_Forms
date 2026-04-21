import { getPgPool } from "@/lib/db";
import type { AppRole } from "@/lib/mock-db";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getNextStage, getWorkflow } from "@/lib/workflow-engine";

export type HostelUndertakingStageApproval = {
  stageNumber: number;
  stageName: string;
  decision: "pending" | "approved" | "rejected" | "forwarded";
  recommendationText: string | null;
  decidedAt: Date | null;
};

export type HostelUndertakingGuardianRecord = {
  id: string;
  guardianType: "parent" | "local_guardian";
  relationship: string | null;
  officeAddressLine1: string | null;
  officeAddressLine2: string | null;
  officeMobile: string | null;
  officeTelephone: string | null;
  officeEmail: string | null;
  residenceAddressLine1: string | null;
  residenceAddressLine2: string | null;
  residenceMobile: string | null;
  residenceTelephone: string | null;
  residenceEmail: string | null;
};

export type HostelUndertakingAttachmentRecord = {
  id: string;
  documentType: "passport_photo" | "supporting_document";
  filePath: string;
  originalFilename: string;
  mimeType: string | null;
};

export type HostelUndertakingFormRecord = {
  submissionId: string;
  submittedById: string;
  submittedByEmail: string;
  createdAt: Date;
  updatedAt: Date;
  currentStage: number;
  overallStatus: string;
  studentName: string;
  entryNumber: string;
  courseName: string;
  department: string;
  hostelRoomNo: string | null;
  emailAddress: string | null;
  dateOfJoining: Date;
  hefAmount: number | null;
  messSecurity: number | null;
  messAdmissionFee: number | null;
  messCharges: number | null;
  bloodGroup: string | null;
  category: string | null;
  emergencyContactNo: string | null;
  declarationDate: Date | null;
  undertakingAcceptedAt: Date | null;
  approvals: HostelUndertakingStageApproval[];
  guardians: HostelUndertakingGuardianRecord[];
  attachments: HostelUndertakingAttachmentRecord[];
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
    case "HOSTEL_WARDEN":
      return "hostel_warden";
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

function parseMetadata(metadata: unknown): { studentName: string; entryNumber: string } {
  const safe = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  return {
    studentName: typeof safe.studentName === "string" ? safe.studentName : "-",
    entryNumber: typeof safe.entryNumber === "string" ? safe.entryNumber : "-",
  };
}

async function getApprovalsBySubmissionIds(submissionIds: string[]) {
  const pool = getPgPool();
  if (!pool || submissionIds.length === 0) {
    return new Map<string, HostelUndertakingStageApproval[]>();
  }

  const result = await pool.query(
    `
    SELECT submission_id, stage_number, stage_name, decision, recommendation_text, decided_at
    FROM approval_stages
    WHERE submission_id = ANY($1::uuid[])
    ORDER BY stage_number ASC
  `,
    [submissionIds]
  );

  const map = new Map<string, HostelUndertakingStageApproval[]>();
  for (const row of result.rows) {
    const key = String(row.submission_id);
    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)?.push({
      stageNumber: Number(row.stage_number),
      stageName: String(row.stage_name),
      decision: String(row.decision) as HostelUndertakingStageApproval["decision"],
      recommendationText: row.recommendation_text ? String(row.recommendation_text) : null,
      decidedAt: row.decided_at ? new Date(row.decided_at) : null,
    });
  }

  return map;
}

async function getGuardiansBySubmissionIds(submissionIds: string[]) {
  const pool = getPgPool();
  if (!pool || submissionIds.length === 0) {
    return new Map<string, HostelUndertakingGuardianRecord[]>();
  }

  const result = await pool.query(
    `
    SELECT
      hud.submission_id,
      gd.id,
      gd.guardian_type,
      gd.relationship,
      gd.office_address_line1,
      gd.office_address_line2,
      gd.office_mobile,
      gd.office_telephone,
      gd.office_email,
      gd.residence_address_line1,
      gd.residence_address_line2,
      gd.residence_mobile,
      gd.residence_telephone,
      gd.residence_email
    FROM guardian_details gd
    JOIN hostel_undertaking_data hud ON hud.id = gd.hostel_submission_id
    WHERE hud.submission_id = ANY($1::uuid[])
    ORDER BY gd.guardian_type ASC, gd.id ASC
  `,
    [submissionIds]
  );

  const map = new Map<string, HostelUndertakingGuardianRecord[]>();
  for (const row of result.rows) {
    const key = String(row.submission_id);
    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)?.push({
      id: String(row.id),
      guardianType: String(row.guardian_type) as "parent" | "local_guardian",
      relationship: row.relationship ? String(row.relationship) : null,
      officeAddressLine1: row.office_address_line1 ? String(row.office_address_line1) : null,
      officeAddressLine2: row.office_address_line2 ? String(row.office_address_line2) : null,
      officeMobile: row.office_mobile ? String(row.office_mobile) : null,
      officeTelephone: row.office_telephone ? String(row.office_telephone) : null,
      officeEmail: row.office_email ? String(row.office_email) : null,
      residenceAddressLine1: row.residence_address_line1 ? String(row.residence_address_line1) : null,
      residenceAddressLine2: row.residence_address_line2 ? String(row.residence_address_line2) : null,
      residenceMobile: row.residence_mobile ? String(row.residence_mobile) : null,
      residenceTelephone: row.residence_telephone ? String(row.residence_telephone) : null,
      residenceEmail: row.residence_email ? String(row.residence_email) : null,
    });
  }

  return map;
}

async function getAttachmentsBySubmissionIds(submissionIds: string[]) {
  const pool = getPgPool();
  if (!pool || submissionIds.length === 0) {
    return new Map<string, HostelUndertakingAttachmentRecord[]>();
  }

  const result = await pool.query(
    `
    SELECT submission_id, id, document_type, file_path, original_filename, mime_type
    FROM documents
    WHERE submission_id = ANY($1::uuid[])
      AND document_type = ANY($2::document_type[])
    ORDER BY uploaded_at ASC
  `,
    [submissionIds, ["passport_photo", "supporting_document"]]
  );

  const map = new Map<string, HostelUndertakingAttachmentRecord[]>();
  for (const row of result.rows) {
    const key = String(row.submission_id);
    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)?.push({
      id: String(row.id),
      documentType: String(row.document_type) as "passport_photo" | "supporting_document",
      filePath: String(row.file_path),
      originalFilename: String(row.original_filename),
      mimeType: row.mime_type ? String(row.mime_type) : null,
    });
  }

  return map;
}

function combineRecords(
  rows: Array<Record<string, unknown>>,
  approvalsMap: Map<string, HostelUndertakingStageApproval[]>,
  guardiansMap: Map<string, HostelUndertakingGuardianRecord[]>,
  attachmentsMap: Map<string, HostelUndertakingAttachmentRecord[]>
) {
  return rows.map((row) => {
    const submissionId = String(row.submission_id);
    const metadataParsed = parseMetadata(row.metadata);

    return {
      submissionId,
      submittedById: String(row.submitted_by),
      submittedByEmail: String(row.submitted_by_email),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
      currentStage: Number(row.current_stage),
      overallStatus: String(row.overall_status),
      studentName: metadataParsed.studentName,
      entryNumber: metadataParsed.entryNumber,
      courseName: String(row.course_name),
      department: String(row.department),
      hostelRoomNo: row.hostel_room_no ? String(row.hostel_room_no) : null,
      emailAddress: row.email_address ? String(row.email_address) : null,
      dateOfJoining: new Date(String(row.date_of_joining)),
      hefAmount: row.hef_amount === null || row.hef_amount === undefined ? null : Number(row.hef_amount),
      messSecurity:
        row.mess_security === null || row.mess_security === undefined ? null : Number(row.mess_security),
      messAdmissionFee:
        row.mess_admission_fee === null || row.mess_admission_fee === undefined
          ? null
          : Number(row.mess_admission_fee),
      messCharges: row.mess_charges === null || row.mess_charges === undefined ? null : Number(row.mess_charges),
      bloodGroup: row.blood_group ? String(row.blood_group) : null,
      category: row.category ? String(row.category) : null,
      emergencyContactNo: row.emergency_contact_no ? String(row.emergency_contact_no) : null,
      declarationDate: row.declaration_date ? new Date(String(row.declaration_date)) : null,
      undertakingAcceptedAt: row.undertaking_accepted_at
        ? new Date(String(row.undertaking_accepted_at))
        : null,
      approvals: approvalsMap.get(submissionId) ?? [],
      guardians: guardiansMap.get(submissionId) ?? [],
      attachments: attachmentsMap.get(submissionId) ?? [],
    } satisfies HostelUndertakingFormRecord;
  });
}

export async function createHostelUndertakingForm(input: {
  submitter: {
    id: string;
    email: string;
    fullName: string | null;
    role: AppRole | null;
  };
  studentName: string;
  entryNumber: string;
  courseName: string;
  department: string;
  hostelRoomNo: string | null;
  emailAddress: string | null;
  dateOfJoining: string;
  hefAmount: string | null;
  messSecurity: string | null;
  messAdmissionFee: string | null;
  messCharges: string | null;
  bloodGroup: string | null;
  category: string | null;
  emergencyContactNo: string | null;
  declarationDate: string | null;
  parentGuardian: {
    relationship: string;
    officeAddressLine1: string | null;
    officeAddressLine2: string | null;
    officeMobile: string | null;
    officeTelephone: string | null;
    officeEmail: string | null;
    residenceAddressLine1: string | null;
    residenceAddressLine2: string | null;
    residenceMobile: string | null;
    residenceTelephone: string | null;
    residenceEmail: string | null;
  };
  localGuardian: {
    relationship: string | null;
    officeAddressLine1: string | null;
    officeAddressLine2: string | null;
    officeMobile: string | null;
    officeTelephone: string | null;
    officeEmail: string | null;
    residenceAddressLine1: string | null;
    residenceAddressLine2: string | null;
    residenceMobile: string | null;
    residenceTelephone: string | null;
    residenceEmail: string | null;
  };
  attachments: {
    passportPhoto: UploadAttachmentInput;
    parentSignatureDoc: UploadAttachmentInput;
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
        'hostel_undertaking'::form_type,
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
          studentName: input.studentName,
          entryNumber: input.entryNumber,
        }),
      ]
    );

    const submissionId = String(submission.rows[0].id);

    const undertaking = await client.query(
      `
      INSERT INTO hostel_undertaking_data (
        submission_id,
        course_name,
        department,
        hostel_room_no,
        email_address,
        date_of_joining,
        hef_amount,
        mess_security,
        mess_admission_fee,
        mess_charges,
        blood_group,
        category,
        emergency_contact_no,
        undertaking_accepted_at,
        declaration_date
      )
      VALUES (
        $1::uuid, $2, $3, $4, $5, $6::date,
        $7::numeric, $8::numeric, $9::numeric, $10::numeric,
        $11, $12, $13, NOW(), $14::date
      )
      RETURNING id
    `,
      [
        submissionId,
        input.courseName,
        input.department,
        input.hostelRoomNo,
        input.emailAddress,
        input.dateOfJoining,
        input.hefAmount,
        input.messSecurity,
        input.messAdmissionFee,
        input.messCharges,
        input.bloodGroup,
        input.category,
        input.emergencyContactNo,
        input.declarationDate,
      ]
    );

    const undertakingId = String(undertaking.rows[0].id);

    await client.query(
      `
      INSERT INTO guardian_details (
        hostel_submission_id,
        guardian_type,
        relationship,
        office_address_line1,
        office_address_line2,
        office_mobile,
        office_telephone,
        office_email,
        residence_address_line1,
        residence_address_line2,
        residence_mobile,
        residence_telephone,
        residence_email
      )
      VALUES (
        $1::uuid,
        'parent'::guardian_type,
        $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12
      )
    `,
      [
        undertakingId,
        input.parentGuardian.relationship,
        input.parentGuardian.officeAddressLine1,
        input.parentGuardian.officeAddressLine2,
        input.parentGuardian.officeMobile,
        input.parentGuardian.officeTelephone,
        input.parentGuardian.officeEmail,
        input.parentGuardian.residenceAddressLine1,
        input.parentGuardian.residenceAddressLine2,
        input.parentGuardian.residenceMobile,
        input.parentGuardian.residenceTelephone,
        input.parentGuardian.residenceEmail,
      ]
    );

    const hasLocalGuardian = Boolean(
      input.localGuardian.relationship ||
        input.localGuardian.officeAddressLine1 ||
        input.localGuardian.residenceAddressLine1 ||
        input.localGuardian.officeMobile ||
        input.localGuardian.residenceMobile
    );

    if (hasLocalGuardian) {
      await client.query(
        `
        INSERT INTO guardian_details (
          hostel_submission_id,
          guardian_type,
          relationship,
          office_address_line1,
          office_address_line2,
          office_mobile,
          office_telephone,
          office_email,
          residence_address_line1,
          residence_address_line2,
          residence_mobile,
          residence_telephone,
          residence_email
        )
        VALUES (
          $1::uuid,
          'local_guardian'::guardian_type,
          $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12
        )
      `,
        [
          undertakingId,
          input.localGuardian.relationship,
          input.localGuardian.officeAddressLine1,
          input.localGuardian.officeAddressLine2,
          input.localGuardian.officeMobile,
          input.localGuardian.officeTelephone,
          input.localGuardian.officeEmail,
          input.localGuardian.residenceAddressLine1,
          input.localGuardian.residenceAddressLine2,
          input.localGuardian.residenceMobile,
          input.localGuardian.residenceTelephone,
          input.localGuardian.residenceEmail,
        ]
      );
    }

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
      VALUES ($1::uuid, 1, 'Hostel Warden Acknowledgement', 'hostel_warden'::user_role, 'pending'::stage_decision, FALSE)
    `,
      [submissionId]
    );

    const uploadDirAbsolute = path.join(process.cwd(), "public", "uploads", "hostel-undertaking", submissionId);
    await mkdir(uploadDirAbsolute, { recursive: true });

    const attachmentRows: Array<{
      documentType: "passport_photo" | "supporting_document";
      payload: UploadAttachmentInput;
    }> = [
      {
        documentType: "passport_photo",
        payload: input.attachments.passportPhoto,
      },
      {
        documentType: "supporting_document",
        payload: input.attachments.parentSignatureDoc,
      },
    ];

    let parentSignatureDocumentId: string | null = null;

    for (const attachment of attachmentRows) {
      const safeFileName = sanitizeFileName(attachment.payload.fileName);
      const ext = getAttachmentExtension(safeFileName);
      const finalFileName = `${attachment.documentType}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${ext}`;

      const absoluteFilePath = path.join(uploadDirAbsolute, finalFileName);
      const publicFilePath = `/uploads/hostel-undertaking/${submissionId}/${finalFileName}`;

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
          attachment.documentType,
          publicFilePath,
          safeFileName,
          attachment.payload.buffer.length,
          attachment.payload.mimeType,
          workflowUserId,
        ]
      );

      if (attachment.documentType === "supporting_document") {
        parentSignatureDocumentId = String(insertedDoc.rows[0].id);
      }
    }

    if (parentSignatureDocumentId) {
      await client.query(
        `
        UPDATE hostel_undertaking_data
        SET parent_signature_doc_id = $2::uuid
        WHERE id = $1::uuid
      `,
        [undertakingId, parentSignatureDocumentId]
      );
    }

    await client.query("COMMIT");
    return submissionId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listFormsByWhere(whereClause: string, values: unknown[] = []) {
  const pool = getPgPool();
  if (!pool) {
    return [] as HostelUndertakingFormRecord[];
  }

  const result = await pool.query(
    `
    SELECT
      fs.id AS submission_id,
      fs.submitted_by,
      fs.current_stage,
      fs.overall_status,
      fs.metadata,
      fs.created_at,
      fs.updated_at,
      u.email AS submitted_by_email,
      hud.course_name,
      hud.department,
      hud.hostel_room_no,
      hud.email_address,
      hud.date_of_joining,
      hud.hef_amount,
      hud.mess_security,
      hud.mess_admission_fee,
      hud.mess_charges,
      hud.blood_group,
      hud.category,
      hud.emergency_contact_no,
      hud.declaration_date,
      hud.undertaking_accepted_at
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN hostel_undertaking_data hud ON hud.submission_id = fs.id
    WHERE fs.form_type = 'hostel_undertaking'::form_type
      ${whereClause}
    ORDER BY fs.created_at DESC
  `,
    values
  );

  const ids = result.rows.map((row) => String(row.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const guardiansMap = await getGuardiansBySubmissionIds(ids);
  const attachmentsMap = await getAttachmentsBySubmissionIds(ids);

  return combineRecords(result.rows, approvalsMap, guardiansMap, attachmentsMap);
}

export async function listHostelUndertakingFormsForStage(stageNumber: number) {
  return listFormsByWhere(
    "AND fs.current_stage = $1 AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)",
    [stageNumber]
  );
}

export async function listActionableHostelUndertakingForms(userRole: string) {
  const pool = getPgPool();
  if (!pool) {
    return [] as HostelUndertakingFormRecord[];
  }

  // Find user stages mathematically via JSON blueprint mapping mapping to current_stage
  const result = await pool.query(
    `
    WITH user_stages AS (
      SELECT workflow.stage_element->>'stage' AS stage_num
      FROM app_workflows w,
           jsonb_array_elements(w.stages) AS workflow(stage_element)
      WHERE w.id = 'hostel-undertaking'
        AND string_to_array(workflow.stage_element->>'role', ',') @> ARRAY[$1]::text[]
    )
    SELECT
      fs.id AS submission_id,
      fs.submitted_by,
      fs.current_stage,
      fs.overall_status,
      fs.metadata,
      fs.created_at,
      fs.updated_at,
      u.email AS submitted_by_email,
      hud.course_name,
      hud.department,
      hud.hostel_room_no,
      hud.email_address,
      hud.date_of_joining,
      hud.hef_amount,
      hud.mess_security,
      hud.mess_admission_fee,
      hud.mess_charges,
      hud.blood_group,
      hud.category,
      hud.emergency_contact_no,
      hud.declaration_date,
      hud.undertaking_accepted_at
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN hostel_undertaking_data hud ON hud.submission_id = fs.id
    WHERE fs.form_type = 'hostel_undertaking'::form_type
      AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)
      AND fs.current_stage::text IN (SELECT stage_num FROM user_stages)
    ORDER BY fs.created_at ASC
  `,
    [userRole]
  );

  const ids = result.rows.map((row) => String(row.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const guardiansMap = await getGuardiansBySubmissionIds(ids);
  const attachmentsMap = await getAttachmentsBySubmissionIds(ids);

  return combineRecords(result.rows, approvalsMap, guardiansMap, attachmentsMap);
}

export async function listHostelUndertakingCompletedForms() {
  return listFormsByWhere(
    "AND fs.overall_status IN ('approved'::submission_status, 'rejected'::submission_status)"
  );
}

export async function listHostelUndertakingOngoingForms() {
  return listFormsByWhere(
    "AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)"
  );
}

export async function listHostelUndertakingFormsBySubmitterEmail(email: string) {
  return listFormsByWhere("AND lower(u.email) = lower($1)", [email]);
}

export async function listHostelUndertakingFormsForAdmin() {
  return listFormsByWhere("");
}

export async function getHostelUndertakingFormById(submissionId: string) {
  const rows = await listFormsByWhere("AND fs.id = $1::uuid", [submissionId]);
  return rows[0] ?? null;
}

async function approveStage(input: {
  submissionId: string;
  stageNumber: number;
  recommendationText: string;
  nextStage: number;
  markApproved: boolean;
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
      throw new Error("Hostel undertaking form not found.");
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
      throw new Error("Hostel undertaking form not found.");
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

export async function approveHostelUndertakingByWarden(input: {
  submissionId: string;
  approverName: string;
  remark: string;
  approverRoleLabel?: string;
}) {
  const roleLabel = (input.approverRoleLabel ?? "Hostel Warden").trim();
  const workflow = await getWorkflow("hostel-undertaking");
  if (!workflow) {
    throw new Error("Hostel Undertaking workflow blueprint not found in database.");
  }

  const nextStage = getNextStage(workflow, 1);

  return approveStage({
    submissionId: input.submissionId,
    stageNumber: 1,
    nextStage: nextStage ?? 1,
    markApproved: nextStage === null,
    recommendationText: `${roleLabel}: ${input.approverName} | ${input.remark}`,
  });
}

export async function rejectHostelUndertakingByWarden(input: {
  submissionId: string;
  approverName: string;
  remark: string;
  approverRoleLabel?: string;
}) {
  const roleLabel = (input.approverRoleLabel ?? "Hostel Warden").trim();
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: 1,
    recommendationText: `Rejected by ${roleLabel}: ${input.approverName} | ${input.remark}`,
  });
}

export async function approveHostelUndertakingAtStage(input: {
  submissionId: string;
  stageNumber: number;
  nextStage: number;
  markApproved: boolean;
  recommendationText: string;
}) {
  return approveStage({
    submissionId: input.submissionId,
    stageNumber: input.stageNumber,
    nextStage: input.nextStage,
    markApproved: input.markApproved,
    recommendationText: input.recommendationText,
  });
}

export async function rejectHostelUndertakingAtStage(input: {
  submissionId: string;
  stageNumber: number;
  recommendationText: string;
}) {
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: input.stageNumber,
    recommendationText: input.recommendationText,
  });
}
