"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ndaFormSchema, type NdaFormData } from "../src/lib/nda-schema";
import { generateNdaPdf } from "../src/lib/pdf-generator";
import { NdaPreview } from "./nda-preview";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
];

export function NdaForm() {
  const [isGenerating, setIsGenerating] = useState(false);

  const methods = useForm<NdaFormData>({
    resolver: zodResolver(ndaFormSchema),
    defaultValues: {
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
    },
  });

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = methods;

  const onSubmit = async (data: NdaFormData) => {
    setIsGenerating(true);
    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 500));
      generateNdaPdf(data);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>Mutual NDA Details</CardTitle>
            <CardDescription>
              Fill in the details below to generate your Mutual Non-Disclosure Agreement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Effective Date & Terms */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Agreement Terms</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="effectiveDate">Effective Date *</Label>
                    <Input
                      id="effectiveDate"
                      type="date"
                      {...register("effectiveDate")}
                    />
                    {errors.effectiveDate && (
                      <p className="text-xs text-red-500">{errors.effectiveDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ndaTerm">MNDA Term *</Label>
                    <Input
                      id="ndaTerm"
                      placeholder="e.g., 2 years"
                      {...register("ndaTerm")}
                    />
                    {errors.ndaTerm && (
                      <p className="text-xs text-red-500">{errors.ndaTerm.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confidentialityTerm">Confidentiality Term *</Label>
                    <Input
                      id="confidentialityTerm"
                      placeholder="e.g., 3 years"
                      {...register("confidentialityTerm")}
                    />
                    {errors.confidentialityTerm && (
                      <p className="text-xs text-red-500">{errors.confidentialityTerm.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Party A */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Party A (Disclosing Party)</h3>
                <div className="space-y-2">
                  <Label htmlFor="partyA_companyName">Company Name *</Label>
                  <Input
                    id="partyA_companyName"
                    placeholder="Enter company name"
                    {...register("partyA_companyName")}
                  />
                  {errors.partyA_companyName && (
                    <p className="text-xs text-red-500">{errors.partyA_companyName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partyA_address">Address *</Label>
                  <Input
                    id="partyA_address"
                    placeholder="Enter full address"
                    {...register("partyA_address")}
                  />
                  {errors.partyA_address && (
                    <p className="text-xs text-red-500">{errors.partyA_address.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partyA_representative">Representative *</Label>
                  <Input
                    id="partyA_representative"
                    placeholder="Enter representative name"
                    {...register("partyA_representative")}
                  />
                  {errors.partyA_representative && (
                    <p className="text-xs text-red-500">{errors.partyA_representative.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partyA_email">Email *</Label>
                  <Input
                    id="partyA_email"
                    type="email"
                    placeholder="Enter email address"
                    {...register("partyA_email")}
                  />
                  {errors.partyA_email && (
                    <p className="text-xs text-red-500">{errors.partyA_email.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Party B */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Party B (Disclosing Party)</h3>
                <div className="space-y-2">
                  <Label htmlFor="partyB_companyName">Company Name *</Label>
                  <Input
                    id="partyB_companyName"
                    placeholder="Enter company name"
                    {...register("partyB_companyName")}
                  />
                  {errors.partyB_companyName && (
                    <p className="text-xs text-red-500">{errors.partyB_companyName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partyB_address">Address *</Label>
                  <Input
                    id="partyB_address"
                    placeholder="Enter full address"
                    {...register("partyB_address")}
                  />
                  {errors.partyB_address && (
                    <p className="text-xs text-red-500">{errors.partyB_address.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partyB_representative">Representative *</Label>
                  <Input
                    id="partyB_representative"
                    placeholder="Enter representative name"
                    {...register("partyB_representative")}
                  />
                  {errors.partyB_representative && (
                    <p className="text-xs text-red-500">{errors.partyB_representative.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partyB_email">Email *</Label>
                  <Input
                    id="partyB_email"
                    type="email"
                    placeholder="Enter email address"
                    {...register("partyB_email")}
                  />
                  {errors.partyB_email && (
                    <p className="text-xs text-red-500">{errors.partyB_email.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Purpose */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Purpose</h3>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Description *</Label>
                  <textarea
                    id="purpose"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe the purpose of sharing confidential information..."
                    {...register("purpose")}
                  />
                  {errors.purpose && (
                    <p className="text-xs text-red-500">{errors.purpose.message}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Legal */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Governing Law & Jurisdiction</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="governingLaw">Governing Law *</Label>
                    <select
                      id="governingLaw"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...register("governingLaw")}
                    >
                      <option value="">Select a state</option>
                      {US_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {errors.governingLaw && (
                      <p className="text-xs text-red-500">{errors.governingLaw.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jurisdiction">Jurisdiction *</Label>
                    <Input
                      id="jurisdiction"
                      placeholder="e.g., federal or state courts in California"
                      {...register("jurisdiction")}
                    />
                    {errors.jurisdiction && (
                      <p className="text-xs text-red-500">{errors.jurisdiction.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  "Generate & Download PDF"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview Section - Right Column */}
        <NdaPreview />
      </div>
    </FormProvider>
  );
}
