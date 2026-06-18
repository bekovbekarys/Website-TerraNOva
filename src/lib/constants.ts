export const SITE_NAME = "TerraNova";
export const SITE_TAGLINE =
  "An open preprint server for the Earth and environmental sciences";
export const SITE_DESCRIPTION =
  "TerraNova is a free, community-led repository where researchers share preprints across the Earth, planetary, and environmental sciences — open to read, open to submit.";

// Subject taxonomy for the Earth & environmental sciences.
export const SUBJECTS: string[] = [
  "Atmospheric Sciences",
  "Biogeosciences",
  "Climatology",
  "Environmental Sciences",
  "Geochemistry",
  "Geology",
  "Geomorphology",
  "Geophysics & Seismology",
  "Glaciology",
  "Hydrology",
  "Mineralogy & Petrology",
  "Natural Hazards",
  "Oceanography",
  "Paleontology",
  "Planetary Sciences",
  "Remote Sensing",
  "Soil Science",
  "Sustainability & Policy",
  "Tectonics & Structural Geology",
  "Volcanology",
];

export const LICENSES: string[] = [
  "CC BY 4.0",
  "CC BY-SA 4.0",
  "CC BY-NC 4.0",
  "CC BY-NC-ND 4.0",
  "CC0 1.0 (Public Domain)",
  "All rights reserved",
];

export const STATUS = {
  PENDING: "PENDING",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
} as const;

export type PreprintStatus = (typeof STATUS)[keyof typeof STATUS];

export const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 MB
