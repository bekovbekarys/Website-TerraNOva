import PDFDocument from "pdfkit";

// Generates a professional, multi-page (>= 10 pages) sample preprint PDF that
// follows the TerraNova template: title, authors, abstract, keywords, numbered
// sections with subsections, figures (vector charts + a schematic), a data
// table, equations, and references. The abstract is the real one; the body is
// coherent placeholder prose. Declarations state these are sample documents.

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

// Deterministic RNG seeded from a string, so a paper's figures are stable
// across re-seeds (keeps the seed idempotent).
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

// ---- Block model -----------------------------------------------------------

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

// ---- Figures (pure vector graphics) ----------------------------------------

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
    // gridlines + y labels
    doc.lineWidth(0.5).font("Helvetica").fontSize(7).fillColor(PALETTE.muted);
    for (const tick of niceTicks(lo, hi, 4)) {
      const ty = sy(tick);
      doc.strokeColor(PALETTE.grid).moveTo(px, ty).lineTo(px + pw, ty).stroke();
      doc.fillColor(PALETTE.muted).text(tick.toFixed(1), x, ty - 3, {
        width: padL - 6,
        align: "right",
      });
    }
    // axes
    doc
      .lineWidth(1)
      .strokeColor(PALETTE.axis)
      .moveTo(px, py)
      .lineTo(px, py + ph)
      .lineTo(px + pw, py + ph)
      .stroke();
    // series
    for (const s of series) {
      doc.lineWidth(1.4).strokeColor(s.color);
      s.data.forEach((v, i) => {
        if (i === 0) doc.moveTo(sx(i), sy(v));
        else doc.lineTo(sx(i), sy(v));
      });
      doc.stroke();
    }
    // legend
    let lx = px + 6;
    const ly = y + 8;
    doc.fontSize(7.5);
    for (const s of series) {
      doc.fillColor(s.color).rect(lx, ly, 9, 9).fill();
      doc.fillColor(PALETTE.muted).text(s.label, lx + 12, ly + 1);
      lx += 12 + doc.widthOfString(s.label) + 18;
    }
    // axis labels
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
    for (const p of points) {
      doc.fillColor(color).circle(sx(p.x), sy(p.y), 1.8).fill();
    }
    // regression line
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
    const centers: number[] = [];
    labels.forEach((label, i) => {
      doc
        .lineWidth(1)
        .strokeColor(PALETTE.accent)
        .fillColor(PALETTE.boxbg)
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
      centers.push(bx + boxW);
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

// ---- Content ----------------------------------------------------------------

function buildBlocks(p: PaperInput): Block[] {
  const field = p.subject.toLowerCase();
  const topic = lc(p.title.replace(/\.$/, ""));
  const kw = p.keywords;
  const rng = makeRng(p.title);

  const blocks: Block[] = [];
  const P = (s: string) => blocks.push({ t: "p", s });
  const H2 = (s: string) => blocks.push({ t: "h2", s });
  const H3 = (s: string) => blocks.push({ t: "h3", s });

  // Time series data
  const n = 32;
  const base = 10 + rng() * 6;
  const trend = (rng() - 0.3) * 0.25;
  const obs: number[] = [];
  const model: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = base + trend * i + Math.sin(i / 3) * 1.2 + (rng() - 0.5) * 1.5;
    obs.push(v);
    model.push(v + (rng() - 0.5) * 0.9);
  }
  const bars = ["DJF", "MAM", "JJA", "SON", "Annual", "Trend", "Anom."].map(
    (label) => ({ label, value: 5 + rng() * 40 })
  );
  const slope = 0.4 + rng() * 0.6;
  const intercept = rng() * 3;
  const pts = Array.from({ length: 46 }, () => {
    const xx = rng() * 10;
    return { x: xx, y: slope * xx + intercept + (rng() - 0.5) * 3 };
  });

  // 1. Introduction
  H2("1. Introduction");
  P(
    `Robust observational and modelling evidence is increasingly required to understand a rapidly changing Earth system. Within ${field}, questions surrounding ${kw} remain only partially resolved, and the absence of long, internally consistent records has limited progress. This preprint sets out to narrow that gap by combining established datasets with a reproducible analytical workflow.`
  );
  P(
    `Earlier studies established the broad context for this work but were often constrained by short observational windows, heterogeneous instrumentation, or limited spatial coverage. As a result, the magnitude and drivers of the patterns associated with ${topic} have remained uncertain, and competing interpretations have proven difficult to distinguish on the basis of the available evidence alone.`
  );
  P(
    `Recent advances in data availability, processing capacity, and analytical method now make it possible to revisit these questions with greater confidence. In particular, the integration of independent observational streams allows cross-validation that was not previously feasible, reducing the influence of dataset-specific artefacts on the conclusions drawn.`
  );
  P(
    `The objectives of this study are threefold. First, we assemble a harmonised record suitable for quantitative analysis. Second, we characterise the dominant patterns and quantify their associated uncertainty. Third, we interpret these patterns in the context of prior work and assess their implications for monitoring and decision-making in ${field}.`
  );
  P(
    `Prior work in this area can be grouped into three broad strands: observational reconstructions that prioritise spatial and temporal coverage; process studies that emphasise mechanistic understanding at the expense of generality; and modelling efforts that seek to reconcile the two. Each strand has advanced the field, yet the lack of a common analytical baseline has made direct comparison difficult and has slowed the emergence of community consensus.`
  );
  P(
    `The significance of resolving these questions extends beyond the academic literature. Reliable quantification of ${topic} underpins monitoring programmes, informs the calibration and evaluation of predictive models, and supports evidence-based decisions by practitioners and policymakers. Improvements in accuracy and transparency therefore have practical as well as scientific value.`
  );
  P(
    `The remainder of this manuscript is organised as follows. Section 2 describes the study area, datasets, and analytical approach, including validation. Section 3 presents the principal results, supported by figures and summary tables. Section 4 discusses interpretation, Section 5 considers implications, Section 6 sets out limitations, and Section 7 states the main conclusions.`
  );

  // 2. Data and methods
  H2("2. Data and methods");
  P(
    `This section describes the materials and procedures used in the analysis. All processing steps were designed to be transparent and reproducible, and the workflow was version-controlled throughout to support independent verification.`
  );
  H3("2.1 Study area and conceptual framework");
  P(
    `The analysis focuses on a representative domain in which the processes relevant to ${topic} are well expressed. The conceptual model adopted here (Figure 1) links external forcing to the observed response through a small number of intermediate processes, providing a tractable framework for interpretation.`
  );
  blocks.push({
    t: "fig",
    h: 150,
    draw: schematic(["Forcing", "Process", "Response", "Observation"]),
    cap: "Figure 1. Conceptual model linking external forcing to the observed response through intermediate processes and the measurement chain.",
  });
  P(
    `Within this framework, the forcing term aggregates the principal external drivers, while the process term captures the mechanisms that mediate the system response. This separation clarifies which components are directly observable and which must be inferred, and it guides the choice of diagnostic metrics used in subsequent sections.`
  );
  H3("2.2 Datasets");
  P(
    `We combined multiple publicly available datasets spanning the study period. Each source was quality-controlled, screened for outliers, and harmonised to a common spatial and temporal reference grid. Table 1 summarises the principal datasets, their temporal coverage, and their nominal resolution.`
  );
  blocks.push({
    t: "table",
    cap: "Table 1. Principal datasets used in this study, with temporal coverage and nominal resolution.",
    head: ["Dataset", "Variable", "Coverage", "Resolution"],
    rows: [
      ["Reanalysis A", "State variable", "1994-2025", "0.25 deg, monthly"],
      ["Satellite B", "Surface flux", "2002-2025", "1 km, 8-day"],
      ["In-situ C", "Point sample", "1998-2024", "Station, daily"],
      ["Model D", "Diagnostic", "1990-2025", "0.5 deg, monthly"],
    ],
  });
  H3("2.3 Analytical approach");
  P(
    `Anomalies were computed relative to a fixed climatological baseline, and trends were estimated using ordinary least squares with uncertainty derived from the residual covariance. The principal diagnostic follows the relationship in Equation (1), where the response R is expressed as a linear function of the forcing F with sensitivity k and a residual term e.`
  );
  blocks.push({ t: "eq", s: "R = k * F + b + e", n: 1 });
  P(
    `To quantify the strength of association between variables we used the coefficient of determination, defined in Equation (2). Statistical significance was assessed at the 95 percent confidence level, and a block-bootstrap procedure was used to account for temporal autocorrelation in the residuals.`
  );
  blocks.push({ t: "eq", s: "R^2 = 1 - SS_res / SS_tot", n: 2 });
  P(
    `Sensitivity tests were performed to confirm that the main conclusions are not dependent on any single assumption, baseline period, or dataset. These tests are summarised in the Appendix and did not materially alter the results reported below.`
  );
  H3("2.4 Validation");
  P(
    `Before interpretation, the harmonised product was validated against independent reference observations that were not used in its construction. Agreement was assessed using the mean bias, the root-mean-square error, and the correlation coefficient, computed over the common period. Table 2 reports these metrics for each dataset.`
  );
  blocks.push({
    t: "table",
    cap: "Table 2. Validation metrics against independent reference observations over the common period.",
    head: ["Dataset", "Bias", "RMSE", "Correlation"],
    rows: [
      ["Reanalysis A", "-0.04", "0.61", "0.93"],
      ["Satellite B", "0.09", "0.74", "0.89"],
      ["In-situ C", "0.02", "0.55", "0.95"],
      ["Ensemble", "0.01", "0.48", "0.96"],
    ],
  });
  P(
    `The ensemble combination outperformed any individual dataset, with a near-zero bias and the highest correlation, supporting its use as the basis for the analysis that follows. Residual errors were spatially incoherent, consistent with random measurement noise rather than a systematic offset.`
  );

  // 3. Results
  H2("3. Results");
  H3("3.1 Temporal evolution");
  P(
    `The harmonised record reveals a coherent temporal evolution over the study period (Figure 2). Observations and the independent model estimate track one another closely, lending confidence to the reconstructed signal and indicating that dataset-specific artefacts are not driving the result.`
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
    cap: "Figure 2. Temporal evolution of the observed and modelled quantity over the study period. Shaded interannual variability is superimposed on a longer-term trend.",
  });
  P(
    `A pronounced change in tendency is evident in the second half of the record, consistent across both series. The magnitude of this change exceeds the interannual variability of the baseline period, indicating that it is unlikely to arise from sampling noise alone.`
  );
  H3("3.2 Seasonal and component structure");
  P(
    `Decomposing the signal into its seasonal components (Figure 3) shows that the response is not uniform throughout the year. The largest contributions arise in specific seasons, with the annual mean and the long-term trend reflecting the combined influence of these components.`
  );
  blocks.push({
    t: "fig",
    h: 190,
    draw: barChart(bars, PALETTE.accent, "Contribution"),
    cap: "Figure 3. Seasonal and aggregate contributions to the total signal. Bars denote the mean contribution of each component.",
  });
  P(
    `This structure has practical consequences for monitoring: surveys concentrated in a single season may systematically under- or over-estimate the annual response, depending on which component dominates locally.`
  );
  H3("3.3 Relationship between variables");
  P(
    `The relationship between the forcing and the response is approximately linear across the observed range (Figure 4). The fitted slope is positive and statistically significant, and the coefficient of determination indicates that the forcing accounts for the majority of the explained variance.`
  );
  blocks.push({
    t: "fig",
    h: 200,
    draw: scatterChart(pts, slope, intercept, PALETTE.blue),
    cap: "Figure 4. Scatter of the response against the forcing, with the ordinary least-squares fit (amber line). Each point denotes one observation.",
  });
  P(
    `Residual variability about the fit is consistent with known measurement and sampling limitations rather than with an alternative mechanism, and no systematic curvature is apparent over the sampled range.`
  );
  H3("3.4 Spatial structure");
  const regions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"].map((label) => ({
    label,
    value: 8 + rng() * 36,
  }));
  P(
    `The response is spatially heterogeneous (Figure 5). The strongest values are concentrated in a subset of regions, while others show little change. This spatial organisation is consistent with the conceptual model in Figure 1, in which the response is mediated by processes that vary geographically.`
  );
  blocks.push({
    t: "fig",
    h: 190,
    draw: barChart(regions, PALETTE.blue, "Response"),
    cap: "Figure 5. Regional decomposition of the response. Bars denote the mean response within each sector of the study domain.",
  });
  P(
    `The concentration of the signal in particular regions has implications for the design of observing networks: sparse or unevenly distributed sampling could materially bias domain-averaged estimates, depending on which regions are represented.`
  );

  // 4. Discussion
  H2("4. Discussion");
  P(
    `These findings align with, and extend, previous work in ${field}. Taken together, they suggest that ${topic} plays a more significant role than several earlier studies recognised, with implications for monitoring strategy, model evaluation, and policy-relevant assessment.`
  );
  P(
    `The close agreement between independent observational and model estimates is particularly encouraging. It indicates that the underlying processes are captured with sufficient fidelity to support quantitative inference, and that the harmonisation procedure did not introduce spurious agreement.`
  );
  P(
    `At the same time, the seasonal structure documented in Section 3.2 cautions against over-reliance on annual-mean diagnostics. Mechanistic interpretation should account for the disproportionate contribution of specific seasons, which may respond differently to future change.`
  );
  P(
    `Comparison with prior estimates suggests that earlier disagreements may largely reflect differences in baseline period and spatial coverage rather than genuine physical inconsistency. Reconciling these factors is a promising direction for community efforts to produce consensus estimates.`
  );
  P(
    `Finally, the spatial heterogeneity documented in Section 3.4 implies that domain-averaged diagnostics conceal important regional detail. Interpretations framed solely in terms of the mean may therefore miss locally significant behaviour that is relevant for impacts and adaptation.`
  );

  // 5. Implications
  H2("5. Implications");
  P(
    `The results carry several practical implications. For monitoring, they argue for observing strategies that resolve both the seasonal and the spatial structure of the response rather than relying on annual, domain-averaged summaries. Targeted observations in the regions identified here would yield the greatest reduction in uncertainty per unit of effort.`
  );
  P(
    `For modelling, the close correspondence between observations and the independent estimate provides a benchmark against which predictive models can be evaluated. The diagnostic relationships reported here offer compact, testable targets that complement traditional point-by-point comparison and may help to diagnose the origin of model biases.`
  );

  // 6. Limitations
  H2("6. Limitations");
  P(
    `Several limitations temper this interpretation. The spatial and temporal coverage of the underlying data constrains how far the results can be generalised, and the linear diagnostic, while parsimonious, may not capture threshold or nonlinear behaviour that could emerge under stronger forcing.`
  );
  P(
    `In addition, the harmonisation procedure necessarily introduces assumptions about how heterogeneous sources relate to one another. Although validation indicates these assumptions are reasonable over the study period, they may not hold under conditions outside the observed range, and extrapolation should be undertaken with caution.`
  );
  P(
    `Finally, the analysis is correlational. While the relationships reported here are consistent with the proposed conceptual model, establishing causation would require controlled experiments or process-resolving simulations beyond the scope of this study.`
  );

  // 7. Conclusions
  H2("7. Conclusions");
  P(
    `In summary, this study provides additional, reproducible evidence on ${topic} within ${field}. The principal signal is robust to reasonable changes in methodology, baseline, and dataset, and is consistent across independent observational and model estimates.`
  );
  P(
    `The results are relevant to ongoing efforts to monitor and respond to environmental change, and they highlight the value of harmonised, multi-source records for quantitative assessment. Future work should expand the observational basis, extend the analysis to additional regions, and integrate complementary modelling approaches to test the generality of these conclusions.`
  );

  // Declarations
  H2("Declarations");
  P(
    `Funding: none declared. Competing interests: the authors declare no competing interests. Author contributions: all listed authors contributed to the analysis and to writing the manuscript.`
  );
  P(
    `Data availability: this is an illustrative sample preprint prepared to demonstrate the TerraNova platform. The abstract is genuine metadata; the remaining text, figures, and tables are synthetic placeholder content, and no original research data are associated with it.`
  );

  // References
  H2("References");
  const refs = [
    `Reyes, S., & Vasquez, H. (2022). Foundations and open questions in ${p.subject}. Journal of Earth System Science, 14(2), 101-118.`,
    `Tanaka, M., O'Connor, L., & Nair, P. (2023). Data-driven approaches to ${field}. Reviews of Environmental Research, 9(4), 233-251.`,
    `Okeke, A. (2021). Methods for reproducible analysis in the environmental sciences. Open Earth Methods, 5, 1-19.`,
    `Vasquez, H., & Tanaka, M. (2024). Uncertainty quantification in observational studies. Geoscientific Analysis, 31(1), 55-72.`,
    `Nair, P., & Reyes, S. (2020). Monitoring environmental change: a synthesis. Annual Review of the Earth System, 48, 415-440.`,
    `O'Connor, L. (2019). Harmonising heterogeneous datasets for trend detection. Earth Data Science, 3(2), 88-104.`,
    `Reyes, S. (2023). Bootstrap methods for autocorrelated geophysical series. Statistics in the Geosciences, 12(1), 19-37.`,
    `Tanaka, M. (2022). Seasonal decomposition of environmental signals. Journal of Applied ${p.subject}, 7(3), 145-162.`,
    `Nair, P., Okeke, A., & Vasquez, H. (2021). Cross-validation of model and observational estimates. Environmental Modelling Letters, 6, 201-217.`,
    `Reyes, S., & Nair, P. (2024). Toward consensus estimates in ${field}. Nature Earth Reviews, 2, 33-49.`,
    `Okeke, A., & O'Connor, L. (2020). Reproducible workflows for Earth observation. Computing in the Geosciences, 28(4), 410-426.`,
    `Vasquez, H. (2018). On the interpretation of linear sensitivity diagnostics. Theoretical Earth Science, 41(2), 77-95.`,
  ];
  refs.forEach((r, i) => blocks.push({ t: "p", s: `${i + 1}. ${r}` }));

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

    // Masthead
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

    // Title + byline
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

    // Abstract box
    doc.font("Helvetica-Bold").fontSize(11).fillColor(accent).text("Abstract");
    doc.moveDown(0.3);
    const absH = doc.heightOfString(p.abstract, { width: contentWidth - 24, lineGap: 2 });
    const boxY = doc.y;
    doc
      .save()
      .roundedRect(left, boxY, contentWidth, absH + 20, 6)
      .fill(PALETTE.boxbg)
      .restore();
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
    doc.font("Helvetica-Oblique").fontSize(10).fillColor("#374151").text(`Keywords: ${p.keywords}`, left, doc.y);
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
        doc.font("Helvetica-Oblique").fontSize(11).fillColor(ink);
        const eqY = doc.y;
        doc.text(b.s, left, eqY, { width: contentWidth, align: "center" });
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
        doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(muted).text(b.cap, left, doc.y, {
          width: contentWidth,
          align: "center",
          lineGap: 1,
        });
        doc.moveDown(0.9);
        doc.fillColor(ink);
      } else if (b.t === "table") {
        const rowH = 20;
        const tableH = rowH * (b.rows.length + 1);
        ensure(tableH + 30);
        const cols = b.head.length;
        const colW = contentWidth / cols;
        let ty = doc.y;
        // header
        doc.save().rect(left, ty, contentWidth, rowH).fill(accent).restore();
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
        b.head.forEach((c, i) =>
          doc.text(c, left + i * colW + 5, ty + 6, { width: colW - 10 })
        );
        ty += rowH;
        // rows
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
        doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(muted).text(b.cap, left, doc.y, {
          width: contentWidth,
          align: "center",
        });
        doc.moveDown(0.9);
        doc.fillColor(ink);
      }
    }

    // The fixed template (sections, subsections, five figures, two tables,
    // equations, and references) reliably produces ~14 pages.
    for (const b of buildBlocks(p)) renderBlock(b);

    // Headers + footers on every page
    const range = doc.bufferedPageRange();
    const shortTitle =
      p.title.length > 70 ? p.title.slice(0, 67) + "..." : p.title;
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
        .text(
          `TerraNova preprint · page ${pageNo} of ${range.count}`,
          left,
          doc.page.height - 44,
          { width: contentWidth, align: "center", lineBreak: false }
        );
    }

    doc.end();
  });
}
