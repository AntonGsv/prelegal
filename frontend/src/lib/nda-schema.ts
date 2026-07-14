import { z } from "zod";

export const ndaFormSchema = z.object({
  // Party A
  partyA_companyName: z
    .string()
    .min(1, "Company name is required"),
  partyA_address: z
    .string()
    .min(1, "Address is required"),
  partyA_representative: z
    .string()
    .min(1, "Representative name is required"),
  partyA_email: z
    .string()
    .email("Valid email required"),

  // Party B
  partyB_companyName: z
    .string()
    .min(1, "Company name is required"),
  partyB_address: z
    .string()
    .min(1, "Address is required"),
  partyB_representative: z
    .string()
    .min(1, "Representative name is required"),
  partyB_email: z
    .string()
    .email("Valid email required"),

  // Terms
  effectiveDate: z
    .string()
    .min(1, "Effective date is required"),
  ndaTerm: z
    .string()
    .min(1, "MNDA term is required"),
  confidentialityTerm: z
    .string()
    .min(1, "Confidentiality term is required"),
  purpose: z
    .string()
    .min(10, "Purpose must be at least 10 characters"),

  // Legal
  governingLaw: z
    .string()
    .min(1, "Governing law state is required"),
  jurisdiction: z
    .string()
    .min(1, "Jurisdiction is required"),
});

export type NdaFormData = z.infer<typeof ndaFormSchema>;
