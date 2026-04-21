import { getCurrentUser, getDashboardPathForRole } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json(
    {
      authenticated: true,
      role: user.role,
      dashboardPath: user.role === "SYSTEM_ADMIN" ? "/admin" : await getDashboardPathForRole(user.role),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}