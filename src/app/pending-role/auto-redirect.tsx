"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type SessionRoleResponse = {
  authenticated: boolean;
  role: string | null;
  dashboardPath: string;
};

export function PendingRoleAutoRedirect() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const checkRole = async () => {
      try {
        const response = await fetch("/api/auth/session-role", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SessionRoleResponse;
        if (!active) {
          return;
        }

        if (data.authenticated && data.role) {
          router.replace(data.dashboardPath);
        }
      } catch {
        // Best effort poller; silent fail and retry in next interval.
      }
    };

    checkRole();
    const timer = setInterval(checkRole, 4000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [router]);

  return (
    <p className="mt-2 text-xs text-slate-500">
      Waiting for role assignment. This page updates automatically.
    </p>
  );
}
