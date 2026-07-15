import { jsPDF } from "jspdf";
import { renderCoverPage, renderStandardTerms } from "./document-template";
import type { DocumentConfig } from "./document-registry";
import type { DocumentData } from "./document-chat-data";

/** The downloaded filename for a document, e.g. "Mutual-NDA.pdf". */
export function pdfFilename(config: DocumentConfig): string {
  return `${config.shortName.replace(/\s+/g, "-")}.pdf`;
}

/**
 * Generate and download a PDF for any document: a synthesized cover page
 * followed by the standard-terms body (with placeholder substitution). The
 * body text comes from the document's `.md` template, passed in from the
 * server component that read it.
 */
export function generateDocumentPdf(
  config: DocumentConfig,
  templateBody: string,
  data: DocumentData,
): void {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margins = 25;
  const maxWidth = pageWidth - margins * 2;

  // Page 1: synthesized cover page
  renderCoverPage(doc, config, data);

  // Page 2+: standard terms with placeholder substitution
  const termsText = renderStandardTerms(config, templateBody, data);

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

  doc.save(pdfFilename(config));
}
