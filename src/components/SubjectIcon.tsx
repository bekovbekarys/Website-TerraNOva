// Themed line icons for each Earth-science subject area. Stroke uses
// currentColor so the icon inherits text colour. Falls back to a globe.
const ICONS: Record<string, React.ReactNode> = {
  "Atmospheric Sciences": (
    <path d="M7 17h9a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 7 11a3 3 0 0 0 0 6Z" />
  ),
  Biogeosciences: (
    <path d="M5 19c0-7 5-11 14-11 0 9-4 13-11 13M8 16c2-3 4-5 7-6" />
  ),
  Climatology: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </>
  ),
  "Environmental Sciences": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  Geochemistry: (
    <path d="M9 3h6M10 3v5L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8V3M8 14h8" />
  ),
  Geology: (
    <path d="M3 7l9-4 9 4-9 4-9-4ZM3 12l9 4 9-4M3 17l9 4 9-4" />
  ),
  Geomorphology: (
    <path d="M3 19l5-8 3 4 4-7 6 11H3Z" />
  ),
  "Geophysics & Seismology": (
    <path d="M3 12h3l2-6 3 13 3-9 2 5h5" />
  ),
  Glaciology: (
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4M12 6l-2 2m2-2 2 2m-2 10-2-2m2 2 2-2M6 12l2-2m-2 2 2 2m10-2-2-2m2 2-2 2" />
  ),
  Hydrology: (
    <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" />
  ),
  "Mineralogy & Petrology": (
    <path d="M6 3h12l3 6-9 12L3 9l3-6ZM3 9h18M9 3 6 9l6 12 6-12-3-6" />
  ),
  "Natural Hazards": (
    <path d="M12 4 2.5 20h19L12 4ZM12 10v4M12 17.5v.5" />
  ),
  Oceanography: (
    <path d="M3 8c2 0 2.5-2 4.5-2S10 8 12 8s2.5-2 4.5-2S19 8 21 8M3 13c2 0 2.5-2 4.5-2S10 13 12 13s2.5-2 4.5-2S19 13 21 13M3 18c2 0 2.5-2 4.5-2S10 18 12 18s2.5-2 4.5-2S19 18 21 18" />
  ),
  Paleontology: (
    <path d="M14 4a6 6 0 1 0 4 10 3 3 0 1 0 0-6M14 4a4 4 0 0 1 0 8M11 9a2 2 0 1 0 0 .01" />
  ),
  "Planetary Sciences": (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <path d="M4 16c4 2.5 12 2.5 16 0M4 8c1-1.6 4-2.6 8-2.6" opacity="0.9" />
      <path d="M3.5 14.5c-1 1.8-1.2 3.3-.4 4.1 1.6 1.6 7-.2 12-4.1s8.4-8.8 6.8-10.4c-.8-.8-2.4-.6-4.3.3" />
    </>
  ),
  "Remote Sensing": (
    <path d="M5 19l4-4M3 10a8 8 0 0 1 8-8M6 11a5 5 0 0 1 5-5M8.5 14.5l3-3 4 4-3 3-4-4ZM15 9l3-3M14 5l5 5" />
  ),
  "Soil Science": (
    <path d="M12 13c0-4 3-7 3-7s-1 5 1 7M12 13c0-3-3-5-3-5s.5 3-1 5M12 13v3M3 16h18l-1.5 4H4.5L3 16Z" />
  ),
  "Sustainability & Policy": (
    <path d="M7 7l-3 1 1.5 3M4 8a8 8 0 0 1 12-2M17 17l3-1-1.5-3M20 16a8 8 0 0 1-12 2M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />
  ),
  "Tectonics & Structural Geology": (
    <path d="M3 9h7l-2 3 3 2-2 4M21 7h-6l2 3-3 2 2 3" />
  ),
  Volcanology: (
    <path d="M9 9 7 4M9 9l-2 5M9 9l3 2 3-2M15 9l2 5M15 9l2-5M4 20h16l-3-6h-2l-3 2-3-2H7l-3 6Z" />
  ),
};

const FALLBACK = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>
);

export function SubjectIcon({
  subject,
  className,
}: {
  subject: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[subject] ?? FALLBACK}
    </svg>
  );
}
