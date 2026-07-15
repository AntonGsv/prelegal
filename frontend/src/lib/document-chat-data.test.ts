import { describe, it, expect } from "vitest";
import { toCompleteDocumentData } from "./document-chat-data";
import { getDocumentConfig } from "./document-registry";

const nda = getDocumentConfig("mutual-nda")!;

const completeFields = {
  partyA_companyName: "Acme Inc",
  partyA_address: "1 Acme St, Springfield",
  partyA_representative: "Alice Adams",
  partyA_email: "alice@acme.com",
  partyB_companyName: "Beta LLC",
  partyB_address: "2 Beta Ave, Metropolis",
  partyB_representative: "Bob Brown",
  partyB_email: "bob@beta.com",
  effectiveDate: "2026-01-01",
  ndaTerm: "2 years",
  confidentialityTerm: "3 years",
  purpose: "Exploring a potential business partnership",
  governingLaw: "California",
  jurisdiction: "state and federal courts in California",
};

describe("toCompleteDocumentData", () => {
  it("returns null while fields are missing", () => {
    expect(toCompleteDocumentData(nda, {})).toBeNull();
    expect(
      toCompleteDocumentData(nda, { partyA_companyName: "Acme" }),
    ).toBeNull();
  });

  it("ignores null/blank values from the backend", () => {
    expect(
      toCompleteDocumentData(nda, {
        ...completeFields,
        partyA_address: null,
      }),
    ).toBeNull();
  });

  it("returns the typed data once every field is valid", () => {
    const result = toCompleteDocumentData(nda, completeFields);
    expect(result).not.toBeNull();
    expect(result?.partyA_companyName).toBe("Acme Inc");
  });

  it("trims whitespace-only values as missing", () => {
    expect(
      toCompleteDocumentData(nda, { ...completeFields, purpose: "   " }),
    ).toBeNull();
  });
});
