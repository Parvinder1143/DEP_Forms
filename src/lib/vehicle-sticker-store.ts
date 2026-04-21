import { getPgPool } from "@/lib/db";
import type { AppRole } from "@/lib/mock-db";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type VehicleStickerStageApproval = {
  stageNumber: number;
  stageName: string;
  decision: "pending" | "approved" | "rejected" | "forwarded";
  recommendationText: string | null;
  decidedAt: Date | null;
};

export type VehicleDetailRecord = {
  serialNo: number;
  registrationNo: string;
  vehicleType: "2W" | "4W";
  makeModel: string;
  colour: string;
};

export type VehicleStickerFormRecord = {
  submissionId: string;
  submittedById: string;
  submittedByEmail: string;
  createdAt: Date;
  updatedAt: Date;
  currentStage: number;
  overallStatus: string;
  entryOrEmpNo: string | null;
  address: string;
  phone: string | null;
  emailContact: string | null;
  drivingLicenseNo: string;
  dlValidUpto: Date;
  declarationDate: Date | null;
  residingInHostel: boolean | null;
  issuedStickerNo: string | null;
  stickerValidUpto: Date | null;
  securityIssueDate: Date | null;
  vehicleDetails: VehicleDetailRecord[];
  approvals: VehicleStickerStageApproval[];
  applicantName: string;
  department: string;
  designation: string;
};

export type VehicleStickerAttachmentType =
  | "passport_photo"
  | "vehicle_rc"
  | "driving_license"
  | "college_id";

export type VehicleStickerAttachmentRecord = {
  id: string;
  documentType: VehicleStickerAttachmentType;
  filePath: string;
  originalFilename: string;
  mimeType: string | null;
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
    case "SUPERVISOR":
      return "supervisor";
    case "HOD":
      return "hod";
    case "STUDENT_AFFAIRS_HOSTEL_MGMT":
      return "student_affairs_ar";
    case "SECURITY_OFFICE":
      return "security_officer";
    case "IT_ADMIN":
      return "it_admin";
    case "FORWARDING_AUTHORITY_ACADEMICS":
    case "ESTABLISHMENT":
    case "FORWARDING_AUTHORITY_R_AND_D":
      return "forwarding_authority";
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

function parseApplicantFromMetadata(metadata: unknown): {
  applicantName: string;
  department: string;
  designation: string;
} {
  const safe = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  return {
    applicantName: typeof safe.applicantName === "string" ? safe.applicantName : "-",
    department: typeof safe.department === "string" ? safe.department : "-",
    designation: typeof safe.designation === "string" ? safe.designation : "-",
  };
}

async function getApprovalsBySubmissionIds(submissionIds: string[]) {
  const pool = getPgPool();
  if (!pool || submissionIds.length === 0) {
    return new Map<string, VehicleStickerStageApproval[]>();
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

  const map = new Map<string, VehicleStickerStageApproval[]>();
  for (const row of approvals.rows) {
    const key = String(row.submission_id);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push({
      stageNumber: Number(row.stage_number),
      stageName: String(row.stage_name),
      decision: String(row.decision) as VehicleStickerStageApproval["decision"],
      recommendationText: row.recommendation_text ? String(row.recommendation_text) : null,
      decidedAt: row.decided_at ? new Date(row.decided_at) : null,
    });
  }

  return map;
}

async function getVehicleDetailsBySubmissionIds(submissionIds: string[]) {
  const pool = getPgPool();
  if (!pool || submissionIds.length === 0) {
    return new Map<string, VehicleDetailRecord[]>();
  }

  const details = await pool.query(
    `
    SELECT
      vsd.submission_id,
      vd.serial_no,
      vd.registration_no,
      vd.vehicle_type,
      vd.make_model,
      vd.colour
    FROM vehicle_details vd
    JOIN vehicle_sticker_data vsd ON vd.vehicle_sticker_id = vsd.id
    WHERE vsd.submission_id = ANY($1::uuid[])
    ORDER BY vd.serial_no ASC
  `,
    [submissionIds]
  );

  const map = new Map<string, VehicleDetailRecord[]>();
  for (const row of details.rows) {
    const key = String(row.submission_id);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push({
      serialNo: Number(row.serial_no),
      registrationNo: String(row.registration_no),
      vehicleType: String(row.vehicle_type) as "2W" | "4W",
      makeModel: String(row.make_model),
      colour: String(row.colour),
    });
  }

  return map;
}

function combineRecords(rows: Array<Record<string, unknown>>, approvalsMap: Map<string, VehicleStickerStageApproval[]>, detailsMap: Map<string, VehicleDetailRecord[]>) {
  return rows.map((row) => {
    const submissionId = String(row.submission_id);
    const metadataParsed = parseApplicantFromMetadata(row.metadata);

    return {
      submissionId,
      submittedById: String(row.submitted_by),
      submittedByEmail: String(row.submitted_by_email),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
      currentStage: Number(row.current_stage),
      overallStatus: String(row.overall_status),
      entryOrEmpNo: row.entry_or_emp_no ? String(row.entry_or_emp_no) : null,
      address: String(row.address),
      phone: row.phone ? String(row.phone) : null,
      emailContact: row.email_contact ? String(row.email_contact) : null,
      drivingLicenseNo: String(row.driving_license_no),
      dlValidUpto: new Date(String(row.dl_valid_upto)),
      declarationDate: row.declaration_date ? new Date(String(row.declaration_date)) : null,
      residingInHostel:
        row.residing_in_hostel === null || row.residing_in_hostel === undefined
          ? null
          : Boolean(row.residing_in_hostel),
      issuedStickerNo: row.issued_sticker_no ? String(row.issued_sticker_no) : null,
      stickerValidUpto: row.sticker_valid_upto ? new Date(String(row.sticker_valid_upto)) : null,
      securityIssueDate: row.security_issue_date ? new Date(String(row.security_issue_date)) : null,
      approvals: approvalsMap.get(submissionId) ?? [],
      vehicleDetails: detailsMap.get(submissionId) ?? [],
      applicantName: metadataParsed.applicantName,
      department: metadataParsed.department,
      designation: metadataParsed.designation,
    } satisfies VehicleStickerFormRecord;
  });
}

export async function createVehicleStickerForm(input: {
  submitter: {
    id: string;
    email: string;
    fullName: string | null;
    role: AppRole | null;
  };
  applicantName: string;
  designation: string;
  department: string;
  entryOrEmpNo: string;
  address: string;
  phone: string;
  emailContact: string;
  drivingLicenseNo: string;
  dlValidUpto: string;
  declarationDate: string | null;
  vehicleDetails: VehicleDetailRecord[];
  attachments: {
    applicantPhoto: UploadAttachmentInput;
    vehicleRc: UploadAttachmentInput;
    drivingLicenseDoc: UploadAttachmentInput;
    collegeIdDoc: UploadAttachmentInput;
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
        'vehicle_sticker'::form_type,
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
          applicantName: input.applicantName,
          department: input.department,
          designation: input.designation,
        }),
      ]
    );

    const submissionId = String(submission.rows[0].id);

    const sticker = await client.query(
      `
      INSERT INTO vehicle_sticker_data (
        submission_id,
        entry_or_emp_no,
        address,
        phone,
        email_contact,
        driving_license_no,
        dl_valid_upto,
        declaration_date
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::date, $8::date)
      RETURNING id
    `,
      [
        submissionId,
        input.entryOrEmpNo || null,
        input.address,
        input.phone || null,
        input.emailContact || null,
        input.drivingLicenseNo,
        input.dlValidUpto,
        input.declarationDate,
      ]
    );

    const vehicleStickerId = String(sticker.rows[0].id);

    for (const detail of input.vehicleDetails) {
      await client.query(
        `
        INSERT INTO vehicle_details (
          vehicle_sticker_id,
          serial_no,
          registration_no,
          vehicle_type,
          make_model,
          colour
        )
        VALUES ($1::uuid, $2, $3, $4::vehicle_type, $5, $6)
      `,
        [
          vehicleStickerId,
          detail.serialNo,
          detail.registrationNo,
          detail.vehicleType,
          detail.makeModel,
          detail.colour,
        ]
      );
    }

    const stageRows = [
      [1, "Supervisor Recommendation", "supervisor"],
      [2, "HoD Recommendation", "hod"],
      [3, "Student Affairs", "student_affairs_ar"],
      [4, "Security Office Issuance", "security_officer"],
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
        VALUES ($1::uuid, $2, $3, $4::user_role, 'pending'::stage_decision, TRUE)
      `,
        [submissionId, stage[0], stage[1], stage[2]]
      );
    }

    const uploadDirAbsolute = path.join(
      process.cwd(),
      "public",
      "uploads",
      "vehicle-sticker",
      submissionId
    );
    await mkdir(uploadDirAbsolute, { recursive: true });

    const attachmentRows: Array<{
      documentType: VehicleStickerAttachmentType;
      payload: UploadAttachmentInput;
    }> = [
      {
        documentType: "passport_photo",
        payload: input.attachments.applicantPhoto,
      },
      {
        documentType: "vehicle_rc",
        payload: input.attachments.vehicleRc,
      },
      {
        documentType: "driving_license",
        payload: input.attachments.drivingLicenseDoc,
      },
      {
        documentType: "college_id",
        payload: input.attachments.collegeIdDoc,
      },
    ];

    for (const attachment of attachmentRows) {
      const safeFileName = sanitizeFileName(attachment.payload.fileName);
      const ext = getAttachmentExtension(safeFileName);
      const finalFileName = `${attachment.documentType}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${ext}`;

      const absoluteFilePath = path.join(uploadDirAbsolute, finalFileName);
      const publicFilePath = `/uploads/vehicle-sticker/${submissionId}/${finalFileName}`;

      await writeFile(absoluteFilePath, attachment.payload.buffer);

      await client.query(
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

import { getNextStage, getWorkflow, getStagesForRole } from "@/lib/workflow-engine";

export async function listActionableVehicleStickerForms(activeRole: AppRole, department?: string | null) {
  const pool = getPgPool();
  if (!pool) return [];

  const workflow = await getWorkflow("vehicle-sticker");
  if (!workflow) return [];

  const validStages = getStagesForRole(workflow, activeRole);
  if (validStages.length === 0) return [];

  const placeholders = validStages.map((_, i) => `$${i + 1}`).join(", ");
  const params: unknown[] = [...validStages];

  let whereClause = `
    WHERE fs.form_type = 'vehicle_sticker'::form_type
      AND fs.current_stage IN (${placeholders})
      AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)
  `;

  if (department) {
    params.push(department);
    whereClause += ` AND fs.metadata->>'department' = $${params.length}`;
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
      vsd.entry_or_emp_no,
      vsd.address,
      vsd.phone,
      vsd.email_contact,
      vsd.driving_license_no,
      vsd.dl_valid_upto,
      vsd.declaration_date,
      vsd.residing_in_hostel,
      vsd.issued_sticker_no,
      vsd.sticker_valid_upto,
      vsd.security_issue_date
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN vehicle_sticker_data vsd ON vsd.submission_id = fs.id
    ${whereClause}
    ORDER BY fs.created_at DESC
  `,
    params
  );

  const ids = result.rows.map((r) => String(r.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const detailsMap = await getVehicleDetailsBySubmissionIds(ids);
  return combineRecords(result.rows, approvalsMap, detailsMap);
}

export async function listVehicleStickerFormsForStage(stageNumber: number, department?: string | null) {
  const pool = getPgPool();
  if (!pool) {
    return [] as VehicleStickerFormRecord[];
  }

  const params: unknown[] = [stageNumber];
  let whereClause = `
    WHERE fs.form_type = 'vehicle_sticker'::form_type
      AND fs.current_stage = $1
      AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)
  `;

  if (department) {
    params.push(department);
    whereClause += ` AND fs.metadata->>'department' = $${params.length}`;
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
      vsd.entry_or_emp_no,
      vsd.address,
      vsd.phone,
      vsd.email_contact,
      vsd.driving_license_no,
      vsd.dl_valid_upto,
      vsd.declaration_date,
      vsd.residing_in_hostel,
      vsd.issued_sticker_no,
      vsd.sticker_valid_upto,
      vsd.security_issue_date
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN vehicle_sticker_data vsd ON vsd.submission_id = fs.id
    ${whereClause}
    ORDER BY fs.created_at DESC
  `,
    params
  );

  const ids = result.rows.map((r) => String(r.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const detailsMap = await getVehicleDetailsBySubmissionIds(ids);
  return combineRecords(result.rows, approvalsMap, detailsMap);
}

export async function listVehicleStickerFormsForAdmin() {
  const pool = getPgPool();
  if (!pool) {
    return [] as VehicleStickerFormRecord[];
  }

  const result = await pool.query(`
    SELECT
      fs.id AS submission_id,
      fs.submitted_by,
      fs.current_stage,
      fs.overall_status,
      fs.metadata,
      fs.created_at,
      fs.updated_at,
      u.email AS submitted_by_email,
      vsd.entry_or_emp_no,
      vsd.address,
      vsd.phone,
      vsd.email_contact,
      vsd.driving_license_no,
      vsd.dl_valid_upto,
      vsd.declaration_date,
      vsd.residing_in_hostel,
      vsd.issued_sticker_no,
      vsd.sticker_valid_upto,
      vsd.security_issue_date
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN vehicle_sticker_data vsd ON vsd.submission_id = fs.id
    WHERE fs.form_type = 'vehicle_sticker'::form_type
    ORDER BY fs.created_at DESC
  `);

  const ids = result.rows.map((r) => String(r.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const detailsMap = await getVehicleDetailsBySubmissionIds(ids);
  return combineRecords(result.rows, approvalsMap, detailsMap);
}

export async function listVehicleStickerOngoingForms(department?: string | null) {
  const pool = getPgPool();
  if (!pool) {
    return [] as VehicleStickerFormRecord[];
  }

  const params: unknown[] = [];
  let whereClause = `
    WHERE fs.form_type = 'vehicle_sticker'::form_type
      AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)
  `;

  if (department) {
    params.push(department);
    whereClause += ` AND fs.metadata->>'department' = $${params.length}`;
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
      vsd.entry_or_emp_no,
      vsd.address,
      vsd.phone,
      vsd.email_contact,
      vsd.driving_license_no,
      vsd.dl_valid_upto,
      vsd.declaration_date,
      vsd.residing_in_hostel,
      vsd.issued_sticker_no,
      vsd.sticker_valid_upto,
      vsd.security_issue_date
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN vehicle_sticker_data vsd ON vsd.submission_id = fs.id
    ${whereClause}
    ORDER BY fs.created_at DESC
  `,
    params
  );

  const ids = result.rows.map((r) => String(r.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const detailsMap = await getVehicleDetailsBySubmissionIds(ids);
  return combineRecords(result.rows, approvalsMap, detailsMap);
}

export async function listVehicleStickerCompletedForms(department?: string | null) {
  const pool = getPgPool();
  if (!pool) {
    return [] as VehicleStickerFormRecord[];
  }

  const params: unknown[] = [];
  let whereClause = `
    WHERE fs.form_type = 'vehicle_sticker'::form_type
      AND fs.overall_status = 'approved'::submission_status
  `;

  if (department) {
    params.push(department);
    whereClause += ` AND fs.metadata->>'department' = $${params.length}`;
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
      vsd.entry_or_emp_no,
      vsd.address,
      vsd.phone,
      vsd.email_contact,
      vsd.driving_license_no,
      vsd.dl_valid_upto,
      vsd.declaration_date,
      vsd.residing_in_hostel,
      vsd.issued_sticker_no,
      vsd.sticker_valid_upto,
      vsd.security_issue_date
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN vehicle_sticker_data vsd ON vsd.submission_id = fs.id
    ${whereClause}
    ORDER BY fs.created_at DESC
  `,
    params
  );

  const ids = result.rows.map((r) => String(r.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const detailsMap = await getVehicleDetailsBySubmissionIds(ids);
  return combineRecords(result.rows, approvalsMap, detailsMap);
}

export async function listVehicleStickerFormsBySubmitterEmail(email: string) {
  const pool = getPgPool();
  if (!pool) {
    return [] as VehicleStickerFormRecord[];
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
      vsd.entry_or_emp_no,
      vsd.address,
      vsd.phone,
      vsd.email_contact,
      vsd.driving_license_no,
      vsd.dl_valid_upto,
      vsd.declaration_date,
      vsd.residing_in_hostel,
      vsd.issued_sticker_no,
      vsd.sticker_valid_upto,
      vsd.security_issue_date
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN vehicle_sticker_data vsd ON vsd.submission_id = fs.id
    WHERE fs.form_type = 'vehicle_sticker'::form_type
      AND lower(u.email) = lower($1)
    ORDER BY fs.created_at DESC
  `,
    [email]
  );

  const ids = result.rows.map((r) => String(r.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const detailsMap = await getVehicleDetailsBySubmissionIds(ids);
  return combineRecords(result.rows, approvalsMap, detailsMap);
}

export async function getVehicleStickerFormById(submissionId: string) {
  const pool = getPgPool();
  if (!pool) {
    return null;
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
      vsd.entry_or_emp_no,
      vsd.address,
      vsd.phone,
      vsd.email_contact,
      vsd.driving_license_no,
      vsd.dl_valid_upto,
      vsd.declaration_date,
      vsd.residing_in_hostel,
      vsd.issued_sticker_no,
      vsd.sticker_valid_upto,
      vsd.security_issue_date
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN vehicle_sticker_data vsd ON vsd.submission_id = fs.id
    WHERE fs.id = $1::uuid
      AND fs.form_type = 'vehicle_sticker'::form_type
    LIMIT 1
  `,
    [submissionId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  const approvalsMap = await getApprovalsBySubmissionIds([submissionId]);
  const detailsMap = await getVehicleDetailsBySubmissionIds([submissionId]);
  return combineRecords(result.rows, approvalsMap, detailsMap)[0] ?? null;
}

export async function listVehicleStickerAttachmentsBySubmissionId(submissionId: string) {
  const pool = getPgPool();
  if (!pool) {
    return [] as VehicleStickerAttachmentRecord[];
  }

  const result = await pool.query(
    `
    SELECT
      id,
      document_type,
      file_path,
      original_filename,
      mime_type
    FROM documents
    WHERE submission_id = $1::uuid
      AND document_type = ANY($2::document_type[])
    ORDER BY uploaded_at ASC
  `,
    [submissionId, ["passport_photo", "vehicle_rc", "driving_license", "college_id"]]
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    documentType: String(row.document_type) as VehicleStickerAttachmentType,
    filePath: String(row.file_path),
    originalFilename: String(row.original_filename),
    mimeType: row.mime_type ? String(row.mime_type) : null,
  }));
}

export async function upsertVehicleStickerAttachmentsForSubmission(input: {
  submissionId: string;
  submitter: {
    email: string;
    fullName: string | null;
    role: AppRole | null;
  };
  attachments: {
    applicantPhoto: UploadAttachmentInput;
    vehicleRc: UploadAttachmentInput;
    drivingLicenseDoc: UploadAttachmentInput;
    collegeIdDoc: UploadAttachmentInput;
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

  const exists = await pool.query(
    `
    SELECT id
    FROM form_submissions
    WHERE id = $1::uuid
      AND form_type = 'vehicle_sticker'::form_type
    LIMIT 1
  `,
    [input.submissionId]
  );

  if ((exists.rowCount ?? 0) === 0) {
    throw new Error("Vehicle sticker form not found.");
  }

  const uploadDirAbsolute = path.join(
    process.cwd(),
    "public",
    "uploads",
    "vehicle-sticker",
    input.submissionId
  );
  await mkdir(uploadDirAbsolute, { recursive: true });

  const attachmentRows: Array<{
    documentType: VehicleStickerAttachmentType;
    payload: UploadAttachmentInput;
  }> = [
    {
      documentType: "passport_photo",
      payload: input.attachments.applicantPhoto,
    },
    {
      documentType: "vehicle_rc",
      payload: input.attachments.vehicleRc,
    },
    {
      documentType: "driving_license",
      payload: input.attachments.drivingLicenseDoc,
    },
    {
      documentType: "college_id",
      payload: input.attachments.collegeIdDoc,
    },
  ];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
      DELETE FROM documents
      WHERE submission_id = $1::uuid
        AND document_type = ANY($2::document_type[])
    `,
      [input.submissionId, ["passport_photo", "vehicle_rc", "driving_license", "college_id"]]
    );

    for (const attachment of attachmentRows) {
      const safeFileName = sanitizeFileName(attachment.payload.fileName);
      const ext = getAttachmentExtension(safeFileName);
      const finalFileName = `${attachment.documentType}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${ext}`;

      const absoluteFilePath = path.join(uploadDirAbsolute, finalFileName);
      const publicFilePath = `/uploads/vehicle-sticker/${input.submissionId}/${finalFileName}`;

      await writeFile(absoluteFilePath, attachment.payload.buffer);

      await client.query(
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
      `,
        [
          input.submissionId,
          attachment.documentType,
          publicFilePath,
          safeFileName,
          attachment.payload.buffer.length,
          attachment.payload.mimeType,
          workflowUserId,
        ]
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
      SELECT current_stage, overall_status
      FROM form_submissions
      WHERE id = $1::uuid
      LIMIT 1
    `,
      [input.submissionId]
    );

    if ((row.rowCount ?? 0) === 0) {
      throw new Error("Vehicle sticker form not found.");
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
      SELECT current_stage, overall_status
      FROM form_submissions
      WHERE id = $1::uuid
      LIMIT 1
    `,
      [input.submissionId]
    );

    if ((row.rowCount ?? 0) === 0) {
      throw new Error("Vehicle sticker form not found.");
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

export async function approveVehicleStickerStage1(input: {
  submissionId: string;
  approverName: string;
}) {
  const workflow = await getWorkflow("vehicle-sticker");
  if (!workflow) {
    throw new Error("Vehicle Sticker workflow blueprint not found in database.");
  }
  const nextStage = getNextStage(workflow, 1);

  return approveStage({
    submissionId: input.submissionId,
    stageNumber: 1,
    nextStage: nextStage ?? 1,
    markApproved: nextStage === null,
    recommendationText: `Supervisor: ${input.approverName}`,
  });
}

export async function approveVehicleStickerStage2(input: {
  submissionId: string;
  approverName: string;
  validUpto: string;
}) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  const workflow = await getWorkflow("vehicle-sticker");
  if (!workflow) {
    throw new Error("Vehicle Sticker workflow blueprint not found in database.");
  }
  const nextStage = getNextStage(workflow, 2);

  await approveStage({
    submissionId: input.submissionId,
    stageNumber: 2,
    nextStage: nextStage ?? 2,
    markApproved: nextStage === null,
    recommendationText: `HoD: ${input.approverName}`,
  });

  await pool.query(
    `
    UPDATE vehicle_sticker_data
    SET sticker_valid_upto = $2::date
    WHERE submission_id = $1::uuid
  `,
    [input.submissionId, input.validUpto]
  );
}

export async function approveVehicleStickerStage3(input: {
  submissionId: string;
  approverName: string;
  residingInHostel: boolean;
  recommendationText: string;
}) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  const workflow = await getWorkflow("vehicle-sticker");
  if (!workflow) {
    throw new Error("Vehicle Sticker workflow blueprint not found in database.");
  }
  const nextStage = getNextStage(workflow, 3);

  await approveStage({
    submissionId: input.submissionId,
    stageNumber: 3,
    nextStage: nextStage ?? 3,
    markApproved: nextStage === null,
    recommendationText: `StudentAffairs/Hostel: ${input.approverName} | ${input.recommendationText}`,
  });

  await pool.query(
    `
    UPDATE vehicle_sticker_data
    SET residing_in_hostel = $2,
        hostel_verified_at = NOW()
    WHERE submission_id = $1::uuid
  `,
    [input.submissionId, input.residingInHostel]
  );
}

export async function approveVehicleStickerStage4(input: {
  submissionId: string;
  approverName: string;
  issuedStickerNo: string;
  validUpto: string;
  issueDate: string;
}) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  await approveStage({
    submissionId: input.submissionId,
    stageNumber: 4,
    nextStage: 4,
    markApproved: true,
    recommendationText: `Security Office: ${input.approverName}`,
  });

  await pool.query(
    `
    UPDATE vehicle_sticker_data
    SET issued_sticker_no = $2,
        sticker_valid_upto = $3::date,
        security_issue_date = $4::date,
        security_issued_at = NOW()
    WHERE submission_id = $1::uuid
  `,
    [input.submissionId, input.issuedStickerNo, input.validUpto, input.issueDate]
  );
}

export async function rejectVehicleStickerStage1(input: {
  submissionId: string;
  approverName: string;
  remark: string;
}) {
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: 1,
    recommendationText: `Rejected by Supervisor: ${input.approverName} | ${input.remark}`,
  });
}

export async function rejectVehicleStickerStage2(input: {
  submissionId: string;
  approverName: string;
  remark: string;
}) {
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: 2,
    recommendationText: `Rejected by HoD: ${input.approverName} | ${input.remark}`,
  });
}

export async function rejectVehicleStickerStage3(input: {
  submissionId: string;
  approverName: string;
  remark: string;
}) {
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: 3,
    recommendationText: `Rejected by Student Affairs: ${input.approverName} | ${input.remark}`,
  });
}

export async function rejectVehicleStickerStage4(input: {
  submissionId: string;
  approverName: string;
  remark: string;
}) {
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: 4,
    recommendationText: `Rejected by Security Office: ${input.approverName} | ${input.remark}`,
  });
}

export async function approveVehicleStickerAtStage(input: {
  submissionId: string;
  stageNumber: number;
  nextStage: number;
  markApproved: boolean;
  recommendationText: string;
  issuedStickerNo?: string;
  validUpto?: string;
  issueDate?: string;
}) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  await approveStage({
    submissionId: input.submissionId,
    stageNumber: input.stageNumber,
    nextStage: input.nextStage,
    markApproved: input.markApproved,
    recommendationText: input.recommendationText,
  });

  if (input.validUpto) {
    await pool.query(
      `
      UPDATE vehicle_sticker_data
      SET sticker_valid_upto = $2::date
      WHERE submission_id = $1::uuid
    `,
      [input.submissionId, input.validUpto]
    );
  }

  // If this approval issues the sticker (typically final Security stage), persist issuance metadata.
  if (input.markApproved && input.issuedStickerNo && input.validUpto && input.issueDate) {
    await pool.query(
      `
      UPDATE vehicle_sticker_data
      SET issued_sticker_no = $2,
          sticker_valid_upto = $3::date,
          security_issue_date = $4::date,
          security_issued_at = NOW()
      WHERE submission_id = $1::uuid
    `,
      [input.submissionId, input.issuedStickerNo, input.validUpto, input.issueDate]
    );
  }
}

export async function rejectVehicleStickerAtStage(input: {
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
