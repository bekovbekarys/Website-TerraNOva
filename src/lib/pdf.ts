import "server-only";

function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Generates a minimal single-page PDF (standard Helvetica, no embedding) that
// displays a single line of text. Used for demonstration preprints, which have
// no real manuscript attached.
export function unavailablePdf(
  message = "PDF is not available to view."
): Buffer {
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
