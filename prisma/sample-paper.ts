import PDFDocument from "pdfkit";

// Generates a properly formatted, multi-page sample preprint PDF that follows
// the TerraNova template (title, authors, abstract, keywords, then numbered
// sections and references). The abstract is the real one; the body is coherent
// placeholder prose so demonstration entries read like genuine preprints.

export type PaperInput = {
  title: string;
  authors: string; // comma-separated
  subject: string;
  keywords: string; // comma-separated
  license: string;
  abstract: string;
  affiliation: string;
  correspondingName: string;
  correspondingEmail: string;
  publishedAt: string; // YYYY-MM-DD
};

function lc(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function sections(p: PaperInput): { heading: string; paragraphs: string[] }[] {
  const field = p.subject.toLowerCase();
  const topic = lc(p.title.replace(/\.$/, ""));
  const kw = p.keywords;

  return [
    {
      heading: "1. Introduction",
      paragraphs: [
        `Robust observational and modelling evidence is increasingly needed to understand a changing Earth system. Within ${field}, questions surrounding ${kw} remain only partially resolved, which motivates the analysis presented in this preprint.`,
        `Here we synthesise available evidence and present new analysis aimed at narrowing that gap. We set out the motivation for the study, summarise the data and methods used, and report the principal findings together with their broader implications for research and practice.`,
      ],
    },
    {
      heading: "2. Data and methods",
      paragraphs: [
        `We combined publicly available datasets with targeted analysis appropriate to ${field}. Data were quality-controlled, harmonised to a common spatial and temporal reference, and processed using established, reproducible workflows. Where relevant, measurement and sampling uncertainty were propagated explicitly through each processing step.`,
        `Analytical choices followed standard practice in the field. Sensitivity tests were performed to confirm that the main conclusions do not depend on any single assumption or parameter. Full processing details are provided so that the workflow can be reproduced by other groups.`,
      ],
    },
    {
      heading: "3. Results",
      paragraphs: [
        `The analysis reveals coherent and statistically meaningful patterns consistent with the hypotheses outlined above (Figure 1). The strongest signals emerge where data coverage is densest, and they persist across the sensitivity tests described in Section 2.`,
        `Secondary analyses (Table 1) corroborate the primary result and help to bound its magnitude. Residual variability is consistent with known measurement and sampling limitations rather than with an alternative mechanism.`,
      ],
    },
    {
      heading: "4. Discussion",
      paragraphs: [
        `These findings align with, and extend, previous work in ${field}. Taken together, they suggest that ${topic} plays a more significant role than earlier studies recognised, with implications for monitoring, modelling, and decision-making.`,
        `Several limitations temper this interpretation. The spatial and temporal coverage of the underlying data constrains how far the results can be generalised, and continued observation will be required to confirm the trends reported here.`,
      ],
    },
    {
      heading: "5. Conclusions",
      paragraphs: [
        `In summary, this study provides additional evidence on ${topic} within ${field}. The results are reproducible, robust to reasonable changes in methodology, and relevant to ongoing efforts to understand and respond to environmental change. Future work should expand the observational basis and integrate complementary modelling approaches.`,
      ],
    },
    {
      heading: "Declarations",
      paragraphs: [
        `Funding: none declared. Competing interests: the authors declare no competing interests. Author contributions: all listed authors contributed to the analysis and to writing the manuscript.`,
        `Data availability: this is an illustrative sample preprint prepared to demonstrate the TerraNova platform. The text beyond the abstract is placeholder content, and no original research data are associated with it.`,
      ],
    },
  ];
}

function references(p: PaperInput): string[] {
  const f = p.subject;
  return [
    `Reyes, S., & Vasquez, H. (2022). Foundations and open questions in ${f}. Journal of Earth System Science, 14(2), 101-118.`,
    `Tanaka, M., O'Connor, L., & Nair, P. (2023). Data-driven approaches to ${f.toLowerCase()}. Reviews of Environmental Research, 9(4), 233-251.`,
    `Okeke, A. (2021). Methods for reproducible analysis in the environmental sciences. Open Earth Methods, 5, 1-19.`,
    `Vasquez, H., & Tanaka, M. (2024). Uncertainty quantification in observational studies. Geoscientific Analysis, 31(1), 55-72.`,
    `Nair, P., & Reyes, S. (2020). Monitoring environmental change: a synthesis. Annual Review of the Earth System, 48, 415-440.`,
  ];
}

export function buildPaperPdf(p: PaperInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 64, bottom: 70, left: 64, right: 64 },
      info: { Title: p.title, Author: p.authors },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const accent = "#2f7d54";
    const muted = "#6b7280";
    const ink = "#1c1917";
    const contentWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const dateStr = new Date(`${p.publishedAt}T00:00:00Z`).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );

    // Running header band
    doc
      .fontSize(9)
      .fillColor(muted)
      .font("Helvetica")
      .text(`TerraNova Preprint  ·  ${p.subject}  ·  ${dateStr}`, {
        align: "left",
      });
    doc
      .moveTo(doc.x, doc.y + 4)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
      .strokeColor("#e7e5e4")
      .stroke();
    doc.moveDown(1.2);

    // Title
    doc
      .fillColor(ink)
      .font("Helvetica-Bold")
      .fontSize(19)
      .text(p.title, { lineGap: 2 });
    doc.moveDown(0.6);

    // Authors + affiliation
    doc.font("Helvetica").fontSize(11).fillColor("#374151").text(p.authors);
    doc
      .fontSize(9.5)
      .fillColor(muted)
      .text(p.affiliation)
      .text(`Corresponding author: ${p.correspondingName} (${p.correspondingEmail})`)
      .text(`License: ${p.license}`);
    doc.moveDown(0.9);

    // Abstract
    doc.font("Helvetica-Bold").fontSize(11).fillColor(accent).text("Abstract");
    doc.moveDown(0.2);
    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(ink)
      .text(p.abstract, { align: "justify", lineGap: 2 });
    doc.moveDown(0.5);

    // Keywords
    doc
      .font("Helvetica-Oblique")
      .fontSize(10)
      .fillColor("#374151")
      .text(`Keywords: ${p.keywords}`);
    doc.moveDown(1);

    // Body sections
    for (const sec of sections(p)) {
      if (doc.y > doc.page.height - 160) doc.addPage();
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(accent)
        .text(sec.heading);
      doc.moveDown(0.3);
      doc.font("Helvetica").fontSize(10.5).fillColor(ink);
      for (const para of sec.paragraphs) {
        doc.text(para, { align: "justify", lineGap: 2 });
        doc.moveDown(0.5);
      }
      doc.moveDown(0.4);
    }

    // References
    if (doc.y > doc.page.height - 180) doc.addPage();
    doc.font("Helvetica-Bold").fontSize(12).fillColor(accent).text("References");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9.5).fillColor(ink);
    references(p).forEach((ref, i) => {
      doc.text(`${i + 1}. ${ref}`, { lineGap: 1.5, indent: 0 });
      doc.moveDown(0.25);
    });

    // Page-number footers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text(
          `TerraNova preprint · page ${i - range.start + 1} of ${range.count}`,
          doc.page.margins.left,
          doc.page.height - 48,
          { width: contentWidth, align: "center", lineBreak: false }
        );
    }

    doc.end();
  });
}
