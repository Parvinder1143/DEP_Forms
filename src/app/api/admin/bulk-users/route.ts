import { NextResponse } from "next/server";
import { requireRole, isSystemAdminEmail } from "@/lib/auth";
import { normalizeAssignableRoleCode, listCustomRoles } from "@/lib/custom-role-store";
import { BUILT_IN_ROLE_OPTIONS } from "@/lib/roles";
import { authenticateUser, findUserByEmail, updateUserRole } from "@/lib/user-store";
import { generateRandomPassword } from "@/lib/password-generator";

type CreatedItem = { email: string; role: string | null; password: string };
type SkippedItem = { email: string; reason: string };
type ErrorItem = { email: string; error: string };
type PreviewItem = {
  email: string;
  role: string | null;
  status: "ready" | "skipped" | "error";
  reason?: string;
};

function parseCsvContent(content: string) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [] as string[];

  // If header present, drop it
  const first = lines[0].toLowerCase();
  if (first.includes('email') && (first.includes('role') || first.includes('userrole') || first.includes('department'))) {
    return lines.slice(1);
  }
  return lines;
}

function extractEmailAndRole(line: string) {
  const cells = line.split(",").map((cell) => cell.trim());
  const nonEmptyCells = cells.filter((cell) => cell.length > 0);

  // Ignore decorative/empty rows from spreadsheet exports
  if (nonEmptyCells.length === 0) {
    return null;
  }

  const emailIndex = nonEmptyCells.findIndex((value) => value.includes("@"));
  if (emailIndex === -1) {
    return null;
  }

  const email = nonEmptyCells[emailIndex].toLowerCase();
  const role = nonEmptyCells[emailIndex + 1] ?? "";

  return { email, role };
}

function buildValidationContext(customRoles: Array<{ roleCode: string }>) {
  return new Set<string>([
    ...BUILT_IN_ROLE_OPTIONS,
    ...customRoles.map((r) => r.roleCode),
  ].map((r) => String(r).toUpperCase()));
}

export async function POST(req: Request) {
  await requireRole(["SYSTEM_ADMIN"]);

  const payload = (await req.json().catch(() => null)) as
    | { mode?: "preview" | "create"; content?: string }
    | null;
  const mode = payload?.mode === "create" ? "create" : "preview";
  const bodyText = String(payload?.content ?? "");
  const rows = parseCsvContent(bodyText);

  const customRoles = await listCustomRoles();
  const allowedRoles = buildValidationContext(customRoles);

  const preview: PreviewItem[] = [];

  for (const line of rows) {
    const parsed = extractEmailAndRole(line);
    if (!parsed) {
      continue;
    }

    const email = parsed.email;
    const maybeRole = parsed.role;

    if (!email) {
      preview.push({ status: "skipped", email: "", role: null, reason: "Missing email" });
      continue;
    }

    if (!maybeRole) {
      preview.push({ status: "error", email, role: null, reason: "Missing role" });
      continue;
    }

    const roleNormalized = normalizeAssignableRoleCode(String(maybeRole));
    if (!roleNormalized || !allowedRoles.has(roleNormalized.toUpperCase())) {
      preview.push({ status: "error", email, role: roleNormalized || null, reason: `Invalid role: ${maybeRole}` });
      continue;
    }

    const existing = await findUserByEmail(email).catch(() => null);
    if (existing) {
      preview.push({ status: "skipped", email, role: roleNormalized, reason: "Account already exists" });
      continue;
    }

    preview.push({ status: "ready", email, role: roleNormalized });
  }

  if (mode === "preview") {
    return NextResponse.json({
      preview,
      summary: {
        ready: preview.filter((item) => item.status === "ready").length,
        skipped: preview.filter((item) => item.status === "skipped").length,
        errors: preview.filter((item) => item.status === "error").length,
      },
    });
  }

  const created: CreatedItem[] = [];
  const skipped: SkippedItem[] = [];
  const errors: ErrorItem[] = [];

  for (const item of preview) {
    try {
      if (item.status !== "ready" || !item.email || !item.role) {
        if (item.status === "skipped") {
          skipped.push({ email: item.email, reason: item.reason ?? "Skipped" });
        } else if (item.status === "error") {
          errors.push({ email: item.email, error: item.reason ?? "Invalid row" });
        }
        continue;
      }

      const email = item.email;
      const roleNormalized = item.role;

      const existing = await findUserByEmail(email).catch(() => null);
      if (existing) {
        skipped.push({ email, reason: 'Account already exists' });
        continue;
      }

      const password = generateRandomPassword(8);

      const createdResult = await authenticateUser({
        mode: 'signup',
        email,
        password,
        forceSystemAdmin: isSystemAdminEmail(email),
      }).catch((e) => {
        throw e;
      });

      const user = createdResult.user;

      await updateUserRole(user.id, roleNormalized as any);

      created.push({ email, role: roleNormalized || null, password });
    } catch (err) {
      const e = err as Error;
      errors.push({ email: '', error: e.message || 'Unknown error' });
    }
  }

  return NextResponse.json({ created, skipped, errors });
}
