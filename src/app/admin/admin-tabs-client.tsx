"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export const ADMIN_TABS = [
  { key: "role-requests", label: "Role Requests" },
  { key: "delegation-requests", label: "Delegation Requests" },
  { key: "users", label: "Users" },
  { key: "email-queue", label: "Email Queue" },
  { key: "vehicle-queue", label: "Vehicle Queue" },
  { key: "id-card-queue", label: "ID Card Queue" },
  { key: "guest-house-queue", label: "Guest House Queue" },
  { key: "undertaking-queue", label: "Undertaking Queue" },
  { key: "approval-logs", label: "Approval Logs" },
] as const;

export type AdminTabKey = (typeof ADMIN_TABS)[number]["key"];

export function isAdminTabKey(value: string): value is AdminTabKey {
  return ADMIN_TABS.some((tab) => tab.key === value);
}

export function AdminTabsClient({
  initialTab,
  sections,
}: {
  initialTab: AdminTabKey;
  sections: Record<string, React.ReactNode>;
}) {
  const [activeTab, setActiveTab] = useState<AdminTabKey>(initialTab);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  function handleTabClick(tabKey: AdminTabKey) {
    if (activeTab === tabKey) return;
    setActiveTab(tabKey);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabKey);
    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  }

  return (
    <>
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex min-w-[980px] gap-3">
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={
                activeTab === tab.key
                  ? "rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition-all transform hover:scale-[1.02] shadow-sm active:scale-95"
                  : "rounded-xl px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all hover:text-slate-900 active:scale-95"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* activeTab determines which pre-rendered section we display */}
      <div className="mt-6">
        {sections[activeTab] || (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">
              {ADMIN_TABS.find((tab) => tab.key === activeTab)?.label}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This section UI is ready. Queue data wiring for this tab will be added next.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
