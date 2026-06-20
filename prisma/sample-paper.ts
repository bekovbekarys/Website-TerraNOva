import PDFDocument from "pdfkit";

// Generates a professional, multi-page (~14 pages) sample preprint PDF that
// follows the TerraNova template. Every paper draws its prose, table values,
// equations and references from seeded variant pools, so each one reads
// differently while staying stable across re-seeds. The abstract is the real
// metadata; the rest is synthetic placeholder content (see Declarations).

export type PaperInput = {
  title: string;
  authors: string;
  subject: string;
  keywords: string;
  license: string;
  abstract: string;
  affiliation: string;
  correspondingName: string;
  correspondingEmail: string;
  publishedAt: string;
};

const PALETTE = {
  accent: "#2f7d54",
  blue: "#1f7fc0",
  amber: "#b8860b",
  ink: "#1c1917",
  muted: "#6b7280",
  grid: "#e2e0dd",
  axis: "#9ca3af",
  boxbg: "#f5f7f6",
};

function makeRng(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lc(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

type DrawFn = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number
) => void;

type Block =
  | { t: "h2"; s: string }
  | { t: "h3"; s: string }
  | { t: "p"; s: string }
  | { t: "eq"; s: string; n: number }
  | { t: "fig"; h: number; draw: DrawFn; cap: string }
  | { t: "table"; cap: string; head: string[]; rows: string[][] };

// ---- Figures ----------------------------------------------------------------

function niceTicks(min: number, max: number, count = 4): number[] {
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) ticks.push(min + ((max - min) * i) / count);
  return ticks;
}

function lineChart(
  series: { label: string; color: string; data: number[] }[],
  xlabel: string,
  ylabel: string
): DrawFn {
  return (doc, x, y, w, h) => {
    const padL = 44,
      padB = 30,
      padT = 24,
      padR = 16;
    const px = x + padL,
      py = y + padT,
      pw = w - padL - padR,
      ph = h - padT - padB;
    let lo = Infinity,
      hi = -Infinity;
    for (const s of series)
      for (const v of s.data) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    const pad = (hi - lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
    const n = series[0].data.length;
    const sx = (i: number) => px + (i / (n - 1)) * pw;
    const sy = (v: number) => py + ph - ((v - lo) / (hi - lo)) * ph;
    doc.save();
    doc.lineWidth(0.5).font("Helvetica").fontSize(7).fillColor(PALETTE.muted);
    for (const tick of niceTicks(lo, hi, 4)) {
      const ty = sy(tick);
      doc.strokeColor(PALETTE.grid).moveTo(px, ty).lineTo(px + pw, ty).stroke();
      doc.fillColor(PALETTE.muted).text(tick.toFixed(1), x, ty - 3, {
        width: padL - 6,
        align: "right",
      });
    }
    doc
      .lineWidth(1)
      .strokeColor(PALETTE.axis)
      .moveTo(px, py)
      .lineTo(px, py + ph)
      .lineTo(px + pw, py + ph)
      .stroke();
    for (const s of series) {
      doc.lineWidth(1.4).strokeColor(s.color);
      s.data.forEach((v, i) => {
        if (i === 0) doc.moveTo(sx(i), sy(v));
        else doc.lineTo(sx(i), sy(v));
      });
      doc.stroke();
    }
    let lx = px + 6;
    const ly = y + 8;
    doc.fontSize(7.5);
    for (const s of series) {
      doc.fillColor(s.color).rect(lx, ly, 9, 9).fill();
      doc.fillColor(PALETTE.muted).text(s.label, lx + 12, ly + 1);
      lx += 12 + doc.widthOfString(s.label) + 18;
    }
    doc.fillColor(PALETTE.muted).fontSize(7.5);
    doc.text(xlabel, px, y + h - 10, { width: pw, align: "center" });
    doc.save();
    doc.rotate(-90, { origin: [x + 8, py + ph / 2] });
    doc.text(ylabel, x + 8 - ph / 2, py + ph / 2 - 4, {
      width: ph,
      align: "center",
    });
    doc.restore();
    doc.restore();
  };
}

function barChart(
  data: { label: string; value: number }[],
  color: string,
  ylabel: string
): DrawFn {
  return (doc, x, y, w, h) => {
    const padL = 44,
      padB = 30,
      padT = 16,
      padR = 16;
    const px = x + padL,
      py = y + padT,
      pw = w - padL - padR,
      ph = h - padT - padB;
    const hi = Math.max(...data.map((d) => d.value)) * 1.1 || 1;
    doc.save();
    doc.lineWidth(0.5).font("Helvetica").fontSize(7);
    for (const tick of niceTicks(0, hi, 4)) {
      const ty = py + ph - (tick / hi) * ph;
      doc.strokeColor(PALETTE.grid).moveTo(px, ty).lineTo(px + pw, ty).stroke();
      doc
        .fillColor(PALETTE.muted)
        .text(tick.toFixed(0), x, ty - 3, { width: padL - 6, align: "right" });
    }
    doc
      .lineWidth(1)
      .strokeColor(PALETTE.axis)
      .moveTo(px, py)
      .lineTo(px, py + ph)
      .lineTo(px + pw, py + ph)
      .stroke();
    const bw = (pw / data.length) * 0.6;
    const gap = (pw / data.length) * 0.4;
    data.forEach((d, i) => {
      const bx = px + i * (bw + gap) + gap / 2;
      const bh = (d.value / hi) * ph;
      doc.fillColor(color).rect(bx, py + ph - bh, bw, bh).fill();
      doc
        .fillColor(PALETTE.muted)
        .fontSize(6.5)
        .text(d.label, bx - gap / 2, py + ph + 4, {
          width: bw + gap,
          align: "center",
        });
    });
    doc.save();
    doc.fillColor(PALETTE.muted).fontSize(7.5);
    doc.rotate(-90, { origin: [x + 8, py + ph / 2] });
    doc.text(ylabel, x + 8 - ph / 2, py + ph / 2 - 4, {
      width: ph,
      align: "center",
    });
    doc.restore();
    doc.restore();
  };
}

function scatterChart(
  points: { x: number; y: number }[],
  slope: number,
  intercept: number,
  color: string
): DrawFn {
  return (doc, x, y, w, h) => {
    const padL = 44,
      padB = 30,
      padT = 16,
      padR = 16;
    const px = x + padL,
      py = y + padT,
      pw = w - padL - padR,
      ph = h - padT - padB;
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    const xlo = Math.min(...xs),
      xhi = Math.max(...xs);
    let ylo = Math.min(...ys),
      yhi = Math.max(...ys);
    const pad = (yhi - ylo) * 0.1 || 1;
    ylo -= pad;
    yhi += pad;
    const sx = (v: number) => px + ((v - xlo) / (xhi - xlo)) * pw;
    const sy = (v: number) => py + ph - ((v - ylo) / (yhi - ylo)) * ph;
    doc.save();
    doc.lineWidth(0.5).font("Helvetica").fontSize(7);
    for (const tick of niceTicks(ylo, yhi, 4)) {
      const ty = sy(tick);
      doc.strokeColor(PALETTE.grid).moveTo(px, ty).lineTo(px + pw, ty).stroke();
      doc
        .fillColor(PALETTE.muted)
        .text(tick.toFixed(1), x, ty - 3, { width: padL - 6, align: "right" });
    }
    doc
      .lineWidth(1)
      .strokeColor(PALETTE.axis)
      .moveTo(px, py)
      .lineTo(px, py + ph)
      .lineTo(px + pw, py + ph)
      .stroke();
    for (const p of points) doc.fillColor(color).circle(sx(p.x), sy(p.y), 1.8).fill();
    doc
      .lineWidth(1.4)
      .strokeColor(PALETTE.amber)
      .moveTo(sx(xlo), sy(slope * xlo + intercept))
      .lineTo(sx(xhi), sy(slope * xhi + intercept))
      .stroke();
    doc.restore();
  };
}

function schematic(labels: string[]): DrawFn {
  return (doc, x, y, w, h) => {
    doc.save();
    const boxW = 110,
      boxH = 46;
    const cy = y + h / 2 - boxH / 2;
    const gap = (w - boxW * labels.length) / (labels.length - 1 || 1);
    let bx = x;
    labels.forEach((label, i) => {
      doc
        .lineWidth(1)
        .roundedRect(bx, cy, boxW, boxH, 6)
        .fillAndStroke(PALETTE.boxbg, PALETTE.accent);
      doc
        .fillColor(PALETTE.ink)
        .font("Helvetica")
        .fontSize(8.5)
        .text(label, bx + 6, cy + boxH / 2 - 9, {
          width: boxW - 12,
          align: "center",
        });
      if (i < labels.length - 1) {
        const ax = bx + boxW,
          ax2 = bx + boxW + gap;
        const ay = cy + boxH / 2;
        doc
          .strokeColor(PALETTE.axis)
          .lineWidth(1)
          .moveTo(ax + 2, ay)
          .lineTo(ax2 - 6, ay)
          .stroke();
        doc
          .fillColor(PALETTE.axis)
          .moveTo(ax2 - 6, ay - 3)
          .lineTo(ax2 - 1, ay)
          .lineTo(ax2 - 6, ay + 3)
          .fill();
      }
      bx += boxW + gap;
    });
    doc.restore();
  };
}

// ---- Content (varied per paper) --------------------------------------------

function buildBlocks(p: PaperInput): Block[] {
  const field = p.subject.toLowerCase();
  const topic = lc(p.title.replace(/\.$/, ""));
  const kwArr = p.keywords.split(",").map((s) => s.trim()).filter(Boolean);
  const kw = p.keywords;
  const kw1 = kwArr[0] ?? field;
  const kw2 = kwArr[1] ?? kwArr[0] ?? field;
  const rng = makeRng(p.title);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const rint = (lo: number, hi: number) => Math.floor(lo + rng() * (hi - lo + 1));
  const rfix = (lo: number, hi: number, d = 2) => (lo + rng() * (hi - lo)).toFixed(d);

  const baseYear = rint(1994, 2004);
  const changeYear = rint(2009, 2017);
  const conf = pick(["90", "95", "99"]);
  const pct = rint(55, 82);
  const resample = pick(["block-bootstrap", "jackknife", "Monte Carlo"]);

  const blocks: Block[] = [];
  const P = (s: string) => blocks.push({ t: "p", s });
  const H2 = (s: string) => blocks.push({ t: "h2", s });
  const H3 = (s: string) => blocks.push({ t: "h3", s });

  // ---- figure data (already varies via rng) ----
  const n = 32;
  const base = 8 + rng() * 10;
  const trend = (rng() - 0.35) * 0.3;
  const obs: number[] = [];
  const model: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = base + trend * i + Math.sin(i / (2 + rng() * 3)) * (1 + rng()) + (rng() - 0.5) * 1.6;
    obs.push(v);
    model.push(v + (rng() - 0.5) * 0.9);
  }
  const bars = ["DJF", "MAM", "JJA", "SON", "Annual", "Trend", "Anom."].map((label) => ({
    label,
    value: 4 + rng() * 42,
  }));
  const slope = 0.3 + rng() * 0.8;
  const intercept = rng() * 4;
  const pts = Array.from({ length: 40 + rint(0, 16) }, () => {
    const xx = rng() * 10;
    return { x: xx, y: slope * xx + intercept + (rng() - 0.5) * 3 };
  });
  const regionSets = [
    ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
    ["Coast", "Lowland", "Foothill", "Upland", "Alpine", "Plateau"],
    ["Basin 1", "Basin 2", "Basin 3", "Basin 4", "Basin 5"],
    ["Sector A", "Sector B", "Sector C", "Sector D", "Sector E", "Sector F"],
  ];
  const regions = pick(regionSets).map((label) => ({ label, value: 6 + rng() * 38 }));

  // ---- 1. Introduction ----
  H2("1. Introduction");
  P(
    pick([
      `Robust observational and modelling evidence is increasingly required to understand a rapidly changing Earth system. Within ${field}, questions surrounding ${kw} remain only partially resolved, motivating the analysis presented in this preprint.`,
      `Few problems in ${field} have attracted as much sustained attention as those connected to ${kw1}. Despite this effort, key aspects of ${topic} remain contested, and a unified quantitative picture has yet to emerge.`,
      `Understanding ${topic} is central to current research in ${field}. Progress has been limited less by a lack of data than by the difficulty of reconciling heterogeneous records of ${kw1} and ${kw2} within a single coherent framework.`,
    ])
  );
  P(
    pick([
      `Earlier studies established the broad context for this work but were often constrained by short observational windows, heterogeneous instrumentation, or limited spatial coverage. As a result, the magnitude and drivers of the patterns associated with ${topic} have remained uncertain.`,
      `Previous investigations advanced the field considerably, yet many relied on records too short to separate long-term change from natural variability. This has left the relative roles of forcing and internal variability in ${topic} difficult to disentangle.`,
      `Prior work has tended to emphasise either mechanistic detail or spatial breadth, but rarely both. Consequently, estimates of ${kw1} have varied widely between studies, and their reconciliation remains an open challenge in ${field}.`,
    ])
  );
  P(
    pick([
      `Recent advances in data availability, processing capacity, and analytical method now make it possible to revisit these questions with greater confidence. The integration of independent observational streams allows cross-validation that was not previously feasible.`,
      `The growing volume of openly available ${kw1} data, together with improved computational tools, creates an opportunity to re-examine ${topic} more rigorously than before.`,
      `New, longer, and better-calibrated datasets have recently become available. Combined with reproducible analysis pipelines, they allow the drivers of ${topic} to be quantified while propagating uncertainty explicitly.`,
    ])
  );
  P(
    pick([
      `The objectives of this study are threefold: to assemble a harmonised record suitable for quantitative analysis; to characterise the dominant patterns and their uncertainty; and to interpret these patterns in the context of prior work in ${field}.`,
      `This study sets out to quantify ${topic}, to test its sensitivity to methodological choices, and to assess its implications for monitoring and modelling in ${field}.`,
      `Our aims are to reconstruct a consistent record relevant to ${kw1}, to identify the principal modes of variability, and to evaluate competing interpretations using independent evidence.`,
    ])
  );
  P(
    pick([
      `The significance of resolving these questions extends beyond the literature: reliable quantification of ${topic} underpins monitoring programmes, informs model evaluation, and supports evidence-based decisions.`,
      `Beyond their scientific interest, these results have practical value for the design of observing systems and for stakeholders who depend on credible information about ${kw1}.`,
      `Improving the accuracy and transparency of estimates of ${topic} has direct relevance for adaptation planning and for the calibration of predictive tools used in ${field}.`,
    ])
  );
  P(
    `The remainder of this manuscript is organised as follows. Section 2 describes the study area, datasets, analytical approach, and validation. Section 3 presents the principal results, supported by figures and summary tables. Section 4 discusses interpretation, Section 5 considers implications, Section 6 sets out limitations, and Section 7 states the main conclusions.`
  );

  // ---- 2. Data and methods ----
  H2("2. Data and methods");
  P(
    pick([
      `This section describes the materials and procedures used. All processing steps were designed to be transparent and reproducible, and the workflow was version-controlled throughout.`,
      `We outline below the datasets and the analytical pipeline. Each step was scripted and version-controlled to support independent reproduction.`,
      `The data sources and methods are summarised here; complete configuration details accompany the analysis to enable replication.`,
    ])
  );
  H3("2.1 Study area and conceptual framework");
  P(
    pick([
      `The analysis focuses on a representative domain in which the processes relevant to ${topic} are well expressed. The conceptual model adopted here (Figure 1) links external forcing to the observed response through a small number of intermediate processes.`,
      `We concentrate on a domain chosen for its dense observational coverage and its sensitivity to ${kw1}. Figure 1 sketches the conceptual model that guides our interpretation.`,
      `The study domain was selected to capture the gradient in ${kw1} most relevant to ${topic}. The conceptual framework in Figure 1 organises the analysis around forcing, process, and response.`,
    ])
  );
  blocks.push({
    t: "fig",
    h: 150,
    draw: schematic(
      pick([
        ["Forcing", "Process", "Response", "Observation"],
        ["Driver", "Mechanism", "State change", "Measurement"],
        ["Input", "Transport", "Storage", "Signal"],
      ])
    ),
    cap: "Figure 1. Conceptual model linking external forcing to the observed response through intermediate processes and the measurement chain.",
  });
  P(
    pick([
      `Within this framework, the forcing term aggregates the principal external drivers, while the process term captures the mechanisms that mediate the response. This separation clarifies which components are observable and which must be inferred.`,
      `The framework distinguishes directly measured quantities from those that must be inferred, which in turn guides the choice of diagnostic metrics used below.`,
      `By separating forcing from response, the framework makes explicit the assumptions that connect the two, and highlights where observational constraints are weakest.`,
    ])
  );
  H3("2.2 Datasets");
  P(
    `We combined multiple publicly available datasets spanning the study period. Each source was quality-controlled, screened for outliers, and harmonised to a common spatial and temporal reference. Table 1 summarises the principal datasets.`
  );
  const varPool = ["State variable", "Surface flux", "Point sample", "Diagnostic", "Index", "Anomaly"];
  const resPool = [
    "0.25 deg, monthly",
    "1 km, 8-day",
    "Station, daily",
    "0.5 deg, monthly",
    "5 km, weekly",
    "0.1 deg, daily",
  ];
  const dsNames = pick([
    ["Reanalysis A", "Satellite B", "In-situ C", "Model D"],
    ["ERA-class A", "Sensor B", "Gauge C", "Ensemble D"],
    ["Product I", "Product II", "Network III", "Simulation IV"],
  ]);
  blocks.push({
    t: "table",
    cap: "Table 1. Principal datasets used in this study, with temporal coverage and nominal resolution.",
    head: ["Dataset", "Variable", "Coverage", "Resolution"],
    rows: dsNames.map((name) => [
      name,
      pick(varPool),
      `${rint(1985, 2003)}-2025`,
      pick(resPool),
    ]),
  });
  H3("2.3 Analytical approach");
  P(
    `Anomalies were computed relative to a ${baseYear}-${baseYear + 19} climatological baseline, and trends were estimated using ordinary least squares with uncertainty derived from the residual covariance. The principal diagnostic follows Equation (1).`
  );
  const eqPool = [
    "R = k * F + b + e",
    "y(t) = a + b*t + s(t) + e(t)",
    "dC/dt = -k*C + S(t)",
    "A = A0 * exp(-t / tau) + c",
  ];
  const eq1 = pick(eqPool);
  blocks.push({ t: "eq", s: eq1, n: 1 });
  P(
    `Association strength was quantified with the coefficient of determination (Equation 2). Significance was assessed at the ${conf} percent level, and a ${resample} procedure accounted for temporal autocorrelation in the residuals.`
  );
  blocks.push({ t: "eq", s: "R^2 = 1 - SS_res / SS_tot", n: 2 });
  P(
    pick([
      `Sensitivity tests confirmed that the conclusions do not depend on any single assumption, baseline period, or dataset. These tests are summarised below and did not materially alter the results.`,
      `We repeated the analysis under alternative configurations to confirm robustness; the principal findings were preserved in every case.`,
      `Multiple sensitivity experiments, including leave-one-dataset-out tests, indicated that no single source dominates the outcome.`,
    ])
  );
  H3("2.4 Validation");
  P(
    `The harmonised product was validated against independent reference observations not used in its construction. Agreement was assessed using mean bias, root-mean-square error, and correlation over the common period (Table 2).`
  );
  blocks.push({
    t: "table",
    cap: "Table 2. Validation metrics against independent reference observations over the common period.",
    head: ["Dataset", "Bias", "RMSE", "Correlation"],
    rows: dsNames
      .slice(0, 3)
      .concat(["Ensemble"])
      .map((name) => [
        name,
        rfix(-0.1, 0.12),
        rfix(0.4, 0.85),
        rfix(0.86, 0.97),
      ]),
  });
  P(
    pick([
      `The ensemble combination outperformed any individual dataset, with near-zero bias and the highest correlation, supporting its use as the basis for the analysis.`,
      `Validation confirmed that the ensemble is the most skilful product; residual errors were spatially incoherent, consistent with random noise.`,
      `Because the ensemble showed the smallest error and no systematic offset, subsequent analysis is based on it.`,
    ])
  );

  // ---- 3. Results ----
  H2("3. Results");
  H3("3.1 Temporal evolution");
  P(
    pick([
      `The harmonised record reveals a coherent temporal evolution (Figure 2). Observations and the independent estimate track one another closely, lending confidence to the reconstructed signal.`,
      `Figure 2 shows the reconstructed time series. The close correspondence between the two independent estimates indicates that dataset-specific artefacts are not driving the result.`,
      `Over the study period the quantity evolves systematically (Figure 2), with the observed and modelled series in close agreement throughout.`,
    ])
  );
  blocks.push({
    t: "fig",
    h: 200,
    draw: lineChart(
      [
        { label: "Observed", color: PALETTE.blue, data: obs },
        { label: "Modelled", color: PALETTE.accent, data: model },
      ],
      "Time (index)",
      "Value"
    ),
    cap: "Figure 2. Temporal evolution of the observed and modelled quantity over the study period.",
  });
  P(
    pick([
      `A pronounced change in tendency is evident from around ${changeYear}, consistent across both series and exceeding the interannual variability of the baseline period.`,
      `The most striking feature is a shift in behaviour near ${changeYear}; its magnitude is too large to be attributed to sampling noise alone.`,
      `After approximately ${changeYear} the trajectory steepens markedly, a change reproduced in both independent estimates.`,
    ])
  );
  H3("3.2 Seasonal and component structure");
  P(
    pick([
      `Decomposing the signal into seasonal components (Figure 3) shows that the response is not uniform through the year, with the largest contributions arising in specific seasons.`,
      `The seasonal decomposition in Figure 3 reveals that a few components dominate the annual total, while others contribute little.`,
      `Figure 3 shows that the signal is concentrated in particular seasons, so that the annual mean reflects the combined influence of unequal components.`,
    ])
  );
  blocks.push({
    t: "fig",
    h: 190,
    draw: barChart(bars, PALETTE.accent, "Contribution"),
    cap: "Figure 3. Seasonal and aggregate contributions to the total signal.",
  });
  P(
    pick([
      `This structure has consequences for monitoring: surveys concentrated in a single season may systematically misestimate the annual response.`,
      `Because the contributions are uneven, sampling strategies that ignore seasonality risk biased annual estimates.`,
      `The uneven seasonal structure implies that representative monitoring must span the full annual cycle.`,
    ])
  );
  H3("3.3 Relationship between variables");
  P(
    pick([
      `The relationship between forcing and response is approximately linear across the observed range (Figure 4). The fitted slope is positive and significant, and the forcing accounts for about ${pct} percent of the explained variance.`,
      `Figure 4 shows a clear, approximately linear dependence of the response on the forcing, with the regression explaining roughly ${pct} percent of the variance.`,
      `A significant positive association is evident (Figure 4); the linear fit accounts for some ${pct} percent of the variance with no systematic curvature.`,
    ])
  );
  blocks.push({
    t: "fig",
    h: 200,
    draw: scatterChart(pts, slope, intercept, PALETTE.blue),
    cap: "Figure 4. Scatter of the response against the forcing, with the ordinary least-squares fit (amber line).",
  });
  P(
    pick([
      `Residual variability about the fit is consistent with known measurement and sampling limitations rather than an alternative mechanism.`,
      `The residuals show no structure, suggesting that the linear model captures the dominant behaviour over the sampled range.`,
      `Departures from the fit fall within the estimated observational uncertainty.`,
    ])
  );
  H3("3.4 Spatial structure");
  P(
    pick([
      `The response is spatially heterogeneous (Figure 5), with the strongest values concentrated in a subset of regions and little change elsewhere.`,
      `Figure 5 shows marked spatial organisation: a few regions dominate the response while others are largely unaffected.`,
      `The signal varies strongly in space (Figure 5), consistent with the geographically varying processes in the conceptual model.`,
    ])
  );
  blocks.push({
    t: "fig",
    h: 190,
    draw: barChart(regions, PALETTE.blue, "Response"),
    cap: "Figure 5. Regional decomposition of the response across the study domain.",
  });
  P(
    pick([
      `This concentration has implications for observing-network design: uneven sampling could materially bias domain-averaged estimates.`,
      `Because the signal is regionally concentrated, sparse networks may misrepresent the domain mean.`,
      `The spatial pattern argues for targeted observations in the most responsive regions.`,
    ])
  );

  // ---- 4. Discussion ----
  H2("4. Discussion");
  P(
    pick([
      `These findings align with, and extend, previous work in ${field}, suggesting that ${topic} plays a more significant role than several earlier studies recognised.`,
      `Taken together, the results reinforce an emerging view in ${field} while sharpening the quantitative constraints on ${topic}.`,
      `Our results are broadly consistent with prior studies but resolve ${topic} with greater precision than was previously possible.`,
    ])
  );
  P(
    pick([
      `The close agreement between independent observational and model estimates indicates that the underlying processes are captured with sufficient fidelity to support quantitative inference.`,
      `That two independent estimates agree so closely is reassuring, and argues against a dominant role for dataset-specific error.`,
      `The convergence of independent lines of evidence strengthens confidence in the reconstructed signal.`,
    ])
  );
  P(
    pick([
      `The seasonal structure cautions against over-reliance on annual-mean diagnostics, which can obscure disproportionate seasonal contributions.`,
      `Because specific seasons dominate, mechanistic interpretation should account for the seasonal partitioning documented above.`,
      `Seasonality complicates simple annual summaries and should be retained in process-level analyses.`,
    ])
  );
  P(
    pick([
      `Comparison with prior estimates suggests earlier disagreements may reflect differences in baseline period and coverage rather than genuine inconsistency.`,
      `Apparent conflicts in the literature may largely dissolve once baseline and sampling differences are accounted for.`,
      `Much of the spread among published estimates appears methodological rather than physical.`,
    ])
  );
  P(
    `Finally, the spatial heterogeneity implies that domain-averaged diagnostics conceal regional detail relevant for impacts and adaptation.`
  );

  // ---- 5. Implications ----
  H2("5. Implications");
  P(
    pick([
      `For monitoring, the results argue for strategies that resolve both seasonal and spatial structure rather than relying on annual, domain-averaged summaries.`,
      `The findings suggest that observing resources are best directed toward the regions and seasons that dominate the response.`,
      `Effective monitoring of ${kw1} should prioritise the high-signal regions identified here.`,
    ])
  );
  P(
    pick([
      `For modelling, the observation-model agreement provides a benchmark, and the diagnostic relationships offer compact, testable targets.`,
      `Predictive models can be evaluated against the relationships reported here, which may help diagnose the origin of biases.`,
      `The diagnostics derived in this study complement traditional point-by-point model comparison.`,
    ])
  );

  // ---- 6. Limitations ----
  H2("6. Limitations");
  P(
    `Several limitations temper this interpretation. The spatial and temporal coverage of the underlying data constrains how far the results can be generalised, and the linear diagnostic may not capture threshold or nonlinear behaviour.`
  );
  P(
    `The harmonisation procedure introduces assumptions about how heterogeneous sources relate. Although validation indicates these are reasonable over the study period, they may not hold outside the observed range.`
  );
  P(
    `The analysis is correlational; establishing causation would require controlled experiments or process-resolving simulations beyond the present scope.`
  );

  // ---- 7. Conclusions ----
  H2("7. Conclusions");
  P(
    pick([
      `In summary, this study provides reproducible evidence on ${topic} within ${field}. The principal signal is robust to reasonable changes in methodology, baseline, and dataset.`,
      `We have presented a consistent, validated analysis of ${topic}. Its conclusions are stable across the sensitivity tests performed.`,
      `This work contributes a harmonised, reproducible account of ${topic} that is consistent across independent estimates.`,
    ])
  );
  P(
    pick([
      `The results are relevant to ongoing efforts to monitor and respond to environmental change. Future work should expand the observational basis, extend the analysis to additional regions, and integrate complementary modelling approaches.`,
      `Future research should lengthen the records, broaden spatial coverage, and couple the diagnostics to process models to test their generality.`,
      `Subsequent studies could refine these estimates with additional data and explore the nonlinear regimes not sampled here.`,
    ])
  );

  // ---- Declarations ----
  H2("Declarations");
  P(
    `Funding: none declared. Competing interests: the authors declare no competing interests. Author contributions: all listed authors contributed to the analysis and to writing the manuscript.`
  );
  P(
    `Data availability: this is an illustrative sample preprint prepared to demonstrate the TerraNova platform. The abstract is genuine metadata; the remaining text, figures, and tables are synthetic placeholder content, and no original research data are associated with it.`
  );

  // ---- References (varied) ----
  H2("References");
  const surnames = [
    "Reyes",
    "Vasquez",
    "Tanaka",
    "O'Connor",
    "Okeke",
    "Nair",
    "Hansen",
    "Ibrahim",
    "Costa",
    "Lindqvist",
    "Mwangi",
    "Petrov",
  ];
  const journals = [
    "Journal of Earth System Science",
    "Reviews of Environmental Research",
    "Geoscientific Analysis",
    `Journal of Applied ${p.subject}`,
    "Environmental Modelling Letters",
    "Nature Earth Reviews",
    "Annual Review of the Earth System",
    "Open Earth Methods",
    "Computing in the Geosciences",
    "Theoretical Earth Science",
  ];
  const refTitles = [
    `Foundations and open questions in ${p.subject}`,
    `Data-driven approaches to ${field}`,
    `Reproducible analysis in the environmental sciences`,
    `Uncertainty quantification in observational studies`,
    `Monitoring environmental change: a synthesis`,
    `Harmonising heterogeneous datasets for trend detection`,
    `Methods for autocorrelated geophysical series`,
    `Seasonal decomposition of environmental signals`,
    `Cross-validation of model and observational estimates`,
    `Toward consensus estimates in ${field}`,
    `On the interpretation of linear sensitivity diagnostics`,
    `Spatial structure of environmental response fields`,
  ];
  const refCount = 10 + rint(0, 3);
  for (let i = 0; i < refCount; i++) {
    const a1 = pick(surnames);
    let a2 = pick(surnames);
    if (a2 === a1) a2 = pick(surnames);
    const year = rint(2016, 2025);
    const vol = rint(3, 48);
    const pg = rint(1, 380);
    P(
      `${i + 1}. ${a1}, ${a2.charAt(0)}. (${year}). ${pick(refTitles)}. ${pick(journals)}, ${vol}(${rint(1, 4)}), ${pg}-${pg + rint(8, 30)}.`
    );
  }

  return blocks;
}

// ---- Rendering --------------------------------------------------------------

export function buildPaperPdf(p: PaperInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 70, bottom: 64, left: 64, right: 64 },
      info: { Title: p.title, Author: p.authors },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { ink, muted, accent } = PALETTE;
    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left - doc.page.margins.right;
    const bottomLimit = () => doc.page.height - doc.page.margins.bottom;
    const dateStr = new Date(`${p.publishedAt}T00:00:00Z`).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );

    function ensure(space: number) {
      if (doc.y + space > bottomLimit()) doc.addPage();
    }

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(muted)
      .text(`TerraNova Preprint  ·  ${p.subject}  ·  ${dateStr}`, left, doc.y);
    doc
      .moveTo(left, doc.y + 3)
      .lineTo(left + contentWidth, doc.y + 3)
      .lineWidth(1)
      .strokeColor(accent)
      .stroke();
    doc.moveDown(1.1);

    doc.font("Helvetica-Bold").fontSize(20).fillColor(ink).text(p.title, { lineGap: 2 });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(11).fillColor("#374151").text(p.authors);
    doc
      .fontSize(9.5)
      .fillColor(muted)
      .text(p.affiliation)
      .text(`Corresponding author: ${p.correspondingName} (${p.correspondingEmail})`)
      .text(`License: ${p.license}  ·  Posted ${dateStr}`);
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(11).fillColor(accent).text("Abstract");
    doc.moveDown(0.3);
    const absH = doc.heightOfString(p.abstract, { width: contentWidth - 24, lineGap: 2 });
    const boxY = doc.y;
    doc.save().roundedRect(left, boxY, contentWidth, absH + 20, 6).fill(PALETTE.boxbg).restore();
    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(ink)
      .text(p.abstract, left + 12, boxY + 10, {
        width: contentWidth - 24,
        align: "justify",
        lineGap: 2,
      });
    doc.y = boxY + absH + 20 + 8;
    doc.x = left;
    doc
      .font("Helvetica-Oblique")
      .fontSize(10)
      .fillColor("#374151")
      .text(`Keywords: ${p.keywords}`, left, doc.y);
    doc.moveDown(1);

    function renderBlock(b: Block) {
      doc.x = left;
      if (b.t === "h2") {
        ensure(48);
        doc.moveDown(0.4);
        doc.font("Helvetica-Bold").fontSize(13).fillColor(accent).text(b.s, left, doc.y);
        doc.moveDown(0.3);
      } else if (b.t === "h3") {
        ensure(40);
        doc.moveDown(0.2);
        doc.font("Helvetica-Bold").fontSize(11).fillColor(ink).text(b.s, left, doc.y);
        doc.moveDown(0.2);
      } else if (b.t === "p") {
        doc.font("Helvetica").fontSize(10.5).fillColor(ink).text(b.s, left, doc.y, {
          width: contentWidth,
          align: "justify",
          lineGap: 2,
        });
        doc.moveDown(0.5);
      } else if (b.t === "eq") {
        ensure(34);
        doc.moveDown(0.2);
        const eqY = doc.y;
        doc.font("Helvetica-Oblique").fontSize(11).fillColor(ink).text(b.s, left, eqY, {
          width: contentWidth,
          align: "center",
        });
        doc.font("Helvetica").fontSize(9).fillColor(muted).text(`(${b.n})`, left, eqY, {
          width: contentWidth,
          align: "right",
        });
        doc.moveDown(0.6);
      } else if (b.t === "fig") {
        ensure(b.h + 44);
        const fy = doc.y;
        b.draw(doc, left, fy, contentWidth, b.h);
        doc.y = fy + b.h + 4;
        doc.x = left;
        doc
          .font("Helvetica-Oblique")
          .fontSize(8.5)
          .fillColor(muted)
          .text(b.cap, left, doc.y, { width: contentWidth, align: "center", lineGap: 1 });
        doc.moveDown(0.9);
        doc.fillColor(ink);
      } else if (b.t === "table") {
        const rowH = 20;
        const tableH = rowH * (b.rows.length + 1);
        ensure(tableH + 30);
        const cols = b.head.length;
        const colW = contentWidth / cols;
        let ty = doc.y;
        doc.save().rect(left, ty, contentWidth, rowH).fill(accent).restore();
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
        b.head.forEach((c, i) => doc.text(c, left + i * colW + 5, ty + 6, { width: colW - 10 }));
        ty += rowH;
        doc.font("Helvetica").fontSize(9).fillColor(ink);
        b.rows.forEach((row, ri) => {
          if (ri % 2 === 1)
            doc.save().rect(left, ty, contentWidth, rowH).fill(PALETTE.boxbg).restore();
          row.forEach((c, i) =>
            doc.fillColor(ink).text(c, left + i * colW + 5, ty + 6, { width: colW - 10 })
          );
          ty += rowH;
        });
        doc.save().lineWidth(0.5).strokeColor(PALETTE.grid).rect(left, doc.y, contentWidth, tableH).stroke().restore();
        doc.y = ty + 6;
        doc.x = left;
        doc
          .font("Helvetica-Oblique")
          .fontSize(8.5)
          .fillColor(muted)
          .text(b.cap, left, doc.y, { width: contentWidth, align: "center" });
        doc.moveDown(0.9);
        doc.fillColor(ink);
      }
    }

    for (const b of buildBlocks(p)) renderBlock(b);

    const range = doc.bufferedPageRange();
    const shortTitle = p.title.length > 70 ? p.title.slice(0, 67) + "..." : p.title;
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const pageNo = i - range.start + 1;
      if (pageNo > 1) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(muted)
          .text(shortTitle, left, 36, { width: contentWidth, align: "left", lineBreak: false });
      }
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text(`TerraNova preprint · page ${pageNo} of ${range.count}`, left, doc.page.height - 44, {
          width: contentWidth,
          align: "center",
          lineBreak: false,
        });
    }

    doc.end();
  });
}
