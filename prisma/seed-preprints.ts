import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { buildPaperPdf } from "./sample-paper";

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

// --- Placeholder PDF generator -------------------------------------------
// Demonstration preprints carry no real manuscript; their file simply states
// that the PDF is unavailable.

function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function unavailablePdf(message = "PDF is not available to view."): Buffer {
  const stream = `BT\n/F1 20 Tf\n110 430 Td\n(${escapePdf(message)}) Tj\nET`;
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
      "Tropical Andean glaciers are among the most climatically sensitive ice masses on Earth, yet observational constraints on their recent evolution remain limited. We integrate two decades of optical and synthetic-aperture radar observations to quantify glacier-wide mass change across the tropical Andes. The reconstruction reveals a pronounced acceleration in mass loss after 2012, most acute at lower elevations where the duration of seasonal snow cover has declined. We attribute this trend principally to rising regional freezing levels and assess its consequences for dry-season water security in downstream Andean communities.",
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
      "Probabilistic seismic hazard assessment in stable continental interiors is fundamentally constrained by short instrumental catalogues and recurrence intervals that span millennia. We develop a hierarchical Bayesian framework that jointly assimilates paleoseismic, geodetic, and historical observations to constrain earthquake recurrence parameters while propagating epistemic uncertainty explicitly. Applied to three intraplate provinces, the model demonstrates that neglecting epistemic uncertainty can underestimate hazard at long return periods by as much as forty percent, with direct implications for the design of critical infrastructure.",
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
      "Whether grazing management can durably enhance soil carbon storage remains contested. We report a three-year replicated field experiment contrasting continuous and rotational grazing on semi-arid grassland. Rotational grazing significantly increased mineral-associated organic carbon within the upper thirty centimetres of soil without compromising forage productivity. Stable-isotope tracing indicates that these gains were driven by enhanced root turnover rather than aboveground litter inputs, suggesting that targeted management can meaningfully augment stable, long-lived carbon pools.",
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
      "The vertical fate of buoyant plastics in the open ocean remains poorly quantified, limiting global inventories of marine plastic pollution. Using moored sediment-trap arrays deployed across a subtropical gyre, we document a persistent downward flux of microplastic particles mediated by biological aggregation. Particle size and polymer composition exert strong control on sinking velocity, implying that surface-based surveys systematically underestimate the total plastic burden of the water column and its potential for long-term sequestration at depth.",
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
      "Reconstructing the natural range of monsoon variability is essential for contextualising contemporary rainfall trends. We present a precisely uranium-thorium-dated stalagmite oxygen-isotope record resolving monsoon intensity over the past eleven thousand years. The record documents recurrent centennial-scale weakening of monsoon rainfall coincident with North Atlantic cooling episodes, while spectral analysis reveals a persistent solar influence on monsoon strength. These results provide a robust baseline against which recent hydroclimatic variability can be evaluated.",
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
      "Compound hot and dry extremes are intensifying under climate change, yet their combined influence on urban thermal environments remains poorly characterised. Drawing on a dense municipal sensor network and atmospheric reanalysis, we show that nighttime urban heat-island intensity nearly doubles when heatwaves coincide with pronounced soil-moisture deficits. We examine the implications of this amplification for heat early-warning systems and for the strategic siting of urban green infrastructure.",
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
      "Olivine-hosted melt inclusions preserve primary magmatic signatures that are otherwise lost during bulk-rock homogenisation. We analyse a suite of inclusions from a continental volcanic arc to derive revised partition coefficients for fluid-mobile trace elements. The results imply a substantially larger slab-derived fluid contribution to arc magmatism than previously recognised and refine quantitative estimates of volatile recycling at convergent plate margins.",
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
      "Accurate monitoring of coastal wetland extent is hindered by gradual, sub-pixel land-cover transitions that conventional classification methods fail to capture. We train a convolutional segmentation model to map wetland extent across four decades of medium-resolution satellite imagery. The approach resolves incremental conversion adjacent to expanding aquaculture and reveals accelerating wetland loss. We release the annotated training dataset to support reproducible, large-scale monitoring of vulnerable coastal ecosystems.",
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
      "Nutrient export from agricultural catchments varies sharply with hydrological state, complicating efforts to manage downstream water quality. Using high-frequency in-stream chemistry, we demonstrate that nitrate export is governed by the activation of subsurface flow paths during wet periods. A parsimonious hydrological connectivity index accounts for the majority of variance in nitrate load, offering a practical and transferable basis for targeting mitigation measures.",
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
      "Forecasting eruptions at persistently active volcanoes requires robust links between surface deformation and subsurface magmatic processes. We analyse a multi-year interferometric synthetic-aperture radar time series spanning two eruptive episodes at an active stratovolcano. Subtle pre-eruptive inflation localises a shallow magma storage region, while co-eruptive subsidence constrains erupted volumes. The reproducibility of these signals indicates that deformation monitoring can provide several weeks of advance warning at comparable systems.",
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
      "Thawing permafrost represents one of the largest and least constrained feedbacks in the global carbon cycle. We combine controlled incubation experiments with in-situ flux measurements along a natural thaw gradient to partition carbon release between carbon dioxide and methane. Our results indicate that landscape moisture, rather than temperature alone, exerts dominant control over the climatic impact of mobilised permafrost carbon, with direct implications for Earth-system model projections.",
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
      "Rainfall-triggered landslides pose an escalating threat to mountain communities as extreme precipitation intensifies. We integrate a multi-decadal inventory of slope failures with statistically downscaled rainfall projections to map evolving landslide susceptibility across a mountainous region. Zones of greatest projected hazard coincide spatially with recent deforestation, underscoring the compounding role of land-use change in shaping future exposure.",
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
      "Carbonate weathering both consumes and releases carbon dioxide depending on timescale and hydrological conditions, complicating its representation in regional carbon budgets. Using paired high-frequency discharge and alkalinity measurements, we quantify the net carbon exchange of a temperate karst catchment. We identify a pronounced seasonal reversal in the direction of exchange, cautioning against the use of annual-mean approximations in regional carbon assessments.",
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
      "Recurrent marine heatwaves are restructuring coral reef ecosystems more rapidly than recovery can proceed. Synthesising five years of survey data along a thermal-stress gradient, we document a directional shift toward heat-tolerant but structurally simplified coral assemblages. This trajectory implies a progressive decline in habitat complexity and associated ecosystem function, even where total coral cover is partially sustained.",
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
      "Dynamical downscaling delivers detailed regional climate information but at prohibitive computational expense. We develop a deep-learning emulator, trained on a limited ensemble of high-resolution regional simulations, that reproduces precipitation and temperature fields at a small fraction of the cost. Validation against withheld scenarios confirms that the emulator preserves extreme-event statistics, enabling the large ensembles required for robust climate-risk assessment.",
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
      "Subsurface fluid injection can reactivate pre-existing faults and induce seismicity, posing a persistent challenge for subsurface energy operations. We couple geomechanical modelling with in-situ basin stress observations to evaluate fault-reactivation potential across a range of injection scenarios. The analysis identifies critically stressed fault orientations and proposes operational pressure thresholds that substantially reduce modelled seismic risk.",
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
      "The Southern Ocean sustains some of the most extensive and least understood cloud cover on Earth, and persistent model biases in this region limit confidence in climate projections. Using in-situ measurements from a research cruise, we characterise the influence of natural marine aerosols on cloud droplet number concentration and albedo. These observations help to explain long-standing radiative biases and better constrain the regional cloud radiative effect.",
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
      "Excessive groundwater extraction drives land subsidence that compounds relative sea-level rise across low-lying, rapidly urbanising deltas. Combining satellite geodesy with piezometric records, we map subsidence rates and attribute them to aquifer compaction. Scenario analysis indicates that managed aquifer recharge in targeted zones could halve projected subsidence over the coming decades, informing sustainable groundwater governance.",
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
      "Climate adaptation finance is expanding rapidly, yet its allocation frequently diverges from where vulnerability is most acute. We analyse adaptation funding flows across thirty countries to assess the alignment between allocation criteria and measured exposure and adaptive capacity. The analysis reveals systematic distributional gaps and motivates the adoption of transparent, needs-based frameworks for the equitable allocation of international climate funds.",
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
  let updated = 0;

  for (const [i, p] of PREPRINTS.entries()) {
    const slug = slugify(p.title);
    const persona = AUTHORS[p.by];
    const pdf = await buildPaperPdf({
      title: p.title,
      authors: p.authors,
      subject: p.subject,
      keywords: p.keywords,
      license: p.license,
      abstract: p.abstract,
      affiliation: persona.affiliation,
      correspondingName: persona.name,
      correspondingEmail: persona.email,
      publishedAt: p.publishedAt,
    });
    const existing = await prisma.preprint.findUnique({ where: { slug } });

    if (existing) {
      // Refresh demo rows: rewrite the placeholder PDF, update the (now more
      // polished) abstract, and ensure the sample flag is set.
      await fs.writeFile(path.join(uploadRoot(), existing.fileStoredName), pdf);
      await prisma.preprint.update({
        where: { id: existing.id },
        data: {
          abstract: p.abstract,
          keywords: p.keywords,
          license: p.license,
          isSample: true,
          fileMime: "application/pdf",
          fileSize: pdf.length,
        },
      });
      updated += 1;
      continue;
    }

    const published = new Date(`${p.publishedAt}T10:00:00.000Z`);
    const createdAt = new Date(published.getTime() - 4 * 24 * 60 * 60 * 1000);

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
        isSample: true,
        submittedById: personaIds[p.by],
        publishedAt: published,
        createdAt,
        downloads: Math.floor(40 + Math.random() * 900),
      },
    });
    created += 1;
  }

  console.log(`Sample preprints: created ${created}, updated ${updated}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
