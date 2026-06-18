"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ModerationActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function act(action: "publish" | "reject" | "unpublish", noteText?: string) {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, note: noteText ?? "" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Action failed.");
        setLoading(null);
        return;
      }
      setShowReject(false);
      setNote("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-4 border-t border-stone-100 pt-4">
      {error && (
        <p className="mb-2 text-sm text-red-600">{error}</p>
      )}

      {!showReject ? (
        <div className="flex flex-wrap gap-2">
          {status !== "PUBLISHED" && (
            <button
              onClick={() => act("publish")}
              disabled={loading !== null}
              className="btn-primary"
            >
              {loading === "publish" ? "Publishing…" : "Publish"}
            </button>
          )}
          {status !== "REJECTED" && (
            <button
              onClick={() => setShowReject(true)}
              disabled={loading !== null}
              className="btn-danger"
            >
              Reject
            </button>
          )}
          {status === "PUBLISHED" && (
            <button
              onClick={() => act("unpublish")}
              disabled={loading !== null}
              className="btn-secondary"
            >
              {loading === "unpublish" ? "Unpublishing…" : "Unpublish"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="label">Reason for rejection (shared with author)</label>
          <textarea
            className="input"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Out of scope for Earth sciences; not a scholarly manuscript."
          />
          <div className="flex gap-2">
            <button
              onClick={() => act("reject", note)}
              disabled={loading !== null}
              className="btn-danger"
            >
              {loading === "reject" ? "Rejecting…" : "Confirm rejection"}
            </button>
            <button
              onClick={() => {
                setShowReject(false);
                setNote("");
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
