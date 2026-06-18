import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

const prisma = new PrismaClient();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

function uploadRoot(): string {
  return path.isAbsolute(UPLOAD_DIR)
    ? UPLOAD_DIR
    : path.join(process.cwd(), UPLOAD_DIR);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// --- Minimal PDF generator (standard Helvetica font, no embedding needed) ---

function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > width) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

type Seg = { text: string; size: number; gap: number };

function makePdf(p: {
  title: string;
  authors: string;
  subject: string;
  abstract: string;
}): Buffer {
  const segs: Seg[] = [];
  // Title
  wrap(p.title, 52).forEach((l, i) => segs.push({ text: l, size: 18, gap: i === 0 ? 0 : 22 }));
  // Authors
  segs.push({ text: p.authors, size: 11, gap: 30 });
  segs.push({ text: `TerraNova preprint  -  ${p.subject}`, size: 10, gap: 16 });
  // Abstract heading
  segs.push({ text: "Abstract", size: 13, gap: 34 });
  wrap(p.abstract, 92).forEach((l, i) => segs.push({ text: l, size: 11, gap: i === 0 ? 18 : 15 }));
  segs.push({
    text: "This is an automatically generated sample manuscript for demonstration.",
    size: 9,
    gap: 28,
  });

  let stream = "BT\n/F1 16 Tf\n72 740 Td\n";
  for (const seg of segs) {
    stream += `/F1 ${seg.size} Tf\n`;
    stream += `0 -${seg.gap} Td\n`;
    stream += `(${escapePdf(seg.text)}) Tj\n`;
  }
  stream += "ET";

  const streamLen = Buffer.byteLength(stream, "latin1");
  const offsets: number[] = [];
  let pdf = "%PDF-1.4\n";

  function addObj(num: number, body: string) {
    offsets[num] = Buffer.byteLength(pdf, "latin1");
    pdf += `${num} 0 obj\n${body}\nendobj\n`;
  }

  addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObj(
    3,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
  );
  addObj(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObj(5, `<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`);

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

// --- Author personas ---

const AUTHORS = {
  tanaka: { name: "Mei Tanaka", email: "mei.tanaka@example.org", affiliation: "Kyoto University" },
  oconnor: { name: "Liam O'Connor", email: "liam.oconnor@example.org", affiliation: "University of Edinburgh" },
  okeke: { name: "Amara Okeke", email: "amara.okeke@example.org", affiliation: "University of Cape Town" },
  reyes: { name: "Sofia Reyes", email: "sofia.reyes@example.org", affiliation: "Universidad de Chile" },
  vasquez: { name: "Henrik Vasquez", email: "henrik.vasquez@example.org", affiliation: "ETH Zurich" },
  nair: { name: "Priya Nair", email: "priya.nair@example.org", affiliation: "Indian Institute of Science" },
};

type Persona = keyof typeof AUTHORS;

type Seed = {
  title: string;
  authors: string;
  subject: string;
  keywords: string;
  license: string;
  abstract: string;
  by: Persona;
  publishedAt: string;
};

const PREPRINTS: Seed[] = [
  // ---- Published during 2025 ----
  {
    title: "Accelerating Mass Loss of Tropical Andean Glaciers Observed from Multi-Sensor Satellite Records",
    authors: "Sofia Reyes, Henrik Vasquez, Mei Tanaka",
    subject: "Glaciology",
    keywords: "tropical glaciers, mass balance, remote sensing, Andes",
    license: "CC BY 4.0",
    abstract:
      "We combine two decades of optical and radar satellite observations to quantify ice loss across the tropical Andes. Our analysis reveals a marked acceleration in mass loss after 2012, concentrated at lower elevations where seasonal snow cover has declined. We attribute the trend primarily to rising freezing levels and discuss implications for downstream water availability in the dry season.",
    by: "reyes",
    publishedAt: "2025-02-14",
  },
  {
    title: "A Bayesian Framework for Probabilistic Seismic Hazard in Slow-Deforming Continental Interiors",
    authors: "Henrik Vasquez, Priya Nair",
    subject: "Geophysics & Seismology",
    keywords: "seismic hazard, Bayesian inference, intraplate earthquakes",
    license: "CC BY 4.0",
    abstract:
      "Estimating earthquake hazard in stable continental regions is hampered by short instrumental catalogs and long recurrence intervals. We present a hierarchical Bayesian model that pools paleoseismic, geodetic, and historical data to constrain recurrence parameters with explicit uncertainty. Application to three intraplate provinces shows that ignoring epistemic uncertainty can underestimate hazard at long return periods by up to forty percent.",
    by: "vasquez",
    publishedAt: "2025-03-03",
  },
  {
    title: "Soil Organic Carbon Stabilization under Regenerative Grazing: A Three-Year Field Trial",
    authors: "Amara Okeke, Sofia Reyes",
    subject: "Soil Science",
    keywords: "soil carbon, regenerative agriculture, grazing, sequestration",
    license: "CC BY-SA 4.0",
    abstract:
      "We report results from a replicated field experiment comparing continuous and rotational grazing on semi-arid grassland. Rotational grazing increased mineral-associated organic carbon in the upper thirty centimeters without reducing forage yield. Isotopic tracing indicates that gains were driven by enhanced root turnover rather than surface litter inputs, suggesting management can meaningfully influence stable carbon pools.",
    by: "okeke",
    publishedAt: "2025-03-27",
  },
  {
    title: "Microplastic Vertical Transport in the Subtropical Gyre: Evidence from Sediment Trap Arrays",
    authors: "Mei Tanaka, Liam O'Connor",
    subject: "Oceanography",
    keywords: "microplastics, marine pollution, sediment traps, ocean transport",
    license: "CC BY 4.0",
    abstract:
      "The fate of buoyant plastics in the open ocean remains poorly constrained. Using moored sediment traps deployed across a subtropical gyre, we document a persistent downward flux of microplastic particles associated with biological aggregates. Particle size and polymer type strongly influence sinking rates, implying that surface surveys substantially underestimate the total plastic inventory of the water column.",
    by: "tanaka",
    publishedAt: "2025-04-19",
  },
  {
    title: "Reconstructing Holocene Monsoon Variability from a High-Resolution Speleothem Record",
    authors: "Priya Nair, Amara Okeke",
    subject: "Paleontology",
    keywords: "paleoclimate, speleothem, monsoon, Holocene",
    license: "CC BY 4.0",
    abstract:
      "We present a precisely dated stalagmite oxygen isotope record spanning the past eleven thousand years. The record captures centennial-scale weakening of monsoon rainfall coincident with North Atlantic cooling events. Spectral analysis highlights a persistent solar influence on monsoon strength, providing context for interpreting recent rainfall variability against natural background dynamics.",
    by: "nair",
    publishedAt: "2025-05-08",
  },
  {
    title: "Urban Heat Island Intensification under Compound Heatwave and Drought Conditions",
    authors: "Liam O'Connor, Sofia Reyes",
    subject: "Atmospheric Sciences",
    keywords: "urban heat island, heatwaves, drought, climate adaptation",
    license: "CC BY 4.0",
    abstract:
      "Compound hot and dry extremes are becoming more frequent, yet their joint effect on urban climates is rarely quantified. Using a network of municipal sensors and reanalysis data, we show that nighttime heat island intensity nearly doubles when heatwaves coincide with soil moisture deficits. We outline implications for early-warning systems and the siting of urban green infrastructure.",
    by: "oconnor",
    publishedAt: "2025-06-22",
  },
  {
    title: "Trace-Element Partitioning in Arc Magmas: New Constraints from Melt Inclusion Analysis",
    authors: "Henrik Vasquez, Mei Tanaka",
    subject: "Geochemistry",
    keywords: "melt inclusions, arc magmatism, trace elements, partitioning",
    license: "CC BY 4.0",
    abstract:
      "Melt inclusions preserve information about magmatic processes lost in bulk rock samples. We analyze a suite of olivine-hosted inclusions from a continental arc to derive updated partition coefficients for fluid-mobile elements. The results imply a larger slab-fluid contribution to arc magmas than previously inferred and refine estimates of volatile recycling at convergent margins.",
    by: "vasquez",
    publishedAt: "2025-07-11",
  },
  {
    title: "Mapping Coastal Wetland Loss with Deep Learning on Decadal Satellite Imagery",
    authors: "Amara Okeke, Priya Nair, Liam O'Connor",
    subject: "Remote Sensing",
    keywords: "wetlands, deep learning, land cover change, coastal",
    license: "CC BY 4.0",
    abstract:
      "We train a convolutional segmentation model to classify coastal wetland extent across four decades of medium-resolution imagery. The approach resolves gradual conversion that thresholding methods miss, revealing accelerating losses adjacent to expanding aquaculture. We release the labeled training set to support reproducible monitoring of vulnerable coastal ecosystems.",
    by: "okeke",
    publishedAt: "2025-08-05",
  },
  {
    title: "Hydrological Connectivity Controls Nitrate Export in an Agricultural Headwater Catchment",
    authors: "Sofia Reyes, Henrik Vasquez",
    subject: "Hydrology",
    keywords: "nitrate export, connectivity, catchment hydrology, water quality",
    license: "CC BY 4.0",
    abstract:
      "Nutrient delivery from agricultural catchments varies sharply with hydrological state. Through high-frequency stream chemistry monitoring, we show that nitrate export is governed by the activation of subsurface flow paths during wet periods. A simple connectivity index explains most of the variance in load, offering a practical basis for targeting mitigation measures.",
    by: "reyes",
    publishedAt: "2025-09-16",
  },
  {
    title: "Pre-Eruptive Deformation Patterns Detected by InSAR at a Persistently Active Stratovolcano",
    authors: "Mei Tanaka, Henrik Vasquez",
    subject: "Volcanology",
    keywords: "InSAR, volcano deformation, eruption forecasting",
    license: "CC BY 4.0",
    abstract:
      "We analyze a multi-year interferometric time series spanning two eruptive episodes at an active stratovolcano. Subtle inflation preceding each episode localizes a shallow storage region, while co-eruptive subsidence constrains the volume of erupted material. The consistency of the signal suggests deformation monitoring can provide weeks of advance warning at similar systems.",
    by: "tanaka",
    publishedAt: "2025-10-02",
  },
  {
    title: "Quantifying Permafrost Carbon Vulnerability across a Thaw Gradient",
    authors: "Priya Nair, Sofia Reyes",
    subject: "Biogeosciences",
    keywords: "permafrost, carbon feedback, thaw, greenhouse gases",
    license: "CC BY 4.0",
    abstract:
      "Thawing permafrost may release large quantities of stored carbon, but flux estimates remain uncertain. We combine incubation experiments with field flux measurements along a natural thaw gradient to partition carbon loss between carbon dioxide and methane. Our results indicate that landscape wetness, more than temperature alone, determines the climatic impact of released carbon.",
    by: "nair",
    publishedAt: "2025-10-28",
  },
  {
    title: "Landslide Susceptibility under Changing Rainfall Extremes: A Regional Assessment",
    authors: "Liam O'Connor, Amara Okeke",
    subject: "Natural Hazards",
    keywords: "landslides, rainfall thresholds, susceptibility, hazard mapping",
    license: "CC BY 4.0",
    abstract:
      "Rainfall-triggered landslides threaten mountain communities, and their frequency may shift with the intensification of extreme precipitation. We integrate an inventory of past failures with downscaled rainfall projections to map evolving susceptibility. Areas of greatest concern coincide with recent deforestation, underscoring the compounding role of land-use change in hazard exposure.",
    by: "oconnor",
    publishedAt: "2025-11-19",
  },
  {
    title: "Carbonate Weathering as a Modulator of Regional Carbon Budgets in Karst Terrain",
    authors: "Henrik Vasquez, Priya Nair",
    subject: "Geochemistry",
    keywords: "weathering, karst, carbon cycle, alkalinity",
    license: "CC BY 4.0",
    abstract:
      "Chemical weathering of carbonate rock both consumes and releases carbon dioxide depending on timescale and hydrology. Using paired discharge and alkalinity measurements, we quantify the net carbon exchange of a temperate karst basin. We find pronounced seasonal reversal in the direction of exchange, cautioning against annual-average treatments in regional carbon assessments.",
    by: "vasquez",
    publishedAt: "2025-12-09",
  },

  // ---- Published in 2026 (after Jan 1, before Jun 18) ----
  {
    title: "Marine Heatwave Imprints on Coral Reef Community Structure: A Five-Year Synthesis",
    authors: "Mei Tanaka, Amara Okeke, Sofia Reyes",
    subject: "Oceanography",
    keywords: "marine heatwaves, coral reefs, ecosystem resilience",
    license: "CC BY 4.0",
    abstract:
      "Recurrent marine heatwaves are reshaping reef ecosystems faster than recovery can occur. Synthesizing five years of survey data across a thermal stress gradient, we document a shift toward heat-tolerant but structurally simpler coral assemblages. The trajectory implies declining habitat complexity even where total coral cover is partially maintained.",
    by: "tanaka",
    publishedAt: "2026-01-21",
  },
  {
    title: "Deep Learning Emulators for Rapid Regional Climate Downscaling",
    authors: "Priya Nair, Henrik Vasquez",
    subject: "Climatology",
    keywords: "machine learning, downscaling, regional climate, emulators",
    license: "CC BY 4.0",
    abstract:
      "Dynamical downscaling provides detailed regional climate information at high computational cost. We develop a neural emulator trained on a limited ensemble of regional simulations that reproduces precipitation and temperature fields at a fraction of the cost. Validation against held-out scenarios shows the emulator preserves extreme-event statistics, enabling large ensembles for risk assessment.",
    by: "nair",
    publishedAt: "2026-02-13",
  },
  {
    title: "Fault Reactivation Risk Associated with Subsurface Fluid Injection in Sedimentary Basins",
    authors: "Henrik Vasquez, Liam O'Connor",
    subject: "Tectonics & Structural Geology",
    keywords: "induced seismicity, fluid injection, fault reactivation",
    license: "CC BY 4.0",
    abstract:
      "Subsurface fluid injection can reactivate pre-existing faults and induce seismicity. We couple geomechanical modeling with basin stress observations to assess reactivation potential across a range of injection scenarios. The analysis identifies critically stressed orientations and proposes operational thresholds that substantially reduce modeled seismic risk.",
    by: "vasquez",
    publishedAt: "2026-03-04",
  },
  {
    title: "Aerosol-Cloud Interactions over the Southern Ocean from Ship-Based Observations",
    authors: "Sofia Reyes, Mei Tanaka",
    subject: "Atmospheric Sciences",
    keywords: "aerosols, clouds, Southern Ocean, radiative forcing",
    license: "CC BY 4.0",
    abstract:
      "The Southern Ocean hosts some of the most persistent and least understood cloud cover on Earth. Using measurements from a research cruise, we characterize how natural marine aerosols modulate cloud droplet number and brightness. Our observations help explain long-standing biases in climate models and constrain the regional radiative effect of these clouds.",
    by: "reyes",
    publishedAt: "2026-03-29",
  },
  {
    title: "Groundwater Depletion and Land Subsidence in a Rapidly Urbanizing Delta",
    authors: "Amara Okeke, Priya Nair",
    subject: "Hydrology",
    keywords: "groundwater, subsidence, deltas, InSAR",
    license: "CC BY 4.0",
    abstract:
      "Excessive groundwater withdrawal drives land subsidence that compounds relative sea-level rise in low-lying deltas. Combining satellite geodesy with piezometric records, we map subsidence rates and link them to aquifer compaction. We show that managed recharge in targeted zones could halve projected subsidence over the coming decades.",
    by: "okeke",
    publishedAt: "2026-04-22",
  },
  {
    title: "Toward Equitable Climate Adaptation Finance: A Cross-National Policy Analysis",
    authors: "Liam O'Connor, Sofia Reyes, Priya Nair",
    subject: "Sustainability & Policy",
    keywords: "adaptation finance, climate policy, equity, governance",
    license: "CC BY-NC 4.0",
    abstract:
      "Adaptation finance is rising, yet its distribution rarely matches where climate vulnerability is greatest. We analyze funding flows across thirty countries to evaluate how allocation criteria align with measured exposure and adaptive capacity. The findings reveal systematic gaps and motivate transparent, needs-based allocation frameworks for international climate funds.",
    by: "oconnor",
    publishedAt: "2026-05-30",
  },
];

async function main() {
  await fs.mkdir(uploadRoot(), { recursive: true });

  const personaIds: Record<string, string> = {};
  for (const key of Object.keys(AUTHORS) as Persona[]) {
    const a = AUTHORS[key];
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { name: a.name, affiliation: a.affiliation },
      create: {
        email: a.email,
        name: a.name,
        affiliation: a.affiliation,
        // Placeholder hash; these demo accounts are not meant to be signed into.
        passwordHash: "$2a$10$seededDemoAccountNoLoginXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        role: "USER",
      },
    });
    personaIds[key] = user.id;
  }

  let created = 0;
  let skipped = 0;

  for (const [i, p] of PREPRINTS.entries()) {
    const slug = slugify(p.title);
    const existing = await prisma.preprint.findUnique({ where: { slug } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const published = new Date(`${p.publishedAt}T10:00:00.000Z`);
    const createdAt = new Date(published.getTime() - 4 * 24 * 60 * 60 * 1000);

    const pdf = makePdf(p);
    const storedName = `${slug}-${published.getTime()}-${i}.pdf`;
    await fs.writeFile(path.join(uploadRoot(), storedName), pdf);

    await prisma.preprint.create({
      data: {
        slug,
        title: p.title,
        abstract: p.abstract,
        authors: p.authors,
        subject: p.subject,
        keywords: p.keywords,
        license: p.license,
        comments: null,
        fileOriginalName: `${slug}.pdf`,
        fileStoredName: storedName,
        fileMime: "application/pdf",
        fileSize: pdf.length,
        status: "PUBLISHED",
        submittedById: personaIds[p.by],
        publishedAt: published,
        createdAt,
        downloads: Math.floor(40 + Math.random() * 900),
      },
    });
    created += 1;
  }

  console.log(`Sample preprints: created ${created}, skipped ${skipped} (already present).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
