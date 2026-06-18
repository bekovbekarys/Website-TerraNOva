"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccountForm({
  initial,
}: {
  initial: {
    name: string;
    email: string;
    affiliation: string;
    orcid: string;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed.");
      } else {
        setMessage("Your account has been updated.");
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message && (
        <div className="rounded-lg border border-terra-200 bg-terra-50 px-4 py-3 text-sm text-terra-800">
          {message}
        </div>
      )}
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
          value={initial.email}
          disabled
          className="input bg-stone-100 text-stone-500"
        />
        <p className="mt-1 text-xs text-stone-500">Email cannot be changed.</p>
      </div>

      <div>
        <label className="label" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial.name}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="affiliation">
          Affiliation
        </label>
        <input
          id="affiliation"
          name="affiliation"
          defaultValue={initial.affiliation}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="orcid">
          ORCID iD <span className="text-stone-400">(optional)</span>
        </label>
        <input
          id="orcid"
          name="orcid"
          defaultValue={initial.orcid}
          className="input"
          placeholder="0000-0000-0000-0000"
        />
      </div>

      <div>
        <label className="label" htmlFor="newPassword">
          New password <span className="text-stone-400">(leave blank to keep)</span>
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          className="input"
          autoComplete="new-password"
        />
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
