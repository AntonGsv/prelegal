import { describe, it, expect } from "vitest";
import { toCompleteNdaData } from "./nda-chat-data";
import type { PartialNdaData } from "../types/chat";

const complete: PartialNdaData = {
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
  jurisdiction: "state and federal courts in San Francisco County, California",
};

describe("toCompleteNdaData", () => {
  it("returns null when fields are still missing", () => {
    expect(toCompleteNdaData({ partyA_companyName: "Acme" })).toBeNull();
  });

  it("returns fully-typed data when every field is present and valid", () => {
    const result = toCompleteNdaData(complete);
    expect(result).not.toBeNull();
    expect(result?.partyA_companyName).toBe("Acme Inc");
    expect(result?.governingLaw).toBe("California");
  });

  it("treats null and whitespace-only values as missing", () => {
    expect(toCompleteNdaData({ ...complete, partyB_email: null })).toBeNull();
    expect(toCompleteNdaData({ ...complete, purpose: "   " })).toBeNull();
  });

  it("returns null for an invalid email", () => {
    expect(
      toCompleteNdaData({ ...complete, partyA_email: "not-an-email" }),
    ).toBeNull();
  });

  it("returns null when the purpose is too short", () => {
    expect(toCompleteNdaData({ ...complete, purpose: "short" })).toBeNull();
  });
});
