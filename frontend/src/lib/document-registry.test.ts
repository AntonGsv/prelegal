import { describe, it, expect } from "vitest";
import {
  documentRegistry,
  getDocumentConfig,
  groupFields,
  partyFields,
} from "./document-registry";

describe("document-registry", () => {
  it("loads all 11 supported documents", () => {
    expect(documentRegistry).toHaveLength(11);
    expect(getDocumentConfig("mutual-nda")).toBeDefined();
    expect(getDocumentConfig("dpa")).toBeDefined();
  });

  it("returns undefined for an unknown slug", () => {
    expect(getDocumentConfig("not-real")).toBeUndefined();
  });

  it("every document has two party roles and the shared core fields", () => {
    for (const doc of documentRegistry) {
      expect(doc.partyRoles).toHaveLength(2);
      const keys = new Set(doc.fields.map((f) => f.key));
      for (const core of [
        "partyA_companyName",
        "partyB_companyName",
        "effectiveDate",
        "governingLaw",
        "jurisdiction",
      ]) {
        expect(keys.has(core)).toBe(true);
      }
    }
  });

  it("partyFields and groupFields select by group", () => {
    const nda = getDocumentConfig("mutual-nda")!;
    expect(partyFields(nda, "partyA").map((f) => f.key)).toEqual([
      "partyA_companyName",
      "partyA_address",
      "partyA_representative",
      "partyA_email",
    ]);
    expect(groupFields(nda, "legal").map((f) => f.key)).toEqual([
      "governingLaw",
      "jurisdiction",
    ]);
  });

  it("only the NDA declares body placeholders", () => {
    const withPlaceholders = documentRegistry.filter(
      (d) => d.bodyPlaceholders.length > 0,
    );
    expect(withPlaceholders.map((d) => d.slug)).toEqual(["mutual-nda"]);
  });
});
