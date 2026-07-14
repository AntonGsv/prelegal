import { jsPDF } from "jspdf";
import {
  renderCoverPage,
  STANDARD_TERMS,
  STANDARD_TERMS_PLACEHOLDERS,
} from "./nda-template";
import type { NdaFormData } from "./nda-schema";

export function generateNdaPdf(data: NdaFormData): void {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margins = 25;
  const maxWidth = pageWidth - margins * 2;

  // Page 1: Cover Page
  renderCoverPage(doc, data);

  // Page 2+: Standard Terms with placeholder substitution
  let termsText = STANDARD_TERMS;
  for (const [pattern, field] of STANDARD_TERMS_PLACEHOLDERS) {
    termsText = termsText.replace(pattern, data[field]);
  }

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Standard Terms", pageWidth / 2, 20, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const lines = doc.splitTextToSize(termsText, maxWidth);

  let y = 30;
  const lineHeight = 4.5;
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = pageHeight - 15;

  for (const line of lines) {
    if (y > bottomMargin) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, margins, y);
    y += lineHeight;
  }

  // Save the PDF
  doc.save("Mutual-NDA.pdf");
}
