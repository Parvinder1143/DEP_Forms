import { randomUUID } from "node:crypto";
import { getPgPool } from "@/lib/db";
import {
  addForwardingApproval as addForwardingApprovalInMemory,
  addIssueApproval as addIssueApprovalInMemory,
  createEmailIdForm as createEmailIdFormInMemory,
  getEmailIdFormById as getEmailIdFormByIdInMemory,
  listEmailIdForms as listEmailIdFormsInMemory,
  listEmailIdFormsBySubmitter as listEmailIdFormsBySubmitterInMemory,
  rejectEmailIdForm as rejectEmailIdFormInMemory,
  type AppRole,
  type EmailIdApprovalRecord,
  type EmailIdFormRecord,
  type EmailIdFormStatus,
  type ForwardingSection,
} from "@/lib/mock-db";

type EmailFormWithApprovals = EmailIdFormRecord & {
  approvals: EmailIdApprovalRecord[];
};

let schemaReady = false;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

function mapFormRow(row: {
  id: string;
  created_at: Date;
  updated_at: Date;
  submitted_by_id: string;
  submitted_by_email: string;
  initials: string;
  first_name: string;
  last_name: string;
  gender: string;
  permanent_address: string;
  org_id: string;
  nature_of_engagement: string;
  role: string;
  department: string;
  project_name: string | null;
  joining_date: Date | null;
  anticipated_end_date: Date | null;
  reporting_officer_name: string | null;
  reporting_officer_email: string | null;
  mobile_no: string;
  alternate_email: string;
  consent_accepted: boolean;
  status: EmailIdFormStatus;
}): EmailIdFormRecord {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    submittedById: row.submitted_by_id,
    submittedByEmail: row.submitted_by_email,
    initials: row.initials,
    firstName: row.first_name,
    lastName: row.last_name,
    gender: row.gender,
    permanentAddress: row.permanent_address,
    orgId: row.org_id,
    natureOfEngagement: row.nature_of_engagement,
    role: row.role,
    department: row.department,
    projectName: row.project_name,
    joiningDate: row.joining_date ? new Date(row.joining_date) : null,
    anticipatedEndDate: row.anticipated_end_date
      ? new Date(row.anticipated_end_date)
      : null,
    reportingOfficerName: row.reporting_officer_name,
    reportingOfficerEmail: row.reporting_officer_email,
    mobileNo: row.mobile_no,
    alternateEmail: row.alternate_email,
    consentAccepted: row.consent_accepted,
    status: row.status,
  };
}

function mapApprovalRow(row: {
  id: string;
  created_at: Date;
  form_id: string;
  stage: number;
  forwarding_section: ForwardingSection | null;
  approver_name: string;
  assigned_email_id: string | null;
  date_of_creation: Date | null;
  tentative_removal_date: Date | null;
  id_created_by: string | null;
}): EmailIdApprovalRecord {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    formId: row.form_id,
    stage: row.stage,
    forwardingSection: row.forwarding_section,
    approverName: row.approver_name,
    assignedEmailId: row.assigned_email_id,
    dateOfCreation: row.date_of_creation ? new Date(row.date_of_creation) : null,
    tentativeRemovalDate: row.tentative_removal_date
      ? new Date(row.tentative_removal_date)
      : null,
    idCreatedBy: row.id_created_by,
  };
}

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  const pool = getPgPool();
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_email_id_forms (
      id TEXT PRIMARY KEY,
      submitted_by_id TEXT NOT NULL,
      submitted_by_email TEXT NOT NULL,
      initials TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      permanent_address TEXT NOT NULL,
      org_id TEXT NOT NULL,
      nature_of_engagement TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      project_name TEXT,
      joining_date DATE,
      anticipated_end_date DATE,
      reporting_officer_name TEXT,
      reporting_officer_email TEXT,
      mobile_no TEXT NOT NULL,
      alternate_email TEXT NOT NULL,
      consent_accepted BOOLEAN NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_email_id_approvals (
      id TEXT PRIMARY KEY,
      form_id TEXT NOT NULL REFERENCES app_email_id_forms(id) ON DELETE CASCADE,
      stage INTEGER NOT NULL,
      forwarding_section TEXT,
      approver_name TEXT NOT NULL,
      assigned_email_id TEXT,
      date_of_creation DATE,
      tentative_removal_date DATE,
      id_created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_app_email_id_forms_submitter ON app_email_id_forms(submitted_by_id);"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_app_email_id_forms_status ON app_email_id_forms(status);"
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_app_email_id_approvals_form ON app_email_id_approvals(form_id);"
  );

  schemaReady = true;
}

async function listApprovalsForForms(formIds: string[]) {
  if (formIds.length === 0) {
    return new Map<string, EmailIdApprovalRecord[]>();
  }

  const pool = getPgPool();
  if (!pool) {
    return new Map<string, EmailIdApprovalRecord[]>();
  }

  const approvalsResult = await pool.query(
    `
    SELECT
      id,
      created_at,
      form_id,
      stage,
      forwarding_section,
      approver_name,
      assigned_email_id,
      date_of_creation,
      tentative_removal_date,
      id_created_by
    FROM app_email_id_approvals
    WHERE form_id = ANY($1)
    ORDER BY stage ASC, created_at ASC
  `,
    [formIds]
  );

  const approvalMap = new Map<string, EmailIdApprovalRecord[]>();
  for (const row of approvalsResult.rows) {
    const approval = mapApprovalRow(
      row as {
        id: string;
        created_at: Date;
        form_id: string;
        stage: number;
        forwarding_section: ForwardingSection | null;
        approver_name: string;
        assigned_email_id: string | null;
        date_of_creation: Date | null;
        tentative_removal_date: Date | null;
        id_created_by: string | null;
      }
    );

    if (!approvalMap.has(approval.formId)) {
      approvalMap.set(approval.formId, []);
    }
    approvalMap.get(approval.formId)?.push(approval);
  }

  return approvalMap;
}

export async function hasIssuedEmailForUser(submittedById: string) {
  if (!hasDatabaseUrl()) {
    const forms = listEmailIdFormsBySubmitterInMemory(submittedById);
    return forms.some((form) => form.status === "ISSUED");
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    const forms = listEmailIdFormsBySubmitterInMemory(submittedById);
    return forms.some((form) => form.status === "ISSUED");
  }

  const result = await pool.query(
    `
    SELECT 1
    FROM app_email_id_forms
    WHERE submitted_by_id = $1 AND status = 'ISSUED'
    LIMIT 1
  `,
    [submittedById]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function createEmailIdForm(
  input: Omit<EmailIdFormRecord, "id" | "createdAt" | "updatedAt" | "status">
) {
  if (!hasDatabaseUrl()) {
    return createEmailIdFormInMemory(input);
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    return createEmailIdFormInMemory(input);
  }

  const id = `frm_${randomUUID()}`;

  const inserted = await pool.query(
    `
    INSERT INTO app_email_id_forms (
      id,
      submitted_by_id,
      submitted_by_email,
      initials,
      first_name,
      last_name,
      gender,
      permanent_address,
      org_id,
      nature_of_engagement,
      role,
      department,
      project_name,
      joining_date,
      anticipated_end_date,
      reporting_officer_name,
      reporting_officer_email,
      mobile_no,
      alternate_email,
      consent_accepted,
      status
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'PENDING'
    )
    RETURNING
      id,
      created_at,
      updated_at,
      submitted_by_id,
      submitted_by_email,
      initials,
      first_name,
      last_name,
      gender,
      permanent_address,
      org_id,
      nature_of_engagement,
      role,
      department,
      project_name,
      joining_date,
      anticipated_end_date,
      reporting_officer_name,
      reporting_officer_email,
      mobile_no,
      alternate_email,
      consent_accepted,
      status
  `,
    [
      id,
      input.submittedById,
      input.submittedByEmail,
      input.initials,
      input.firstName,
      input.lastName,
      input.gender,
      input.permanentAddress,
      input.orgId,
      input.natureOfEngagement,
      input.role,
      input.department,
      input.projectName,
      input.joiningDate,
      input.anticipatedEndDate,
      input.reportingOfficerName,
      input.reportingOfficerEmail,
      input.mobileNo,
      input.alternateEmail,
      input.consentAccepted,
    ]
  );

  return mapFormRow(
    inserted.rows[0] as {
      id: string;
      created_at: Date;
      updated_at: Date;
      submitted_by_id: string;
      submitted_by_email: string;
      initials: string;
      first_name: string;
      last_name: string;
      gender: string;
      permanent_address: string;
      org_id: string;
      nature_of_engagement: string;
      role: string;
      department: string;
      project_name: string | null;
      joining_date: Date | null;
      anticipated_end_date: Date | null;
      reporting_officer_name: string | null;
      reporting_officer_email: string | null;
      mobile_no: string;
      alternate_email: string;
      consent_accepted: boolean;
      status: EmailIdFormStatus;
    }
  );
}

export async function listEmailIdFormsBySubmitter(
  submittedById: string
): Promise<EmailFormWithApprovals[]> {
  if (!hasDatabaseUrl()) {
    return listEmailIdFormsBySubmitterInMemory(submittedById);
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    return listEmailIdFormsBySubmitterInMemory(submittedById);
  }

  const formsResult = await pool.query(
    `
    SELECT
      id,
      created_at,
      updated_at,
      submitted_by_id,
      submitted_by_email,
      initials,
      first_name,
      last_name,
      gender,
      permanent_address,
      org_id,
      nature_of_engagement,
      role,
      department,
      project_name,
      joining_date,
      anticipated_end_date,
      reporting_officer_name,
      reporting_officer_email,
      mobile_no,
      alternate_email,
      consent_accepted,
      status
    FROM app_email_id_forms
    WHERE submitted_by_id = $1
    ORDER BY created_at DESC
  `,
    [submittedById]
  );

  const forms = formsResult.rows.map((row) =>
    mapFormRow(
      row as {
        id: string;
        created_at: Date;
        updated_at: Date;
        submitted_by_id: string;
        submitted_by_email: string;
        initials: string;
        first_name: string;
        last_name: string;
        gender: string;
        permanent_address: string;
        org_id: string;
        nature_of_engagement: string;
        role: string;
        department: string;
        project_name: string | null;
        joining_date: Date | null;
        anticipated_end_date: Date | null;
        reporting_officer_name: string | null;
        reporting_officer_email: string | null;
        mobile_no: string;
        alternate_email: string;
        consent_accepted: boolean;
        status: EmailIdFormStatus;
      }
    )
  );

  const approvalMap = await listApprovalsForForms(forms.map((f) => f.id));

  return forms.map((form) => ({
    ...form,
    approvals: approvalMap.get(form.id) ?? [],
  }));
}

export async function getEmailIdFormById(
  id: string
): Promise<EmailFormWithApprovals | null> {
  if (!hasDatabaseUrl()) {
    return getEmailIdFormByIdInMemory(id);
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    return getEmailIdFormByIdInMemory(id);
  }

  const formResult = await pool.query(
    `
    SELECT
      id,
      created_at,
      updated_at,
      submitted_by_id,
      submitted_by_email,
      initials,
      first_name,
      last_name,
      gender,
      permanent_address,
      org_id,
      nature_of_engagement,
      role,
      department,
      project_name,
      joining_date,
      anticipated_end_date,
      reporting_officer_name,
      reporting_officer_email,
      mobile_no,
      alternate_email,
      consent_accepted,
      status
    FROM app_email_id_forms
    WHERE id = $1
    LIMIT 1
  `,
    [id]
  );

  if ((formResult.rowCount ?? 0) === 0) {
    return null;
  }

  const form = mapFormRow(
    formResult.rows[0] as {
      id: string;
      created_at: Date;
      updated_at: Date;
      submitted_by_id: string;
      submitted_by_email: string;
      initials: string;
      first_name: string;
      last_name: string;
      gender: string;
      permanent_address: string;
      org_id: string;
      nature_of_engagement: string;
      role: string;
      department: string;
      project_name: string | null;
      joining_date: Date | null;
      anticipated_end_date: Date | null;
      reporting_officer_name: string | null;
      reporting_officer_email: string | null;
      mobile_no: string;
      alternate_email: string;
      consent_accepted: boolean;
      status: EmailIdFormStatus;
    }
  );

  const approvalMap = await listApprovalsForForms([id]);

  return {
    ...form,
    approvals: approvalMap.get(id) ?? [],
  };
}

export async function listEmailIdForms(params: {
  status?: EmailIdFormStatus;
  viewerRole?: AppRole | null;
  includeApprovals: true;
}): Promise<EmailFormWithApprovals[]>;
export async function listEmailIdForms(params?: {
  status?: EmailIdFormStatus;
  viewerRole?: AppRole | null;
  includeApprovals?: false;
}): Promise<EmailIdFormRecord[]>;
export async function listEmailIdForms(params?: {
  status?: EmailIdFormStatus;
  viewerRole?: AppRole | null;
  includeApprovals?: boolean;
}): Promise<EmailIdFormRecord[] | EmailFormWithApprovals[]> {
  if (!hasDatabaseUrl()) {
    return listEmailIdFormsInMemory(params);
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    return listEmailIdFormsInMemory(params);
  }

  const where: string[] = [];
  const values: Array<string> = [];

  if (
    params?.viewerRole &&
    [
      "FORWARDING_AUTHORITY_ACADEMICS",
      "ESTABLISHMENT",
      "FORWARDING_AUTHORITY_R_AND_D",
    ].includes(params.viewerRole)
  ) {
    values.push("PENDING");
    where.push(`status = $${values.length}`);
  }

  if (params?.viewerRole === "IT_ADMIN") {
    values.push("FORWARDED");
    values.push("ISSUED");
    where.push(`status IN ($${values.length - 1}, $${values.length})`);
  }

  if (params?.status) {
    values.push(params.status);
    where.push(`status = $${values.length}`);
  }

  const query = `
    SELECT
      id,
      created_at,
      updated_at,
      submitted_by_id,
      submitted_by_email,
      initials,
      first_name,
      last_name,
      gender,
      permanent_address,
      org_id,
      nature_of_engagement,
      role,
      department,
      project_name,
      joining_date,
      anticipated_end_date,
      reporting_officer_name,
      reporting_officer_email,
      mobile_no,
      alternate_email,
      consent_accepted,
      status
    FROM app_email_id_forms
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, values);
  const forms = result.rows.map((row) =>
    mapFormRow(
      row as {
        id: string;
        created_at: Date;
        updated_at: Date;
        submitted_by_id: string;
        submitted_by_email: string;
        initials: string;
        first_name: string;
        last_name: string;
        gender: string;
        permanent_address: string;
        org_id: string;
        nature_of_engagement: string;
        role: string;
        department: string;
        project_name: string | null;
        joining_date: Date | null;
        anticipated_end_date: Date | null;
        reporting_officer_name: string | null;
        reporting_officer_email: string | null;
        mobile_no: string;
        alternate_email: string;
        consent_accepted: boolean;
        status: EmailIdFormStatus;
      }
    )
  );

  if (!params?.includeApprovals) {
    return forms;
  }

  const approvalMap = await listApprovalsForForms(forms.map((f) => f.id));
  return forms.map((form) => ({
    ...form,
    approvals: approvalMap.get(form.id) ?? [],
  }));
}

export async function addForwardingApproval(input: {
  formId: string;
  stage: number;
  section: ForwardingSection;
  approverName: string;
}) {
  if (!hasDatabaseUrl()) {
    return addForwardingApprovalInMemory(input);
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    return addForwardingApprovalInMemory(input);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const formResult = await client.query(
      "SELECT id, status FROM app_email_id_forms WHERE id = $1 LIMIT 1",
      [input.formId]
    );

    if ((formResult.rowCount ?? 0) === 0) {
      throw new Error("Form not found.");
    }

    if (formResult.rows[0].status === "REJECTED" || formResult.rows[0].status === "ISSUED") {
      throw new Error("Form is already completed.");
    }

    const approvalId = `apr_${randomUUID()}`;
    const inserted = await client.query(
      `
      INSERT INTO app_email_id_approvals (
        id,
        form_id,
        stage,
        forwarding_section,
        approver_name,
        assigned_email_id,
        date_of_creation,
        tentative_removal_date,
        id_created_by
      )
      VALUES ($1, $2, $3, $4, $5, NULL, NULL, NULL, NULL)
      RETURNING
        id,
        created_at,
        form_id,
        stage,
        forwarding_section,
        approver_name,
        assigned_email_id,
        date_of_creation,
        tentative_removal_date,
        id_created_by
    `,
      [approvalId, input.formId, input.stage, input.section, input.approverName]
    );

    await client.query(
      `
      UPDATE app_email_id_forms
      SET status = 'FORWARDED',
          updated_at = NOW()
      WHERE id = $1
    `,
      [input.formId]
    );

    await client.query("COMMIT");

    return mapApprovalRow(
      inserted.rows[0] as {
        id: string;
        created_at: Date;
        form_id: string;
        stage: number;
        forwarding_section: ForwardingSection | null;
        approver_name: string;
        assigned_email_id: string | null;
        date_of_creation: Date | null;
        tentative_removal_date: Date | null;
        id_created_by: string | null;
      }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addIssueApproval(input: {
  formId: string;
  stage: number;
  assignedEmailId: string;
  dateOfCreation: string;
  tentativeRemovalDate: string | null;
  idCreatedBy: string;
}) {
  if (!hasDatabaseUrl()) {
    return addIssueApprovalInMemory(input);
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    return addIssueApprovalInMemory(input);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const formResult = await client.query(
      "SELECT id, status FROM app_email_id_forms WHERE id = $1 LIMIT 1",
      [input.formId]
    );

    if ((formResult.rowCount ?? 0) === 0) {
      throw new Error("Form not found.");
    }

    if (formResult.rows[0].status === "REJECTED" || formResult.rows[0].status === "ISSUED") {
      throw new Error("Form is already completed.");
    }

    const approvalId = `apr_${randomUUID()}`;
    const inserted = await client.query(
      `
      INSERT INTO app_email_id_approvals (
        id,
        form_id,
        stage,
        forwarding_section,
        approver_name,
        assigned_email_id,
        date_of_creation,
        tentative_removal_date,
        id_created_by
      )
      VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $4)
      RETURNING
        id,
        created_at,
        form_id,
        stage,
        forwarding_section,
        approver_name,
        assigned_email_id,
        date_of_creation,
        tentative_removal_date,
        id_created_by
    `,
      [
        approvalId,
        input.formId,
        input.stage,
        input.idCreatedBy,
        input.assignedEmailId,
        input.dateOfCreation,
        input.tentativeRemovalDate,
      ]
    );

    await client.query(
      `
      UPDATE app_email_id_forms
      SET status = 'ISSUED',
          updated_at = NOW()
      WHERE id = $1
    `,
      [input.formId]
    );

    await client.query("COMMIT");

    return mapApprovalRow(
      inserted.rows[0] as {
        id: string;
        created_at: Date;
        form_id: string;
        stage: number;
        forwarding_section: ForwardingSection | null;
        approver_name: string;
        assigned_email_id: string | null;
        date_of_creation: Date | null;
        tentative_removal_date: Date | null;
        id_created_by: string | null;
      }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectEmailIdForm(input: {
  formId: string;
  stage: number;
  section: ForwardingSection;
  approverName: string;
  remark: string;
}) {
  if (!hasDatabaseUrl()) {
    return rejectEmailIdFormInMemory(input);
  }

  await ensureSchema();
  const pool = getPgPool();
  if (!pool) {
    return rejectEmailIdFormInMemory(input);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const formResult = await client.query(
      "SELECT id, status FROM app_email_id_forms WHERE id = $1 LIMIT 1",
      [input.formId]
    );

    if ((formResult.rowCount ?? 0) === 0) {
      throw new Error("Form not found.");
    }

    if (formResult.rows[0].status === "REJECTED" || formResult.rows[0].status === "ISSUED") {
      throw new Error("Form is already completed.");
    }

    const approvalId = `apr_${randomUUID()}`;
    const inserted = await client.query(
      `
      INSERT INTO app_email_id_approvals (
        id,
        form_id,
        stage,
        forwarding_section,
        approver_name,
        assigned_email_id,
        date_of_creation,
        tentative_removal_date,
        id_created_by
      )
      VALUES ($1, $2, $3, $4, $5, NULL, NULL, NULL, NULL)
      RETURNING
        id,
        created_at,
        form_id,
        stage,
        forwarding_section,
        approver_name,
        assigned_email_id,
        date_of_creation,
        tentative_removal_date,
        id_created_by
    `,
      [
        approvalId,
        input.formId,
        input.stage,
        input.section,
        `Rejected by ${input.approverName} | ${input.remark}`,
      ]
    );

    await client.query(
      `
      UPDATE app_email_id_forms
      SET status = 'REJECTED',
          updated_at = NOW()
      WHERE id = $1
    `,
      [input.formId]
    );

    await client.query("COMMIT");

    return mapApprovalRow(
      inserted.rows[0] as {
        id: string;
        created_at: Date;
        form_id: string;
        stage: number;
        forwarding_section: ForwardingSection | null;
        approver_name: string;
        assigned_email_id: string | null;
        date_of_creation: Date | null;
        tentative_removal_date: Date | null;
        id_created_by: string | null;
      }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type { EmailFormWithApprovals, EmailIdFormStatus };
