"use client";

import { useActionState, useState } from "react";
import { signInWithEmail } from "@/app/actions/auth";

const initialState: { error?: string } = {};

type AuthMode = "login" | "signup";

type SignInFormProps = {
  initialMode?: AuthMode;
  showModeToggle?: boolean;
};

export function SignInForm({ initialMode = "login", showModeToggle = true }: SignInFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => signInWithEmail(formData),
    initialState
  );

  const passwordType = showPassword ? "text" : "password";
  const confirmPasswordType = showConfirmPassword ? "text" : "password";

  return (
    <form action={formAction} className="space-y-5">
      {showModeToggle ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 p-2">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-[linear-gradient(135deg,#111111_0%,#2a2a2a_100%)] text-white shadow"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "signup"
                  ? "bg-[linear-gradient(135deg,#111111_0%,#2a2a2a_100%)] text-white shadow"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Sign up
            </button>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {mode === "login" ? "Returning user" : "New user"}
          </span>
        </div>
      ) : null}

      <input type="hidden" name="mode" value={mode} />

      <p className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-semibold leading-relaxed text-slate-700">
        {mode === "login"
          ? "First time with your IIT Ropar email? Log in directly — your password will be saved for future logins."
          : "Create your account with your institute email. Password must be at least 6 characters."}
      </p>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Email Address</label>
        <input
          name="email"
          type="email"
          required
          placeholder="you@iitrpr.ac.in"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Password</label>
        <div className="relative">
          <input
            name="password"
            type={passwordType}
            required
            minLength={6}
            placeholder={mode === "login" ? "Enter your password" : "Create a password"}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-14 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-800 transition hover:text-black"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {mode === "signup" ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Confirm Password</label>
            <div className="relative">
              <input
                name="confirmPassword"
                type={confirmPasswordType}
                required
                minLength={6}
                placeholder="Re-enter your password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-14 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-800 transition hover:text-black"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "login" ? (
        <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
            <span>Logging in for the first time as an IIT Ropar student?</span>
            <span aria-hidden="true" className="text-slate-500">▾</span>
          </summary>
          <div className="mt-3 border-t border-slate-200 pt-3">
            <label className="flex items-center gap-2">
              <input
                name="signupAsStudent"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>I am signing in as a student (@iitrpr.ac.in only).</span>
            </label>
          </div>
        </details>
      ) : null}

      {state?.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`pop-cta mx-auto block rounded-lg bg-gradient-to-r from-black via-gray-900 to-emerald-700 px-6 py-3 text-base font-semibold uppercase tracking-[0.08em] text-white shadow-md transition hover:shadow-lg ${
          pending ? "opacity-70" : ""
        }`}
      >
        {pending ? "Login" : "Login"}
      </button>
    </form>
  );
}
