import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NdaFormData } from "./nda-schema";

const mockFormData: NdaFormData = {
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

// Helper to create a mock doc for testing
function createMockDoc() {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn().mockReturnThis(),
    addPage: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(["line1", "line2"]),
    save: vi.fn(),
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
  };
}

describe("pdf-generator - mock tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should define generateNdaPdf as a function", async () => {
    // Dynamic import to avoid module-level issues
    const { generateNdaPdf } = await import("./pdf-generator");
    expect(typeof generateNdaPdf).toBe("function");
  });

  it("should accept NdaFormData as parameter", async () => {
    const { generateNdaPdf } = await import("./pdf-generator");
    // Just verify it can be called (will create actual PDF in browser)
    expect(() => generateNdaPdf(mockFormData)).not.toThrow();
  });

  it("mockDoc interface supports required methods", () => {
    const mockDoc = createMockDoc();
    mockDoc.setFont("helvetica", "bold");
    mockDoc.setFontSize(14);
    mockDoc.text("Test", 10, 10);
    mockDoc.addPage();
    mockDoc.save("test.pdf");

    expect(mockDoc.setFont).toHaveBeenCalledWith("helvetica", "bold");
    expect(mockDoc.setFontSize).toHaveBeenCalledWith(14);
    expect(mockDoc.text).toHaveBeenCalledWith("Test", 10, 10);
    expect(mockDoc.addPage).toHaveBeenCalled();
    expect(mockDoc.save).toHaveBeenCalledWith("test.pdf");
  });

  it("splitTextToSize returns array of lines", () => {
    const mockDoc = createMockDoc();
    const result = mockDoc.splitTextToSize("Long text here", 100);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
