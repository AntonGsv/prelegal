import type jsPDF from "jspdf";
import {
  groupFields,
  partyFields,
  type BodyPlaceholder,
  type DocumentConfig,
} from "./document-registry";

/**
 * Draft disclaimer shown on every generated document. Defined once here and used
 * by both the live preview (`document-preview.tsx`) and the PDF cover page
 * (`renderCoverPage`) so the two can never disagree on the wording.
 */
export const DRAFT_DISCLAIMER =
  "DRAFT — This document is a draft provided for informational purposes only. " +
  "It does not constitute legal advice and should be reviewed by a qualified " +
  "attorney before use.";

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Substitute cover-page variable phrases in the standard-terms body with the
 * user's values. Only the NDA declares placeholders today; every other document
 * relies on the synthesized cover page to carry its values, so its body renders
 * verbatim. Uses literal (non-regex) replacement since patterns are plain text.
 */
export function substitutePlaceholders(
  body: string,
  placeholders: readonly BodyPlaceholder[],
  fields: Record<string, string | null | undefined>,
): string {
  let text = body;
  for (const { pattern, field } of placeholders) {
    const raw = fields[field];
    if (raw && raw.trim() !== "") {
      text = text.split(pattern).join(raw);
    }
  }
  return text;
}

/**
 * Produce the standard-terms body for display or PDF: substitute known
 * placeholder values, strip inline HTML tags (only the AI Addendum template
 * uses them, e.g. `<span class="coverpage_link">`) and markdown bold markers.
 * Shared by the live preview and the PDF generator so the two can never clean
 * the text differently.
 */
export function renderStandardTerms(
  config: DocumentConfig,
  templateBody: string,
  fields: Record<string, string | null | undefined>,
): string {
  return substitutePlaceholders(templateBody, config.bodyPlaceholders, fields)
    .replace(/<[^>]+>/g, "") // strip inline HTML (AI Addendum span markup)
    .replace(/\*\*/g, "") // strip markdown bold markers
    .replace(/(\S)[^\S\n]{2,}/g, "$1 "); // collapse spaces left by removed tags
}

/**
 * Render the synthesized cover page for any document: title, one block per
 * party role, key terms, governing law, and signature lines. Layout is derived
 * from the registry field groups, so it works for every document type. Flows
 * vertically with page-break handling for documents with many long fields.
 */
export function renderCoverPage(
  doc: jsPDF,
  config: DocumentConfig,
  data: Record<string, string>,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margins = 25;
  const contentWidth = pageWidth - margins * 2;
  const bottom = pageHeight - 20;
  let y = 30;

  const ensure = (space = 6) => {
    if (y + space > bottom) {
      doc.addPage();
      y = 20;
    }
  };
  const heading = (text: string) => {
    ensure(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(text, margins, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  };
  const line = (text: string) => {
    for (const wrapped of doc.splitTextToSize(text, contentWidth)) {
      ensure();
      doc.text(wrapped, margins, y);
      y += 6;
    }
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(config.name.toUpperCase(), pageWidth / 2, y, { align: "center" });
  y += 12;

  // Draft disclaimer (centered, small, italic) directly under the title.
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  for (const wrapped of doc.splitTextToSize(DRAFT_DISCLAIMER, contentWidth)) {
    doc.text(wrapped, pageWidth / 2, y, { align: "center" });
    y += 4;
  }
  doc.setTextColor(0, 0, 0);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  // Party blocks
  for (const role of config.partyRoles) {
    const fields = partyFields(config, role.key);
    if (fields.length === 0) continue;
    heading(`${role.label}:`);
    for (const field of fields) line(`${field.label}: ${data[field.key] ?? ""}`);
    y += 4;
  }

  // Key terms
  const terms = groupFields(config, "terms");
  if (terms.length > 0) {
    heading("Key Terms:");
    for (const field of terms) {
      const raw = data[field.key] ?? "";
      const value = field.kind === "date" && raw ? formatDate(raw) : raw;
      line(`${field.label}: ${value}`);
    }
    y += 4;
  }

  // Governing law
  const legal = groupFields(config, "legal");
  if (legal.length > 0) {
    heading("Governing Law and Jurisdiction:");
    for (const field of legal) line(`${field.label}: ${data[field.key] ?? ""}`);
    y += 4;
  }

  // Signatures
  heading("Signatures:");
  y += 4;
  for (const role of config.partyRoles) {
    ensure(22);
    doc.text("_____________________________", margins, y);
    doc.text(`${role.label} Representative`, margins, y + 5);
    doc.text("Date: _______________", margins + 80, y);
    y += 22;
  }
}
