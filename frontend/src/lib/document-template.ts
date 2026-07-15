import type jsPDF from "jspdf";
import {
  groupFields,
  partyFields,
  type BodyPlaceholder,
  type DocumentConfig,
} from "./document-registry";

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
 * placeholder values and strip markdown bold markers. Shared by the live
 * preview and the PDF generator so the two can never clean the text differently.
 */
export function renderStandardTerms(
  config: DocumentConfig,
  templateBody: string,
  fields: Record<string, string | null | undefined>,
): string {
  return substitutePlaceholders(
    templateBody,
    config.bodyPlaceholders,
    fields,
  ).replace(/\*\*/g, "");
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
  y += 15;
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
