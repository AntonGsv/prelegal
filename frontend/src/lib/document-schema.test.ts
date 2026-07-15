import { describe, it, expect } from "vitest";
import { buildDocumentSchema } from "./document-schema";
import { getDocumentConfig } from "./document-registry";

const nda = getDocumentConfig("mutual-nda")!;

const validNda: Record<string, string> = {
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

describe("buildDocumentSchema", () => {
  it("passes with all required fields present and valid", () => {
    expect(buildDocumentSchema(nda).safeParse(validNda).success).toBe(true);
  });

  it("fails when a required text field is empty", () => {
    const result = buildDocumentSchema(nda).safeParse({
      ...validNda,
      partyA_companyName: "",
    });
    expect(result.success).toBe(false);
  });

  it("fails when an email field is invalid", () => {
    const result = buildDocumentSchema(nda).safeParse({
      ...validNda,
      partyA_email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("enforces minLength on longtext fields (purpose >= 10)", () => {
    expect(
      buildDocumentSchema(nda).safeParse({ ...validNda, purpose: "short" }).success,
    ).toBe(false);
    expect(
      buildDocumentSchema(nda).safeParse({ ...validNda, purpose: "0123456789" })
        .success,
    ).toBe(true);
  });

  it("builds a working schema for a different document type", () => {
    const sla = getDocumentConfig("sla")!;
    const schema = buildDocumentSchema(sla);
    // Missing SLA-specific fields -> incomplete.
    expect(schema.safeParse({ partyA_companyName: "Acme" }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });
});
