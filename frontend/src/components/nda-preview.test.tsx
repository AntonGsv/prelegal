import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { NdaPreview } from "./nda-preview";
import type { NdaFormData } from "@/types/nda";
import React from "react";

const defaultValues: NdaFormData = {
  partyA_companyName: "",
  partyA_address: "",
  partyA_representative: "",
  partyA_email: "",
  partyB_companyName: "",
  partyB_address: "",
  partyB_representative: "",
  partyB_email: "",
  effectiveDate: "",
  ndaTerm: "",
  confidentialityTerm: "",
  purpose: "",
  governingLaw: "",
  jurisdiction: "",
};

function TestWrapper({ defaultValues }: { defaultValues: NdaFormData }) {
  const methods = useForm<NdaFormData>({ defaultValues });
  return (
    <FormProvider {...methods}>
      <NdaPreview />
    </FormProvider>
  );
}

describe("NdaPreview", () => {
  it("should render without crashing", () => {
    render(<TestWrapper defaultValues={defaultValues} />);
    expect(screen.getByText("Cover Page Preview")).toBeInTheDocument();
  });

  it("should show Not set for empty fields", () => {
    render(<TestWrapper defaultValues={defaultValues} />);
    // Use getAllByText since multiple fields can show "Not set"
    const notSetElements = screen.getAllByText("Not set");
    expect(notSetElements.length).toBeGreaterThan(0);
  });

  it("should display Party A section", () => {
    render(<TestWrapper defaultValues={defaultValues} />);
    expect(screen.getByText("Party A")).toBeInTheDocument();
  });

  it("should display Party B section", () => {
    render(<TestWrapper defaultValues={defaultValues} />);
    expect(screen.getByText("Party B")).toBeInTheDocument();
  });

  it("should display effective date label", () => {
    render(<TestWrapper defaultValues={defaultValues} />);
    expect(screen.getByText("Effective Date")).toBeInTheDocument();
  });

  it("should display governing law section", () => {
    render(<TestWrapper defaultValues={defaultValues} />);
    expect(screen.getByText("Governing Law")).toBeInTheDocument();
  });

  it("should display jurisdiction section", () => {
    render(<TestWrapper defaultValues={defaultValues} />);
    expect(screen.getByText("Jurisdiction")).toBeInTheDocument();
  });
});
