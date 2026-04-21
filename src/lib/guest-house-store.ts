import { getPgPool } from "@/lib/db";
import type { AppRole } from "@/lib/mock-db";
import { getNextStage, getWorkflow } from "@/lib/workflow-engine";

export type GuestHouseStageApproval = {
  stageNumber: number;
  stageName: string;
  decision: "pending" | "approved" | "rejected" | "forwarded";
  recommendationText: string | null;
  decidedAt: Date | null;
};

export type GuestHouseProposerRecord = {
  id: string;
  serialNo: number;
  nameOfProposer: string;
  designation: string | null;
  department: string | null;
  employeeCode: string | null;
  entryNumber: string | null;
  mobileNumber: string | null;
};

export type GuestHouseFormRecord = {
  submissionId: string;
  submittedById: string;
  submittedByEmail: string;
  createdAt: Date;
  updatedAt: Date;
  currentStage: number;
  overallStatus: string;
  guestName: string;
  guestGender: string | null;
  guestAddress: string;
  contactNumber: string;
  numberOfGuests: number;
  numberOfRoomsRequired: number;
  occupancyType: "single" | "double";
  arrivalDate: Date;
  arrivalTime: string | null;
  departureDate: Date;
  departureTime: string | null;
  purposeOfBooking: string;
  roomType: "executive_suite" | "business_room";
  bookExecutiveSuite: boolean;
  bookBusinessRoom: boolean;
  bookingCategory: string | null;
  categoryTariffAmount: number | null;
  undertakingAcceptedAt: Date | null;
  remarksIfAny: string | null;
  boardingLodgingByGuest: boolean | null;
  isInstituteGuest: boolean;
  bookingDate: Date | null;
  roomNoConfirmed: string | null;
  srNoEnteredAtPageNo: string | null;
  entryDate: Date | null;
  checkInDateTime: Date | null;
  checkOutDateTime: Date | null;
  officeRemarks: string | null;
  totalCharges: number | null;
  budgetDepartment: string | null;
  approvals: GuestHouseStageApproval[];
  proposers: GuestHouseProposerRecord[];
};

function shouldSkipChairmanStage3(input: {
  roomType: "executive_suite" | "business_room";
  bookingCategory: string;
}) {
  const bookingCategory = input.bookingCategory.trim().toLowerCase().replace(/-/g, "_");
  const normalizedCategory = bookingCategory === "b1" ? "b_1" : bookingCategory === "b2" ? "b_2" : bookingCategory;

  return (
    (input.roomType === "executive_suite" && normalizedCategory === "cat_b") ||
    (input.roomType === "business_room" && normalizedCategory === "b_2")
  );
}

function mapAppRoleToWorkflowRole(role: AppRole | null): string {
  switch (role) {
    case "STUDENT":
      return "student";
    case "INTERN":
      return "project_staff";
    case "EMPLOYEE":
      return "non_tech_staff";
    case "DIRECTOR":
      return "dean_faa";
    case "DEAN_FAA":
      return "dean_faa";
    case "DEPUTY_DEAN":
      return "deputy_registrar";
    case "REGISTRAR":
      return "registrar";
    case "HOD":
      return "hod";
    case "APPROVING_AUTHORITY":
      return "approving_authority";
    case "GUEST_HOUSE_INCHARGE":
      return "guest_house_incharge";
    case "GUEST_HOUSE_COMMITTEE_CHAIR":
      return "guest_house_committee_chair";
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
    return new Map<string, GuestHouseStageApproval[]>();
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

  const map = new Map<string, GuestHouseStageApproval[]>();
  for (const row of result.rows) {
    const key = String(row.submission_id);
    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)?.push({
      stageNumber: Number(row.stage_number),
      stageName: String(row.stage_name),
      decision: String(row.decision) as GuestHouseStageApproval["decision"],
      recommendationText: row.recommendation_text ? String(row.recommendation_text) : null,
      decidedAt: row.decided_at ? new Date(row.decided_at) : null,
    });
  }

  return map;
}

async function getProposersBySubmissionIds(submissionIds: string[]) {
  const pool = getPgPool();
  if (!pool || submissionIds.length === 0) {
    return new Map<string, GuestHouseProposerRecord[]>();
  }

  const result = await pool.query(
    `
    SELECT
      ghd.submission_id,
      ghp.id,
      ghp.serial_no,
      ghp.name_of_proposer,
      ghp.designation,
      ghp.department,
      ghp.employee_code,
      ghp.entry_number,
      ghp.mobile_number
    FROM guest_house_proposers ghp
    JOIN guest_house_data ghd ON ghd.id = ghp.guest_house_id
    WHERE ghd.submission_id = ANY($1::uuid[])
    ORDER BY ghp.serial_no ASC
  `,
    [submissionIds]
  );

  const map = new Map<string, GuestHouseProposerRecord[]>();
  for (const row of result.rows) {
    const key = String(row.submission_id);
    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)?.push({
      id: String(row.id),
      serialNo: Number(row.serial_no),
      nameOfProposer: String(row.name_of_proposer),
      designation: row.designation ? String(row.designation) : null,
      department: row.department ? String(row.department) : null,
      employeeCode: row.employee_code ? String(row.employee_code) : null,
      entryNumber: row.entry_number ? String(row.entry_number) : null,
      mobileNumber: row.mobile_number ? String(row.mobile_number) : null,
    });
  }

  return map;
}

function combineRecords(
  rows: Array<Record<string, unknown>>,
  approvalsMap: Map<string, GuestHouseStageApproval[]>,
  proposersMap: Map<string, GuestHouseProposerRecord[]>
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
      guestName: String(row.guest_name),
      guestGender: row.guest_gender ? String(row.guest_gender) : null,
      guestAddress: String(row.guest_address),
      contactNumber: String(row.contact_number),
      numberOfGuests: Number(row.number_of_guests),
      numberOfRoomsRequired: Number(row.number_of_rooms_required),
      occupancyType: String(row.occupancy_type) as "single" | "double",
      arrivalDate: new Date(String(row.arrival_date)),
      arrivalTime: row.arrival_time ? String(row.arrival_time) : null,
      departureDate: new Date(String(row.departure_date)),
      departureTime: row.departure_time ? String(row.departure_time) : null,
      purposeOfBooking: String(row.purpose_of_booking),
      roomType: String(row.room_type) as "executive_suite" | "business_room",
      bookExecutiveSuite: Boolean(row.book_executive_suite),
      bookBusinessRoom: Boolean(row.book_business_room),
      bookingCategory: row.booking_category ? String(row.booking_category) : null,
      categoryTariffAmount:
        row.category_tariff_amount === null || row.category_tariff_amount === undefined
          ? null
          : Number(row.category_tariff_amount),
      undertakingAcceptedAt: row.undertaking_accepted_at ? new Date(String(row.undertaking_accepted_at)) : null,
      remarksIfAny: row.remarks_if_any ? String(row.remarks_if_any) : null,
      boardingLodgingByGuest:
        row.boarding_lodging_by_guest === null || row.boarding_lodging_by_guest === undefined
          ? null
          : Boolean(row.boarding_lodging_by_guest),
      isInstituteGuest: Boolean(row.is_institute_guest),
      bookingDate: row.booking_date ? new Date(String(row.booking_date)) : null,
      roomNoConfirmed: row.room_no_confirmed ? String(row.room_no_confirmed) : null,
      srNoEnteredAtPageNo: row.sr_no_entered_at_page_no ? String(row.sr_no_entered_at_page_no) : null,
      entryDate: row.entry_date ? new Date(String(row.entry_date)) : null,
      checkInDateTime: row.check_in_datetime ? new Date(String(row.check_in_datetime)) : null,
      checkOutDateTime: row.check_out_datetime ? new Date(String(row.check_out_datetime)) : null,
      officeRemarks: row.office_remarks ? String(row.office_remarks) : null,
      totalCharges:
        row.total_charges === null || row.total_charges === undefined
          ? null
          : Number(row.total_charges),
      budgetDepartment: row.budget_department ? String(row.budget_department) : null,
      approvals: approvalsMap.get(submissionId) ?? [],
      proposers: proposersMap.get(submissionId) ?? [],
    } satisfies GuestHouseFormRecord;
  });
}

export async function createGuestHouseForm(input: {
  submitter: {
    email: string;
    fullName: string | null;
    role: AppRole | null;
  };
  guestName: string;
  guestGender: string;
  guestAddress: string;
  contactNumber: string;
  numberOfGuests: number;
  numberOfRoomsRequired: number;
  occupancyType: "single" | "double";
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  purposeOfBooking: string;
  roomType: "executive_suite" | "business_room";
  bookExecutiveSuite: boolean;
  bookBusinessRoom: boolean;
  bookingCategory: string;
  categoryTariffAmount: string;
  remarksIfAny: string;
  boardingLodgingByGuest: boolean;
  isInstituteGuest: boolean;
  guestNotToBeCharged: boolean;
  budgetDepartment: string | null;
  bookingDate: string;
  proposer: {
    nameOfProposer: string;
    designation: string;
    department: string;
    employeeCode: string;
    entryNumber: string;
    mobileNumber: string;
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
        'guest_house_reservation'::form_type,
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
          guestName: input.guestName,
          purposeOfBooking: input.purposeOfBooking,
          bookingCategory: input.bookingCategory,
          guestNotToBeCharged: input.guestNotToBeCharged,
        }),
      ]
    );

    const submissionId = String(submission.rows[0].id);

    const ghd = await client.query(
      `
      INSERT INTO guest_house_data (
        submission_id,
        guest_name,
        guest_gender,
        guest_address,
        contact_number,
        number_of_guests,
        number_of_rooms_required,
        occupancy_type,
        arrival_date,
        arrival_time,
        departure_date,
        departure_time,
        purpose_of_booking,
        room_type,
        book_executive_suite,
        book_business_room,
        booking_category,
        category_tariff_amount,
        undertaking_accepted_at,
        remarks_if_any,
        boarding_lodging_by_guest,
        is_institute_guest,
        booking_date,
        budget_department
      )
      VALUES (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8::occupancy_type,
        $9::date,
        $10::time,
        $11::date,
        $12::time,
        $13,
        $14::room_type,
        $15,
        $16,
        $17,
        $18::decimal,
        NOW(),
        $19,
        $20,
        $21,
        $22::date,
        $23
      )
      RETURNING id
    `,
      [
        submissionId,
        input.guestName,
        input.guestGender,
        input.guestAddress,
        input.contactNumber,
        input.numberOfGuests,
        input.numberOfRoomsRequired,
        input.occupancyType,
        input.arrivalDate,
        input.arrivalTime,
        input.departureDate,
        input.departureTime,
        input.purposeOfBooking,
        input.roomType,
        input.bookExecutiveSuite,
        input.bookBusinessRoom,
        input.bookingCategory,
        input.categoryTariffAmount,
        input.remarksIfAny || null,
        input.boardingLodgingByGuest,
        input.isInstituteGuest,
        input.bookingDate,
        input.budgetDepartment,
      ]
    );

    const guestHouseId = String(ghd.rows[0].id);

    await client.query(
      `
      INSERT INTO guest_house_proposers (
        guest_house_id,
        serial_no,
        name_of_proposer,
        designation,
        department,
        employee_code,
        entry_number,
        mobile_number,
        user_id
      )
      VALUES ($1::uuid, 1, $2, $3, $4, $5, $6, $7, $8::uuid)
    `,
      [
        guestHouseId,
        input.proposer.nameOfProposer,
        input.proposer.designation,
        input.proposer.department,
        input.proposer.employeeCode || null,
        input.proposer.entryNumber || null,
        input.proposer.mobileNumber || null,
        workflowUserId,
      ]
    );

    const includeStage3 = !shouldSkipChairmanStage3({
      roomType: input.roomType,
      bookingCategory: input.bookingCategory,
    });

    const stageRows = [
      [1, "Approving Authority Sign-off", "approving_authority"],
      [2, "Official In-charge Room Entry", "guest_house_incharge"],
      ...(includeStage3
        ? [[3, "Chairman GH Committee Approval", "guest_house_committee_chair"]]
        : []),
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

    await client.query("COMMIT");
    return submissionId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listGuestHouseBase(whereClause: string, values: unknown[]) {
  const pool = getPgPool();
  if (!pool) {
    return [] as GuestHouseFormRecord[];
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
      ghd.guest_name,
      ghd.guest_gender,
      ghd.guest_address,
      ghd.contact_number,
      ghd.number_of_guests,
      ghd.number_of_rooms_required,
      ghd.occupancy_type,
      ghd.arrival_date,
      ghd.arrival_time,
      ghd.departure_date,
      ghd.departure_time,
      ghd.purpose_of_booking,
      ghd.room_type,
      ghd.book_executive_suite,
      ghd.book_business_room,
      ghd.booking_category,
      ghd.category_tariff_amount,
      ghd.undertaking_accepted_at,
      ghd.remarks_if_any,
      ghd.boarding_lodging_by_guest,
      ghd.is_institute_guest,
      ghd.booking_date,
      ghd.room_no_confirmed,
      ghd.sr_no_entered_at_page_no,
      ghd.entry_date,
      ghd.check_in_datetime,
      ghd.check_out_datetime,
      ghd.office_remarks,
      ghd.total_charges,
      ghd.budget_department
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN guest_house_data ghd ON ghd.submission_id = fs.id
    WHERE fs.form_type = 'guest_house_reservation'::form_type
      ${whereClause}
    ORDER BY fs.created_at DESC
  `,
    values
  );

  const ids = result.rows.map((row) => String(row.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const proposersMap = await getProposersBySubmissionIds(ids);
  return combineRecords(result.rows, approvalsMap, proposersMap);
}

export async function listGuestHouseFormsForStage(stageNumber: number) {
  return listGuestHouseBase(
    `
      AND fs.current_stage = $1
      AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)
    `,
    [stageNumber]
  );
}

export async function listActionableGuestHouseForms(userRole: string) {
  const pool = getPgPool();
  if (!pool) {
    return [] as GuestHouseFormRecord[];
  }

  // We find which stages the user's role is listed in for the guest-house-reservation workflow
  const result = await pool.query(
    `
    WITH user_stages AS (
      SELECT workflow.stage_element->>'stage' AS stage_num
      FROM app_workflows w,
           jsonb_array_elements(w.stages) AS workflow(stage_element)
      WHERE w.id = 'guest-house'
        AND string_to_array(workflow.stage_element->>'role', ',') @> ARRAY[$1]::text[]
    )
    SELECT
      fs.id AS submission_id,
      fs.submitted_by,
      fs.current_stage,
      fs.overall_status,
      fs.created_at,
      fs.updated_at,
      u.email AS submitted_by_email,
      ghd.guest_name,
      ghd.guest_gender,
      ghd.guest_address,
      ghd.contact_number,
      ghd.number_of_guests,
      ghd.number_of_rooms_required,
      ghd.occupancy_type,
      ghd.arrival_date,
      ghd.arrival_time,
      ghd.departure_date,
      ghd.departure_time,
      ghd.purpose_of_booking,
      ghd.room_type,
      ghd.book_executive_suite,
      ghd.book_business_room,
      ghd.booking_category,
      ghd.category_tariff_amount,
      ghd.undertaking_accepted_at,
      ghd.remarks_if_any,
      ghd.boarding_lodging_by_guest,
      ghd.is_institute_guest,
      ghd.booking_date,
      ghd.room_no_confirmed,
      ghd.sr_no_entered_at_page_no,
      ghd.entry_date,
      ghd.check_in_datetime,
      ghd.check_out_datetime,
      ghd.office_remarks,
      ghd.total_charges,
      ghd.budget_department
    FROM form_submissions fs
    JOIN users u ON u.id = fs.submitted_by
    JOIN guest_house_data ghd ON ghd.submission_id = fs.id
    WHERE fs.form_type = 'guest_house_reservation'::form_type
      AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)
      AND fs.current_stage::text IN (SELECT stage_num FROM user_stages)
    ORDER BY fs.created_at ASC
  `,
    [userRole]
  );

  const ids = result.rows.map((row) => String(row.submission_id));
  const approvalsMap = await getApprovalsBySubmissionIds(ids);
  const proposersMap = await getProposersBySubmissionIds(ids);
  return combineRecords(result.rows, approvalsMap, proposersMap);
}

export async function listGuestHouseCompletedForms() {
  return listGuestHouseBase(
    `
      AND fs.overall_status IN ('approved'::submission_status, 'rejected'::submission_status)
    `,
    []
  );
}

export async function listGuestHouseOngoingForms() {
  return listGuestHouseBase(
    `
      AND fs.overall_status NOT IN ('approved'::submission_status, 'rejected'::submission_status, 'withdrawn'::submission_status)
    `,
    []
  );
}

export async function listGuestHouseFormsForAdmin() {
  return listGuestHouseBase("", []);
}

export async function listGuestHouseFormsBySubmitterEmail(email: string) {
  return listGuestHouseBase("AND lower(u.email) = lower($1)", [email]);
}

export async function getGuestHouseFormById(submissionId: string) {
  const rows = await listGuestHouseBase("AND fs.id = $1::uuid", [submissionId]);
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

    const current = await client.query(
      `
      SELECT current_stage, overall_status
      FROM form_submissions
      WHERE id = $1::uuid
      LIMIT 1
    `,
      [input.submissionId]
    );

    if ((current.rowCount ?? 0) === 0) {
      throw new Error("Guest house form not found.");
    }

    if (Number(current.rows[0].current_stage) !== input.stageNumber) {
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

    const current = await client.query(
      `
      SELECT current_stage
      FROM form_submissions
      WHERE id = $1::uuid
      LIMIT 1
    `,
      [input.submissionId]
    );

    if ((current.rowCount ?? 0) === 0) {
      throw new Error("Guest house form not found.");
    }

    if (Number(current.rows[0].current_stage) !== input.stageNumber) {
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

export async function approveGuestHouseStage1(input: {
  submissionId: string;
  approverName: string;
  remark: string;
}) {
  const workflow = await getWorkflow("guest-house");
  if (!workflow) {
    throw new Error("Guest House workflow blueprint not found in database.");
  }

  const nextStage = getNextStage(workflow, 1);

  return approveStage({
    submissionId: input.submissionId,
    stageNumber: 1,
    nextStage: nextStage ?? 1,
    markApproved: nextStage === null,
    recommendationText: `Stage 1 Competent Authority: ${input.approverName} | ${input.remark}`,
  });
}

export async function approveGuestHouseStage2(input: {
  submissionId: string;
  approverName: string;
  roomNoConfirmed: string;
  entryDate: string;
  checkInDateTime: string;
  checkOutDateTime: string;
  officeRemarks: string;
}) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("Database is not configured.");
  }

  const form = await getGuestHouseFormById(input.submissionId);
  if (!form) {
    throw new Error("Guest house form not found.");
  }

  const workflow = await getWorkflow("guest-house");
  if (!workflow) {
    throw new Error("Guest House workflow blueprint not found in database.");
  }

  const skipStage3 = shouldSkipChairmanStage3({
    roomType: form.roomType,
    bookingCategory: form.bookingCategory ?? "",
  });

  const nextStage = skipStage3 ? getNextStage(workflow, 3) : getNextStage(workflow, 2);

  await approveStage({
    submissionId: input.submissionId,
    stageNumber: 2,
    nextStage: nextStage ?? 2,
    markApproved: nextStage === null,
    recommendationText: `Guest House In-charge: ${input.approverName} | ${input.officeRemarks}`,
  });

  if (skipStage3) {
    await pool.query(
      `
      UPDATE approval_stages
      SET decision = 'forwarded'::stage_decision,
          recommendation_text = COALESCE(recommendation_text, 'Skipped: Chairman approval already handled at Stage 1 for this category.'),
          decided_at = COALESCE(decided_at, NOW())
      WHERE submission_id = $1::uuid
        AND stage_number = 3
        AND decision = 'pending'::stage_decision
    `,
      [input.submissionId]
    );
  }

  await pool.query(
    `
    UPDATE guest_house_data
    SET room_no_confirmed = $2,
        entry_date = $3::date,
        check_in_datetime = $4::timestamptz,
        check_out_datetime = $5::timestamptz,
        office_remarks = $6
    WHERE submission_id = $1::uuid
  `,
    [
      input.submissionId,
      input.roomNoConfirmed,
      input.entryDate,
      input.checkInDateTime,
      input.checkOutDateTime,
      input.officeRemarks,
    ]
  );
}

export async function approveGuestHouseStage3(input: {
  submissionId: string;
  approverName: string;
  remark: string;
}) {
  const workflow = await getWorkflow("guest-house");
  if (!workflow) {
    throw new Error("Guest House workflow blueprint not found in database.");
  }

  const nextStage = getNextStage(workflow, 3);

  return approveStage({
    submissionId: input.submissionId,
    stageNumber: 3,
    nextStage: nextStage ?? 3,
    markApproved: nextStage === null,
    recommendationText: `Chairman GH Committee: ${input.approverName} | ${input.remark}`,
  });
}

export async function rejectGuestHouseStage1(input: {
  submissionId: string;
  approverName: string;
  remark: string;
}) {
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: 1,
    recommendationText: `Rejected by Stage 1 Competent Authority: ${input.approverName} | ${input.remark}`,
  });
}

export async function rejectGuestHouseStage2(input: {
  submissionId: string;
  approverName: string;
  remark: string;
}) {
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: 2,
    recommendationText: `Rejected by Guest House In-charge: ${input.approverName} | ${input.remark}`,
  });
}

export async function rejectGuestHouseStage3(input: {
  submissionId: string;
  approverName: string;
  remark: string;
}) {
  return rejectStage({
    submissionId: input.submissionId,
    stageNumber: 3,
    recommendationText: `Rejected by Chairman GH Committee: ${input.approverName} | ${input.remark}`,
  });
}

export async function approveGuestHouseAtStage(input: {
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

export async function rejectGuestHouseAtStage(input: {
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
