import { describe, it, expect } from "vitest";
import { ndaFormSchema, type NdaFormData } from "./nda-schema";

describe("ndaFormSchema", () => {
  const validData: NdaFormData = {
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

  describe("valid data", () => {
    it("should pass validation with all required fields", () => {
      const result = ndaFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("partyA fields", () => {
    it("should fail when partyA_companyName is empty", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        partyA_companyName: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("partyA_companyName");
      }
    });

    it("should fail when partyA_email is invalid", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        partyA_email: "not-an-email",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("partyA_email");
      }
    });

    it("should fail when partyA_address is empty", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        partyA_address: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("partyB fields", () => {
    it("should fail when partyB_companyName is empty", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        partyB_companyName: "",
      });
      expect(result.success).toBe(false);
    });

    it("should fail when partyB_email is invalid", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        partyB_email: "invalid-email",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("terms fields", () => {
    it("should fail when effectiveDate is empty", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        effectiveDate: "",
      });
      expect(result.success).toBe(false);
    });

    it("should fail when ndaTerm is empty", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        ndaTerm: "",
      });
      expect(result.success).toBe(false);
    });

    it("should fail when confidentialityTerm is empty", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        confidentialityTerm: "",
      });
      expect(result.success).toBe(false);
    });

    it("should fail when purpose is less than 10 characters", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        purpose: "short",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("legal fields", () => {
    it("should fail when governingLaw is empty", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        governingLaw: "",
      });
      expect(result.success).toBe(false);
    });

    it("should fail when jurisdiction is empty", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        jurisdiction: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept valid email formats", () => {
      const emails = ["test@example.com", "user.name@company.org", "admin@sub.domain.co.uk"];
      for (const email of emails) {
        const result = ndaFormSchema.safeParse({
          ...validData,
          partyA_email: email,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should accept purpose with exactly 10 characters", () => {
      const result = ndaFormSchema.safeParse({
        ...validData,
        purpose: "0123456789", // exactly 10 characters
      });
      expect(result.success).toBe(true);
    });
  });
});
