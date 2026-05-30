import type { Report } from "@/lib/types";

export function createReportPdf(report: Report) {
  const lines = [
    "Sprintform AI Coaching Report",
    `Source: ${report.sourceName}`,
    `Detector: ${report.summary.detector}`,
    `Frames analyzed: ${report.summary.frameCount}`,
    `Duration: ${report.summary.durationMs} ms`,
    `Average trunk lean: ${report.summary.avgTrunkLeanDeg} deg`,
    `Peak ankle separation: ${report.summary.peakAnkleSeparationNorm}`,
    `Knee range: ${report.summary.minKneeFlexionDeg} - ${report.summary.maxKneeExtensionDeg} deg`,
    `Average pose confidence: ${report.summary.avgPoseConfidence ?? 0}`,
    "",
    "Limitations:",
    ...report.summary.limitations.map((item) => `- ${item}`),
  ];

  const content = [
    "BT",
    "/F1 16 Tf",
    "72 742 Td",
    ...lines.flatMap((line, index) => {
      const font = index === 0 ? ["/F1 16 Tf"] : ["/F1 10 Tf"];
      return [...font, `(${escapePdf(line)}) Tj`, "0 -18 Td"];
    }),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([body], { type: "application/pdf" });
}

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

