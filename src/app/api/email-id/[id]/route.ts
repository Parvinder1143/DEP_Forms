import { requireRole } from "@/lib/auth";
import { getEmailIdFormById } from "@/lib/email-id-store";
import type { NextRequest } from "next/server";

// GET /api/email-id/[id]
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/email-id/[id]">
) {
  await requireRole([
    "FORWARDING_AUTHORITY_ACADEMICS",
    "ESTABLISHMENT",
    "FORWARDING_AUTHORITY_R_AND_D",
    "IT_ADMIN",
    "SYSTEM_ADMIN",
  ]);
  const { id } = await ctx.params;

  const form = await getEmailIdFormById(id);

  if (!form) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return Response.json(form);
}
