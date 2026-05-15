"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { resetPasswordWithOtp, sendPasswordResetOtp } from "@/app/actions/auth";

const initialState: { error?: string; success?: string } = {};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [cooldown, setCooldown] = useState(0);

  const [requestState, requestAction, requestPending] = useActionState(
    sendPasswordResetOtp,
    initialState
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetPasswordWithOtp,
    initialState
  );

  useEffect(() => {
    if (!requestState?.success) return;
    setStep("verify");
    setCooldown(60);
  }, [requestState?.success]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-xs font-semibold leading-relaxed text-slate-700">
        Enter your email to receive a one-time password (OTP). Use that OTP to set a new password.
      </div>

      <form action={requestAction} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Email Address
          </label>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@iitrpr.ac.in"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        {requestState?.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {requestState.error}
          </div>
        ) : null}
        {requestState?.success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {requestState.success}
          </div>
        ) : null}

        {step === "request" ? (
          <button
            type="submit"
            disabled={requestPending}
            className={`pop-cta w-full rounded-lg bg-gradient-to-r from-black via-gray-900 to-emerald-700 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-md transition hover:shadow-lg ${
              requestPending ? "opacity-70" : ""
            }`}
          >
            {requestPending ? "Sending OTP" : "Send OTP"}
          </button>
        ) : null}
      </form>

      {step === "verify" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs font-semibold leading-relaxed text-slate-600">
            OTP sent to {email || "your email"}. Enter it below to set a new password.
          </div>

          <form action={resetAction} className="space-y-4">
            <input type="hidden" name="email" value={email} />

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

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                New Password
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Create a new password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Confirm Password
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                placeholder="Re-enter your new password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 transition focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            {resetState?.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {resetState.error}
              </div>
            ) : null}
            {resetState?.success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {resetState.success}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={resetPending}
              className={`pop-cta w-full rounded-lg bg-gradient-to-r from-black via-gray-900 to-emerald-700 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-md transition hover:shadow-lg ${
                resetPending ? "opacity-70" : ""
              }`}
            >
              {resetPending ? "Resetting" : "Reset Password"}
            </button>
          </form>

          <form action={requestAction} className="flex justify-center">
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              disabled={requestPending || cooldown > 0}
              className={`rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-black ${
                requestPending || cooldown > 0 ? "opacity-60" : ""
              }`}
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : requestPending ? "Resending" : "Resend OTP"}
            </button>
          </form>
        </div>
      ) : null}

      <div className="text-center">
        <Link prefetch={false} href="/sign-in" className="text-xs font-semibold text-gray-700 transition hover:text-black">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
