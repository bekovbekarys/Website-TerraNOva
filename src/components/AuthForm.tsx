"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TurnstileWidget } from "@/components/TurnstileWidget";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
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
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {mode === "register" && (
        <>
          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" name="name" required className="input" autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="affiliation">
              Affiliation <span className="text-stone-400">(optional)</span>
            </label>
            <input
              id="affiliation"
              name="affiliation"
              className="input"
              placeholder="University, institute, or organization"
              autoComplete="organization"
            />
          </div>
        </>
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

      <div>
        <div className="flex items-baseline justify-between">
          <label className="label" htmlFor="password">
            Password
          </label>
          {mode === "login" && (
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-terra-700 hover:text-terra-800"
            >
              Forgot password?
            </Link>
          )}
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          className="input"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "register" && (
          <p className="mt-1 text-xs text-stone-500">At least 8 characters.</p>
        )}
      </div>

      {mode === "register" && <TurnstileWidget />}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading
          ? "Please wait…"
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </button>

      <p className="text-center text-sm text-stone-600">
        {mode === "login" ? (
          <>
            New to TerraNova?{" "}
            <Link href="/register" className="font-semibold text-terra-700">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-terra-700">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
