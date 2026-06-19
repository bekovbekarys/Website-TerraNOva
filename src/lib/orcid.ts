// Helpers for working with ORCID iDs. An ORCID iD is 16 digits shown in
// groups of four, where the final character may be an "X" checksum.

/** Strips a full orcid.org URL and surrounding whitespace, leaving the bare iD. */
export function normalizeOrcid(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/orcid\.org\//i, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function isValidOrcid(input: string): boolean {
  return /^(\d{4}-){3}\d{3}[\dX]$/.test(normalizeOrcid(input));
}

export function orcidUrl(orcid: string): string {
  return `https://orcid.org/${normalizeOrcid(orcid)}`;
}
