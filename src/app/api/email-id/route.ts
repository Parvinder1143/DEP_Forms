import { requireRole } from "@/lib/auth";
import {
  listEmailIdForms,
  type EmailIdFormStatus,
} from "@/lib/email-id-store";
import type { NextRequest } from "next/server";

// GET /api/email-id?status=PENDING|FORWARDED|ISSUED
export async function GET(request: NextRequest) {
  const user = await requireRole([
    "FORWARDING_AUTHORITY_ACADEMICS",
    "ESTABLISHMENT",
    "FORWARDING_AUTHORITY_R_AND_D",
    "IT_ADMIN",
    "SYSTEM_ADMIN",
  ]);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const normalizedStatus =
    status && ["PENDING", "FORWARDED", "ISSUED"].includes(status)
      ? (status as EmailIdFormStatus)
      : undefined;

  const forms = await listEmailIdForms({
    viewerRole: user.role,
    status: normalizedStatus,
    includeApprovals: true,
  });

  return Response.json(forms);
}
