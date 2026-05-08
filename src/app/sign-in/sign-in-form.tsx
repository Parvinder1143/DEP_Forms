"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { sendLoginOtp, signInWithEmail, signInWithOtp } from "@/app/actions/auth";
import { getAvailableRoles } from "@/app/actions/roles";
import { getRoleLabel } from "@/lib/roles";
import type { AppRole } from "@/lib/mock-db";

const initialState: { error?: string } = {};
const otpInitialState: { error?: string; success?: string } = {};

type AuthMode = "login" | "signup";

type SignInFormProps = {
  initialMode?: AuthMode;
  showModeToggle?: boolean;
};

export function SignInForm({ initialMode = "login", showModeToggle = true }: SignInFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpFormKey, setOtpFormKey] = useState(0);
  const [otpVerifyKey, setOtpVerifyKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [preferredRole, setPreferredRole] = useState("");
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => signInWithEmail(formData),
    initialState
  );

  const [otpState, otpAction, otpPending] = useActionState(sendLoginOtp, otpInitialState);
  const [otpVerifyState, otpVerifyAction, otpVerifyPending] = useActionState(signInWithOtp, otpInitialState);

  const passwordType = showPassword ? "text" : "password";
  const confirmPasswordType = showConfirmPassword ? "text" : "password";

  useEffect(() => {
    if (!otpRequested || !otpState?.success) return;
    setOtpStep("verify");
  }, [otpRequested, otpState?.success]);

  useEffect(() => {
    if (mode !== "login") {
      setLoginMethod("password");
      setOtpStep("request");
      setOtpRequested(false);
      setOtpFormKey((current) => current + 1);
      setOtpVerifyKey((current) => current + 1);
    }
  }, [mode]);

  useEffect(() => {
    // Fetch available roles on component mount
    const fetchRoles = async () => {
      try {
        const roles = await getAvailableRoles();
        setAvailableRoles(roles);
      } catch (error) {
        console.error("Failed to fetch roles:", error);
      }
    };
    fetchRoles();
  }, []);

  if (mode === "login" && loginMethod === "otp") {
    return (
      <div className="space-y-5">
        <p className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-semibold leading-relaxed text-slate-700">
          Log in with a one-time password (OTP) sent to your email.
        </p>

        <form
          key={otpFormKey}
          action={otpAction}
          onSubmit={() => setOtpRequested(true)}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Email Address</label>
            <input
              name="email"
              type="email"
              required
              value={otpEmail}
              onChange={(event) => {
                setOtpEmail(event.target.value);
                if (otpStep === "verify") {
                  setOtpStep("request");
                  setOtpRequested(false);
                  setOtpFormKey((current) => current + 1);
                  setOtpVerifyKey((current) => current + 1);
                }
              }}
              placeholder="you@iitrpr.ac.in"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          {otpRequested && otpState?.error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {otpState.error}
            </div>
          ) : null}
          {otpRequested && otpState?.success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {otpState.success}
            </div>
          ) : null}

          {otpStep === "request" ? (
            <button
              type="submit"
              disabled={otpPending}
              className={`pop-cta w-full rounded-lg bg-gradient-to-r from-black via-gray-900 to-emerald-700 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-md transition hover:shadow-lg ${
                otpPending ? "opacity-70" : ""
              }`}
            >
              {otpPending ? "Sending OTP" : "Send OTP"}
            </button>
          ) : null}
        </form>

        {otpStep === "verify" ? (
          <form key={otpVerifyKey} action={otpVerifyAction} className="space-y-4">
            <input type="hidden" name="email" value={otpEmail} />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">OTP</label>
              <input
                name="otp"
                type="text"
                required
                placeholder="Enter the OTP"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>



            {otpVerifyState?.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {otpVerifyState.error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={otpVerifyPending}
              className={`pop-cta w-full rounded-lg bg-gradient-to-r from-black via-gray-900 to-emerald-700 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-md transition hover:shadow-lg ${
                otpVerifyPending ? "opacity-70" : ""
              }`}
            >
              {otpVerifyPending ? "Logging in" : "Login"}
            </button>
          </form>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setLoginMethod("password");
            setOtpStep("request");
            setOtpRequested(false);
            setOtpFormKey((current) => current + 1);
            setOtpVerifyKey((current) => current + 1);
          }}
          className="w-full rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-black"
        >
          Use password login instead
        </button>
      </div>
    );
  }

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



      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Email Address</label>
        <input
          name="email"
          type="email"
          required
          placeholder="you@iitrpr.ac.in"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            // Reset preferred role if switching away from @iitrpr.ac.in
            if (!e.target.value.includes("@iitrpr.ac.in")) {
              setPreferredRole("");
            }
          }}
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

      {mode === "login" ? (
        <div className="flex justify-end">
          <Link
            prefetch={false}
            href="/forgot-password"
            className="text-xs font-semibold text-gray-700 transition hover:text-black"
          >
            Forgot password?
          </Link>
        </div>
      ) : null}

      {mode === "signup" ? (
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
      ) : null}

      {mode === "signup" && email.includes("@iitrpr.ac.in") ? (
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Preferred Role (Optional)</label>
          <p className="text-xs text-gray-500 mb-2">
            Select a role if you know it. Admins will review and approve your request.
          </p>
          <select
            name="preferredRole"
            value={preferredRole}
            onChange={(e) => setPreferredRole(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-inner transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          >
            <option value="">I don't have a preference</option>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>
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

      {mode === "login" ? (
        <button
          type="button"
          onClick={() => setLoginMethod("otp")}
          className="w-full rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"
        >
          Login with OTP instead
        </button>
      ) : null}
    </form>
  );
}
