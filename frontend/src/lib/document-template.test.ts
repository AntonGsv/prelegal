import { describe, it, expect } from "vitest";
import {
  formatDate,
  renderStandardTerms,
  substitutePlaceholders,
} from "./document-template";
import { getDocumentConfig } from "./document-registry";

describe("formatDate", () => {
  it("formats a valid date string", () => {
    expect(formatDate("2024-01-15")).toBe("January 15, 2024");
  });

  it("handles single-digit day", () => {
    expect(formatDate("2024-03-05")).toBe("March 5, 2024");
  });

  it("returns empty string for empty input", () => {
    expect(formatDate("")).toBe("");
  });
});

describe("substitutePlaceholders", () => {
  const nda = getDocumentConfig("mutual-nda")!;

  it("replaces known placeholder phrases with values", () => {
    // The NDA's "State of Governing Law" phrase maps wholesale to the state
    // name (parity with the original NDA template behavior).
    const body = "Governed by the laws of the State of Governing Law.";
    const out = substitutePlaceholders(body, nda.bodyPlaceholders, {
      governingLaw: "California",
    });
    expect(out).toBe("Governed by the laws of the California.");
  });

  it("leaves phrases untouched when the value is missing", () => {
    const body = "Effective Date and Purpose remain.";
    const out = substitutePlaceholders(body, nda.bodyPlaceholders, {});
    expect(out).toBe("Effective Date and Purpose remain.");
  });

  it("returns the body unchanged when there are no placeholders", () => {
    const dpa = getDocumentConfig("dpa")!;
    const body = "This body has no substitutions.";
    expect(substitutePlaceholders(body, dpa.bodyPlaceholders, {})).toBe(body);
  });
});

describe("renderStandardTerms", () => {
  const nda = getDocumentConfig("mutual-nda")!;

  it("substitutes values and strips markdown bold markers", () => {
    const body = "The **State of Governing Law** applies. **Bold** text.";
    const out = renderStandardTerms(nda, body, { governingLaw: "California" });
    expect(out).toBe("The California applies. Bold text.");
  });
});
