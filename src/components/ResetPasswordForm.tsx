"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          This reset link is missing its token. Please request a new one.
        </div>
        <p className="text-sm text-stone-600">
          <Link href="/forgot-password" className="font-semibold text-terra-700">
            Request a new link
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
        <label className="label" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="input"
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-stone-500">At least 8 characters.</p>
      </div>

      <div>
        <label className="label" htmlFor="confirm">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          className="input"
          autoComplete="new-password"
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Please wait…" : "Set new password"}
      </button>
    </form>
  );
}
