import { describe, it, expect } from "vitest";
import { STANDARD_TERMS, formatDate } from "./nda-template";

describe("nda-template", () => {
  describe("STANDARD_TERMS", () => {
    it("should contain all 11 sections", () => {
      const sections = [
        "1. **Introduction**",
        "2. **Use and Protection",
        "3. **Exceptions**",
        "4. **Disclosures Required by Law**",
        "5. **Term and Termination**",
        "6. **Return or Destruction",
        "7. **Proprietary Rights**",
        "8. **Disclaimer**",
        "9. **Governing Law",
        "10. **Equitable Relief**",
        "11. **General**",
      ];

      for (const section of sections) {
        expect(STANDARD_TERMS).toContain(section);
      }
    });

    it("should contain CommonPaper attribution", () => {
      expect(STANDARD_TERMS).toContain("Common Paper");
      expect(STANDARD_TERMS).toContain("CC BY 4.0");
      expect(STANDARD_TERMS).toContain("https://commonpaper.com/standards/mutual-nda/1.0/");
    });

    it("should not be empty", () => {
      expect(STANDARD_TERMS.length).toBeGreaterThan(1000);
    });

    it("should contain placeholder text for dynamic values", () => {
      expect(STANDARD_TERMS).toContain("State of Governing Law");
      expect(STANDARD_TERMS).toContain("Jurisdiction");
      expect(STANDARD_TERMS).toContain("Effective Date");
      expect(STANDARD_TERMS).toContain("MNDA Term");
      expect(STANDARD_TERMS).toContain("Term of Confidentiality");
      expect(STANDARD_TERMS).toContain("Purpose");
    });
  });

  describe("formatDate", () => {
    it("should format a valid date string", () => {
      const result = formatDate("2024-01-15");
      expect(result).toBe("January 15, 2024");
    });

    it("should format another valid date", () => {
      const result = formatDate("2025-12-25");
      expect(result).toBe("December 25, 2025");
    });

    it("should return empty string for empty input", () => {
      expect(formatDate("")).toBe("");
    });

    it("should handle single digit day", () => {
      const result = formatDate("2024-03-05");
      expect(result).toBe("March 5, 2024");
    });
  });
});
