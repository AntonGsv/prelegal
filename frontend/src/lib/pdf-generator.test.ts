import { describe, it, expect } from "vitest";
import { generateDocumentPdf, pdfFilename } from "./pdf-generator";
import { getDocumentConfig } from "./document-registry";
import type { DocumentData } from "./document-chat-data";

const nda = getDocumentConfig("mutual-nda")!;

const ndaData: DocumentData = {
  partyA_companyName: "Acme Corp",
  partyA_address: "123 Main St, New York, NY 10001",
  partyA_representative: "John Smith",
  partyA_email: "john@acme.com",
  partyB_companyName: "Beta Inc",
  partyB_address: "456 Oak Ave, Los Angeles, CA 90001",
  partyB_representative: "Jane Doe",
  partyB_email: "jane@beta.com",
  effectiveDate: "2024-01-15",
  ndaTerm: "2 years",
  confidentialityTerm: "3 years",
  purpose: "Evaluating a potential business partnership opportunity",
  governingLaw: "California",
  jurisdiction: "federal or state courts in California",
};

describe("pdf-generator", () => {
  it("names the NDA download Mutual-NDA.pdf", () => {
    expect(pdfFilename(nda)).toBe("Mutual-NDA.pdf");
  });

  it("derives a filename from the document short name", () => {
    const dpa = getDocumentConfig("dpa")!;
    expect(pdfFilename(dpa)).toBe("DPA.pdf");
    const csa = getDocumentConfig("csa")!;
    expect(pdfFilename(csa)).toBe("Cloud-Service-Agreement.pdf");
  });

  it("generates a PDF without throwing", () => {
    expect(() =>
      generateDocumentPdf(nda, "Standard Terms body for the State of Governing Law.", ndaData),
    ).not.toThrow();
  });

  it("generates a PDF for a document with no body placeholders", () => {
    const sla = getDocumentConfig("sla")!;
    const slaData: DocumentData = Object.fromEntries(
      sla.fields.map((f) => [f.key, f.kind === "email" ? "x@y.com" : "value"]),
    );
    expect(() =>
      generateDocumentPdf(sla, "SLA standard terms body.", slaData),
    ).not.toThrow();
  });
});
