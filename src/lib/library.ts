// The Central Asia open-access library.
//
// Papers come from OpenAlex (https://openalex.org), a free index of the world's
// scholarly works. The server pulls a few hundred to a thousand open-access
// articles about Central Asia in the Earth and environmental sciences, tags
// each one by country, landscape and theme, and keeps the result in memory and
// on disk for a week, so OpenAlex is called only a handful of times per week.
//
// Optional environment variables:
//   OPENALEX_API_KEY    free key from openalex.org/settings/api (raises the daily limit)
//   OPENALEX_MAILTO     contact email sent with requests, as OpenAlex asks
//   OPENALEX_BASE_URL   override the API host (used for local testing)
//   LIBRARY_CACHE_FILE  where the cached library is stored on disk

import { promises as fs } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LibraryAuthor = { name: string; institution?: string };

export type LibraryPaper = {
  id: string; // OpenAlex short id, e.g. "W2741809807"
  doi: string | null; // bare DOI, e.g. "10.3390/w12010001"
  title: string;
  authors: LibraryAuthor[];
  authorCount: number;
  year: number;
  date: string | null;
  journal: string | null;
  abstract: string;
  keywords: string[];
  topic: string | null;
  subfield: string | null;
  field: string | null;
  citations: number;
  oaStatus: string; // gold | green | hybrid | bronze | diamond
  license: string | null;
  landingUrl: string | null;
  pdfUrl: string | null;
  places: PlaceKey[];
  themes: ThemeKey[];
};

export type Library = {
  fetchedAt: string;
  papers: LibraryPaper[];
};

// ---------------------------------------------------------------------------
// Places and themes
// ---------------------------------------------------------------------------

export type PlaceKey =
  | "kazakhstan"
  | "uzbekistan"
  | "kyrgyzstan"
  | "tajikistan"
  | "turkmenistan"
  | "aral"
  | "caspian"
  | "mountains"
  | "drylands";

export const PLACES: {
  key: PlaceKey;
  label: string;
  kind: "country" | "landscape";
  pattern: RegExp;
  countryCode?: string;
}[] = [
  {
    key: "kazakhstan",
    label: "Kazakhstan",
    kind: "country",
    countryCode: "KZ",
    pattern:
      /kazakh|almaty|astana|nur-sultan|balkhash|balqash|semipalatinsk|karaganda|qaraghandy|ile[- ]alatau|zhetysu|mangystau|mangyshlak|baikonur|kokshetau|shymkent/i,
  },
  {
    key: "uzbekistan",
    label: "Uzbekistan",
    kind: "country",
    countryCode: "UZ",
    pattern:
      /uzbek|tashkent|karakalpak|samarkand|samarqand|bukhara|khorezm|khorazm|navoi|surkhandarya|kashkadarya|andijan|namangan/i,
  },
  {
    key: "kyrgyzstan",
    label: "Kyrgyzstan",
    kind: "country",
    countryCode: "KG",
    pattern: /kyrgyz|kirghiz|bishkek|issyk|naryn|osh region|talas|chon[- ]kemin|chuy|chui valley/i,
  },
  {
    key: "tajikistan",
    label: "Tajikistan",
    kind: "country",
    countryCode: "TJ",
    pattern: /tajik|dushanbe|fedchenko|vakhsh|rogun|khatlon|gorno[- ]badakhshan|sarez|panj river|kafirnigan/i,
  },
  {
    key: "turkmenistan",
    label: "Turkmenistan",
    kind: "country",
    countryCode: "TM",
    pattern: /turkmen|ashgabat|ashkhabad|karakum|kara[- ]kum|garabogaz|kara[- ]bogaz|darvaza|kopet[- ]?dag/i,
  },
  {
    key: "aral",
    label: "Aral Sea basin",
    kind: "landscape",
    pattern: /\baral|amu[- ]?darya|syr[- ]?darya|aralkum|zarafshan|zeravshan/i,
  },
  {
    key: "caspian",
    label: "Caspian Sea",
    kind: "landscape",
    pattern: /caspian/i,
  },
  {
    key: "mountains",
    label: "Tien Shan & Pamir",
    kind: "landscape",
    pattern: /tien[- ]?shan|tian[- ]?shan|pamir|\balai\b|\balay\b|hindu kush|karakoram|altai|dzungar|junggar alatau/i,
  },
  {
    key: "drylands",
    label: "Steppes & deserts",
    kind: "landscape",
    pattern: /steppe|kyzyl[- ]?kum|qizilqum|desert|semi-?arid|dryland|arid (central )?asia/i,
  },
];

export type ThemeKey =
  | "water"
  | "climate"
  | "cryosphere"
  | "land"
  | "ecology"
  | "pollution"
  | "geology"
  | "hazards"
  | "agriculture"
  | "remote";

export const THEMES: {
  key: ThemeKey;
  label: string;
  short: string;
  // Tailwind classes for this theme's accent colour
  chip: string;
  dot: string;
  bar: string;
  pattern: RegExp;
}[] = [
  {
    key: "water",
    label: "Water & rivers",
    short: "Water",
    chip: "bg-sky-50 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    bar: "from-sky-400 to-cyan-500",
    pattern:
      /hydrolog|water|river|lake|runoff|streamflow|discharge|groundwater|aquifer|irrigation|basin|reservoir|drainage|evapotranspiration|flood/i,
  },
  {
    key: "climate",
    label: "Climate & atmosphere",
    short: "Climate",
    chip: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    bar: "from-amber-400 to-orange-500",
    pattern:
      /climat|temperature|precipitation|drought|warming|atmospher|aerosol|\bdust|monsoon|westerl|weather|cmip|rainfall|heat ?wave/i,
  },
  {
    key: "cryosphere",
    label: "Glaciers & snow",
    short: "Cryosphere",
    chip: "bg-indigo-50 text-indigo-800 ring-indigo-200",
    dot: "bg-indigo-500",
    bar: "from-indigo-400 to-sky-400",
    pattern: /glacie|snow|permafrost|cryosphere|\bice\b|meltwater|icefield/i,
  },
  {
    key: "land",
    label: "Soils & land degradation",
    short: "Land",
    chip: "bg-orange-50 text-orange-800 ring-orange-200",
    dot: "bg-orange-600",
    bar: "from-orange-400 to-rose-500",
    pattern:
      /soil|land degradation|desertification|salinit|saliniz|salinis|erosion|land use|land cover|land-use|land-cover|grazing|pasture|rangeland/i,
  },
  {
    key: "ecology",
    label: "Ecosystems & biodiversity",
    short: "Ecology",
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    bar: "from-emerald-400 to-teal-500",
    pattern:
      /ecosystem|biodivers|vegetation|forest|species|habitat|wildlife|ecolog|plant|ndvi|carbon|biomass|wetland|saiga|fauna|flora/i,
  },
  {
    key: "pollution",
    label: "Pollution & health",
    short: "Pollution",
    chip: "bg-rose-50 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
    bar: "from-rose-400 to-fuchsia-500",
    pattern:
      /pollut|contamina|heavy metal|pesticide|toxic|health|radionucl|radioactiv|uranium|nuclear test|air quality|pm2\.5|particulate|mercury|arsenic/i,
  },
  {
    key: "geology",
    label: "Geology & tectonics",
    short: "Geology",
    chip: "bg-stone-100 text-stone-800 ring-stone-300",
    dot: "bg-stone-500",
    bar: "from-stone-400 to-stone-600",
    pattern:
      /tecton|geolog|\bfault|orogen|crust|mantle|sediment|basalt|granite|magmat|geochem|paleo|palaeo|loess|stratigraph|mineral|\bore\b|\bores\b|isotop|holocene|pleistocene|quaternary|geomorph/i,
  },
  {
    key: "hazards",
    label: "Earthquakes & hazards",
    short: "Hazards",
    chip: "bg-red-50 text-red-800 ring-red-200",
    dot: "bg-red-500",
    bar: "from-red-400 to-orange-500",
    pattern: /earthquake|seismic|seismo|landslide|mudflow|debris flow|hazard|glacial lake outburst|glof|avalanche|disaster/i,
  },
  {
    key: "agriculture",
    label: "Agriculture & food",
    short: "Agriculture",
    chip: "bg-lime-50 text-lime-800 ring-lime-200",
    dot: "bg-lime-600",
    bar: "from-lime-400 to-emerald-500",
    pattern: /agricultur|crop|cotton|wheat|\brice\b|yield|farm|livestock|food security|cropland/i,
  },
  {
    key: "remote",
    label: "Remote sensing & modelling",
    short: "Remote sensing",
    chip: "bg-violet-50 text-violet-800 ring-violet-200",
    dot: "bg-violet-500",
    bar: "from-violet-400 to-indigo-500",
    pattern: /remote sensing|satellite|landsat|modis|sentinel|\bgrace\b|insar|lidar|google earth engine|machine learning|deep learning|model(l)?ing/i,
  },
];

export const PLACE_BY_KEY = Object.fromEntries(PLACES.map((p) => [p.key, p])) as Record<
  PlaceKey,
  (typeof PLACES)[number]
>;
export const THEME_BY_KEY = Object.fromEntries(THEMES.map((t) => [t.key, t])) as Record<
  ThemeKey,
  (typeof THEMES)[number]
>;

// ---------------------------------------------------------------------------
// Fetching from OpenAlex
// ---------------------------------------------------------------------------

const BASE_URL = (process.env.OPENALEX_BASE_URL || "https://api.openalex.org").replace(/\/$/, "");
const CACHE_FILE =
  process.env.LIBRARY_CACHE_FILE || path.join(process.cwd(), "data", "library-cache.json");
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // refresh weekly
const RETRY_AFTER_FAILURE_MS = 30 * 60 * 1000; // after a failed refresh, wait before trying again
const MIN_PAPERS = 60; // a query returning fewer is treated as not working

// Places and features that define "Central Asia" for the search.
const REGION_TERMS = [
  '"Central Asia"',
  "Kazakhstan",
  "Uzbekistan",
  "Kyrgyzstan",
  "Tajikistan",
  "Turkmenistan",
  '"Aral Sea"',
  '"Amu Darya"',
  '"Syr Darya"',
  '"Tien Shan"',
  '"Tian Shan"',
  "Pamir",
  '"Lake Balkhash"',
  '"Issyk-Kul"',
  '"Caspian Sea"',
];
const REGION_QUERY = REGION_TERMS.join(" OR ");

// OpenAlex fields: 19 = Earth and Planetary Sciences, 23 = Environmental Science.
const EARTH_FIELD_IDS = "19|23";
const EARTH_FIELD_NAMES = new Set(["Earth and Planetary Sciences", "Environmental Science"]);

const SELECT_FIELDS = [
  "id",
  "doi",
  "display_name",
  "publication_year",
  "publication_date",
  "authorships",
  "primary_location",
  "best_oa_location",
  "open_access",
  "cited_by_count",
  "abstract_inverted_index",
  "primary_topic",
  "keywords",
  "type",
].join(",");

type Sweep = { label: string; filters: string[]; sort: string; pages: number };

// Two sweeps: the most-cited papers of all time, then the most-cited recent ones,
// so the library mixes landmark studies with current research.
function sweeps(withFieldFilter: boolean): Sweep[] {
  const thisYear = new Date().getFullYear();
  const base = [
    `title_and_abstract.search:${REGION_QUERY}`,
    "is_oa:true",
    "type:article",
    ...(withFieldFilter ? [`primary_topic.field.id:${EARTH_FIELD_IDS}`] : []),
  ];
  return [
    { label: "most-cited", filters: base, sort: "cited_by_count:desc", pages: 3 },
    {
      label: "recent",
      filters: [...base, `publication_year:${thisYear - 4}-${thisYear}`],
      sort: "cited_by_count:desc",
      pages: 2,
    },
  ];
}

function buildUrl(sweep: Sweep, page: number): string {
  const params = new URLSearchParams({
    filter: sweep.filters.join(","),
    sort: sweep.sort,
    "per-page": "200",
    page: String(page),
    select: SELECT_FIELDS,
  });
  if (process.env.OPENALEX_API_KEY) params.set("api_key", process.env.OPENALEX_API_KEY);
  if (process.env.OPENALEX_MAILTO) params.set("mailto", process.env.OPENALEX_MAILTO);
  return `${BASE_URL}/works?${params.toString()}`;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "TerraNova Library (https://github.com/bekovbekarys/website-terranova)" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAlex ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function runSweeps(withFieldFilter: boolean): Promise<LibraryPaper[]> {
  const urls = sweeps(withFieldFilter).flatMap((sweep) =>
    Array.from({ length: sweep.pages }, (_, i) => buildUrl(sweep, i + 1))
  );
  const settled = await Promise.allSettled(urls.map(fetchJson));
  const ok = settled.filter((s): s is PromiseFulfilledResult<any> => s.status === "fulfilled");
  if (ok.length === 0) throw (settled[0] as PromiseRejectedResult).reason;

  const byId = new Map<string, LibraryPaper>();
  for (const { value } of ok) {
    const results: any[] = Array.isArray(value?.results) ? value.results : [];
    for (const raw of results) {
      // Always confirm the field locally too, in case the API-side filter misbehaves.
      const paper = normalizeWork(raw, true);
      if (paper && !byId.has(paper.id)) byId.set(paper.id, paper);
    }
  }
  return [...byId.values()];
}

async function fetchFromOpenAlex(): Promise<Library> {
  let papers: LibraryPaper[] = [];
  let firstError: unknown = null;

  // Preferred: let OpenAlex restrict to Earth & environmental fields.
  try {
    papers = await runSweeps(true);
  } catch (err) {
    firstError = err;
  }

  // Fallback: search without the field filter and keep matching fields locally.
  if (papers.length < MIN_PAPERS) {
    try {
      const more = await runSweeps(false);
      const seen = new Set(papers.map((p) => p.id));
      papers = [...papers, ...more.filter((p) => !seen.has(p.id))];
    } catch (err) {
      if (papers.length === 0) throw firstError ?? err;
    }
  }

  if (papers.length === 0) throw firstError ?? new Error("OpenAlex returned no papers");
  papers.sort((a, b) => b.citations - a.citations);
  return { fetchedAt: new Date().toISOString(), papers };
}

// ---------------------------------------------------------------------------
// Normalising OpenAlex records
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  deg: "°",
};

export function cleanText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function rebuildAbstract(index: unknown): string {
  if (!index || typeof index !== "object") return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index as Record<string, number[]>)) {
    if (!Array.isArray(positions)) continue;
    for (const pos of positions) {
      if (Number.isInteger(pos) && pos >= 0 && pos < 5000) words[pos] = word;
    }
  }
  let text = cleanText(words.filter(Boolean).join(" "));
  // Some records carry a leading "Abstract" label
  text = text.replace(/^abstract[:.\s]+/i, "");
  return text.length > 4000 ? text.slice(0, 4000).trimEnd() + "…" : text;
}

function safeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  try {
    const u = new URL(input);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function prettyLicense(license: unknown): string | null {
  if (typeof license !== "string" || !license) return null;
  const map: Record<string, string> = {
    "cc-by": "CC BY",
    "cc-by-sa": "CC BY-SA",
    "cc-by-nc": "CC BY-NC",
    "cc-by-nd": "CC BY-ND",
    "cc-by-nc-sa": "CC BY-NC-SA",
    "cc-by-nc-nd": "CC BY-NC-ND",
    "public-domain": "Public domain",
    cc0: "CC0",
  };
  return map[license.toLowerCase()] ?? license.replace(/-/g, " ").toUpperCase();
}

export function normalizeWork(raw: any, checkField: boolean): LibraryPaper | null {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id.split("/").pop() : null;
  if (!id || !/^W\d+$/.test(id)) return null;

  const title = cleanText(raw.display_name ?? raw.title);
  if (!title) return null;

  const field = cleanText(raw.primary_topic?.field?.display_name) || null;
  if (checkField && (!field || !EARTH_FIELD_NAMES.has(field))) return null;

  const oa = raw.best_oa_location ?? null;
  const landingUrl =
    safeUrl(oa?.landing_page_url) ?? safeUrl(raw.open_access?.oa_url) ?? safeUrl(raw.primary_location?.landing_page_url);
  const pdfUrl = safeUrl(oa?.pdf_url);
  if (!raw.open_access?.is_oa || (!landingUrl && !pdfUrl)) return null;

  const authorships: any[] = Array.isArray(raw.authorships) ? raw.authorships : [];
  const authors: LibraryAuthor[] = authorships
    .map((a) => ({
      name: cleanText(a?.author?.display_name),
      institution: cleanText(a?.institutions?.[0]?.display_name) || undefined,
    }))
    .filter((a) => a.name);
  const institutionCountries = new Set<string>(
    authorships.flatMap((a) =>
      Array.isArray(a?.institutions) ? a.institutions.map((i: any) => i?.country_code).filter(Boolean) : []
    )
  );

  const abstract = rebuildAbstract(raw.abstract_inverted_index);
  const keywords: string[] = (Array.isArray(raw.keywords) ? raw.keywords : [])
    .map((k: any) => cleanText(k?.display_name))
    .filter(Boolean)
    .slice(0, 8);
  const topic = cleanText(raw.primary_topic?.display_name) || null;
  const subfield = cleanText(raw.primary_topic?.subfield?.display_name) || null;

  // Tag places named in the text. Only if no country is named, fall back to the
  // countries of the authors' institutions.
  const placeText = `${title} ${abstract} ${keywords.join(" ")}`;
  let places = PLACES.filter((p) => p.pattern.test(placeText)).map((p) => p.key);
  if (!places.some((k) => PLACE_BY_KEY[k].kind === "country")) {
    const fromAuthors = PLACES.filter((p) => p.countryCode && institutionCountries.has(p.countryCode)).map((p) => p.key);
    places = [...fromAuthors, ...places];
  }

  const themeText = `${title} ${keywords.join(" ")} ${topic ?? ""} ${subfield ?? ""}`;
  let themes = THEMES.filter((t) => t.pattern.test(themeText)).map((t) => t.key);
  if (themes.length === 0) themes = THEMES.filter((t) => t.pattern.test(abstract)).map((t) => t.key);
  themes = themes.slice(0, 3);

  const doi = typeof raw.doi === "string" ? raw.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") : null;
  const year = Number(raw.publication_year) || 0;
  if (!year) return null;

  return {
    id,
    doi,
    title,
    authors: authors.slice(0, 20),
    authorCount: authors.length,
    year,
    date: typeof raw.publication_date === "string" ? raw.publication_date : null,
    journal:
      cleanText(raw.primary_location?.source?.display_name) || cleanText(oa?.source?.display_name) || null,
    abstract,
    keywords,
    topic,
    subfield,
    field,
    citations: Number(raw.cited_by_count) || 0,
    oaStatus: typeof raw.open_access?.oa_status === "string" ? raw.open_access.oa_status : "green",
    license: prettyLicense(oa?.license),
    landingUrl,
    pdfUrl,
    places,
    themes,
  };
}

// ---------------------------------------------------------------------------
// Cache: memory first, then disk, then OpenAlex
// ---------------------------------------------------------------------------

// Kept on globalThis so the startup hook and the pages (which Next.js bundles
// separately) share one cache and one in-flight request.
type CacheState = {
  memory: Library | null;
  inFlight: Promise<Library | null> | null;
  lastFailureAt: number;
  lastError: string | null;
};
const globalForLibrary = globalThis as unknown as { __terranovaLibrary?: CacheState };
const state: CacheState = (globalForLibrary.__terranovaLibrary ??= {
  memory: null,
  inFlight: null,
  lastFailureAt: 0,
  lastError: null,
});

async function readDisk(): Promise<Library | null> {
  try {
    const data = JSON.parse(await fs.readFile(CACHE_FILE, "utf8"));
    if (Array.isArray(data?.papers) && typeof data.fetchedAt === "string") return data as Library;
  } catch {
    // no cache yet
  }
  return null;
}

async function writeDisk(lib: Library) {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    const tmp = `${CACHE_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(lib));
    await fs.rename(tmp, CACHE_FILE);
  } catch (err) {
    console.error("[library] could not write cache:", err);
  }
}

function isFresh(lib: Library) {
  return Date.now() - new Date(lib.fetchedAt).getTime() < MAX_AGE_MS;
}

function refresh(): Promise<Library | null> {
  if (state.inFlight) return state.inFlight;
  state.inFlight = (async () => {
    try {
      const lib = await fetchFromOpenAlex();
      state.memory = lib;
      state.lastError = null;
      await writeDisk(lib);
      console.log(`[library] loaded ${lib.papers.length} papers from OpenAlex`);
      return lib;
    } catch (err) {
      state.lastFailureAt = Date.now();
      state.lastError = err instanceof Error ? err.message : String(err);
      console.error("[library] refresh failed:", state.lastError);
      return state.memory;
    } finally {
      state.inFlight = null;
    }
  })();
  return state.inFlight;
}

/** The full library. Waits for OpenAlex only when nothing is cached yet. */
export async function getLibrary(): Promise<Library | null> {
  if (!state.memory) state.memory = await readDisk();
  if (state.memory) {
    if (!isFresh(state.memory) && Date.now() - state.lastFailureAt > RETRY_AFTER_FAILURE_MS) {
      void refresh(); // serve the cached copy while refreshing in the background
    }
    return state.memory;
  }
  if (Date.now() - state.lastFailureAt < 60_000) return null; // don't hammer the API after a failure
  return refresh();
}

/** The library only if it is already cached; starts loading it otherwise. Never waits on the network. */
export async function getCachedLibrary(): Promise<Library | null> {
  if (!state.memory) state.memory = await readDisk();
  if (!state.memory) {
    if (Date.now() - state.lastFailureAt > 60_000) void refresh();
    return null;
  }
  return getLibrary();
}

export function getLastLibraryError() {
  return state.lastError;
}

export async function getPaper(id: string): Promise<LibraryPaper | null> {
  const lib = await getLibrary();
  return lib?.papers.find((p) => p.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Querying
// ---------------------------------------------------------------------------

export type LibraryQuery = {
  q?: string;
  place?: string;
  theme?: string;
  from?: number;
  to?: number;
  sort?: "cited" | "newest" | "oldest";
};

export function filterPapers(papers: LibraryPaper[], query: LibraryQuery): LibraryPaper[] {
  const terms = (query.q ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  let list = papers.filter((p) => {
    if (query.place && !p.places.includes(query.place as PlaceKey)) return false;
    if (query.theme && !p.themes.includes(query.theme as ThemeKey)) return false;
    if (query.from && p.year < query.from) return false;
    if (query.to && p.year > query.to) return false;
    if (terms.length) {
      const hay = `${p.title} ${p.abstract} ${p.keywords.join(" ")} ${p.authors
        .map((a) => a.name)
        .join(" ")} ${p.journal ?? ""}`.toLowerCase();
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
  if (query.sort === "newest") list = [...list].sort((a, b) => b.year - a.year || b.citations - a.citations);
  else if (query.sort === "oldest") list = [...list].sort((a, b) => a.year - b.year || b.citations - a.citations);
  else list = [...list].sort((a, b) => b.citations - a.citations);
  return list;
}

export function countBy<K extends string>(papers: LibraryPaper[], pick: (p: LibraryPaper) => K[]) {
  const counts = new Map<K, number>();
  for (const p of papers) for (const k of pick(p)) counts.set(k, (counts.get(k) ?? 0) + 1);
  return counts;
}

export function relatedPapers(papers: LibraryPaper[], paper: LibraryPaper, limit = 3): LibraryPaper[] {
  return papers
    .filter((p) => p.id !== paper.id)
    .map((p) => ({
      p,
      score:
        p.themes.filter((t) => paper.themes.includes(t)).length * 2 +
        p.places.filter((t) => paper.places.includes(t)).length +
        (p.subfield && p.subfield === paper.subfield ? 2 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.citations - a.p.citations)
    .slice(0, limit)
    .map((x) => x.p);
}

export function formatAuthors(paper: LibraryPaper, max = 3): string {
  const names = paper.authors.map((a) => a.name);
  if (names.length === 0) return "Unknown authors";
  if (paper.authorCount <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} +${paper.authorCount - max}`;
}
