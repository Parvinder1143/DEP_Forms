import DotGridBackground from "@/components/dot-grid-background";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f4f4f5_45%,#ecfdf3_75%,#f5f3ff_100%)]">
      <DotGridBackground />
      <div className="pointer-events-none absolute -top-16 -left-10 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-1/3 h-56 w-56 rounded-full bg-amber-200/25 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-start justify-center px-4 pt-12 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div
              className="mb-4 inline-flex h-[52px] w-[52px] items-center justify-center rounded-2xl shadow-md"
              style={{ background: "linear-gradient(135deg, #111111 0%, #2a2a2a 100%)" }}
            >
              <span className="text-sm font-bold tracking-wide text-white">IR</span>
            </div>
            <h1 className="bg-linear-to-r from-black via-zinc-800 to-emerald-700 bg-clip-text text-3xl font-extrabold text-transparent">
              Reset password
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">IIT Ropar · Official Forms Portal</p>
          </div>

          <div className="pop-panel rounded-2xl border border-gray-100 bg-white p-8 shadow-lg shadow-gray-100/80">
            <ForgotPasswordForm />
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">© 2026 Indian Institute of Technology Ropar</p>
        </div>
      </div>
    </div>
  );
}
