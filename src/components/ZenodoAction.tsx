"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ZenodoAction({
  id,
  status,
  isDemo,
  configured,
  doi,
  zenodoUrl,
}: {
  id: string;
  status: string;
  isDemo: boolean;
  configured: boolean;
  doi: string | null;
  zenodoUrl: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Already has a DOI: show it.
  if (doi) {
    return (
      <div className="mt-3 rounded-lg border border-terra-200 bg-terra-50 px-3 py-2 text-sm text-terra-800">
        <span className="font-semibold">DOI minted:</span>{" "}
        <a
          href={zenodoUrl || `https://doi.org/${doi}`}
          target="_blank"
          rel="noopener"
          className="font-semibold underline"
        >
          {doi}
        </a>
      </div>
    );
  }

  // Not eligible.
  if (isDemo || status !== "PUBLISHED") return null;

  if (!configured) {
    return (
      <p className="mt-3 text-xs text-stone-400">
        Set <code>ZENODO_TOKEN</code> to enable DOI minting.
      </p>
    );
  }

  async function mint() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/zenodo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "DOI minting failed.");
        setLoading(false);
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Network error.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="btn-secondary"
          disabled={loading}
        >
          Mint DOI on Zenodo
        </button>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            This publishes the preprint to Zenodo and mints a permanent DOI. This
            cannot be undone. Continue?
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={mint} className="btn-primary" disabled={loading}>
              {loading ? "Minting…" : "Yes, mint DOI"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
