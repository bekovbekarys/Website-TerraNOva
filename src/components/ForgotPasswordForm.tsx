"use client";

import { useState } from "react";
import Link from "next/link";
import { TurnstileWidget } from "@/components/TurnstileWidget";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          If an account exists for that email, we&apos;ve sent a link to reset
          your password. Please check your inbox.
        </div>
        <p className="text-sm text-stone-600">
          <Link href="/login" className="font-semibold text-terra-700">
            Return to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="input"
          autoComplete="email"
        />
      </div>

      <TurnstileWidget />

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Please wait…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-stone-600">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-terra-700">
          Sign in
        </Link>
      </p>
    </form>
  );
}
