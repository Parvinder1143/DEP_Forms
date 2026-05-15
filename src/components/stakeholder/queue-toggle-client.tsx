"use client";

import { useState } from "react";

export function QueueToggleClient({
  title,
  description,
  pendingCount,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  pendingCount: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <>
      <div className="queue-card rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
            <p className="mt-2 section-lead text-amber-700">{description}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="queue-cta bg-black text-white transition hover:bg-slate-800 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              {isOpen ? `Hide ${title.replace(" Access", "")}` : `Open ${title.replace(" Access", "")}`}
            </button>
            {pendingCount > 0 ? (
              <span className="absolute -right-2 -top-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white shadow-sm">
                {pendingCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {isOpen && children}
    </>
  );
}
