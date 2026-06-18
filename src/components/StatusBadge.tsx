const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-terra-100 text-terra-800",
  REJECTED: "bg-red-100 text-red-700",
};

const LABELS: Record<string, string> = {
  PENDING: "Under moderation",
  PUBLISHED: "Published",
  REJECTED: "Not accepted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STYLES[status] ?? "bg-stone-100 text-stone-600"}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
