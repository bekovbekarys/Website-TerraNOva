import { normalizeOrcid, orcidUrl } from "@/lib/orcid";

// Renders an ORCID iD as a link with the official green ORCID logo.
export function OrcidLink({
  orcid,
  className = "",
}: {
  orcid: string;
  className?: string;
}) {
  const id = normalizeOrcid(orcid);
  return (
    <a
      href={orcidUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-[#a6ce39] hover:underline ${className}`}
      title={`ORCID iD: ${id}`}
    >
      <svg
        viewBox="0 0 256 256"
        className="h-4 w-4"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0z" />
        <g fill="#fff">
          <path d="M86.3 186.2H70.9V79.1h15.4v107.1z" />
          <path d="M108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7 0-21.5-13.7-39.7-43.7-39.7h-23.7v79.4z" />
          <path d="M88.7 56.8c0 5.5-4.5 10.1-10.1 10.1-5.6 0-10.1-4.6-10.1-10.1 0-5.6 4.5-10.1 10.1-10.1 5.6 0 10.1 4.6 10.1 10.1z" />
        </g>
      </svg>
      <span className="text-xs font-medium">{id}</span>
    </a>
  );
}
