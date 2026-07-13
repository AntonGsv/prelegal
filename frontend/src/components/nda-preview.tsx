"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { NdaFormData } from "@/types/nda";

export function NdaPreview() {
  const { watch } = useFormContext<NdaFormData>();
  const formData = watch();

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Cover Page Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-muted-foreground">Effective Date</p>
          <p className="font-medium">{formatDate(formData.effectiveDate)}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Term</p>
          <p className="font-medium">{formData.ndaTerm || "Not set"}</p>
        </div>

        <div>
          <p className="text-muted-foreground">Confidentiality Term</p>
          <p className="font-medium">{formData.confidentialityTerm || "Not set"}</p>
        </div>

        <Separator />

        <div>
          <p className="text-muted-foreground font-semibold">Party A</p>
          <p className="font-medium">{formData.partyA_companyName || "Not set"}</p>
          <p className="text-muted-foreground">{formData.partyA_address || "Not set"}</p>
          <p className="text-muted-foreground">{formData.partyA_representative || "Not set"}</p>
          <p className="text-muted-foreground">{formData.partyA_email || "Not set"}</p>
        </div>

        <Separator />

        <div>
          <p className="text-muted-foreground font-semibold">Party B</p>
          <p className="font-medium">{formData.partyB_companyName || "Not set"}</p>
          <p className="text-muted-foreground">{formData.partyB_address || "Not set"}</p>
          <p className="text-muted-foreground">{formData.partyB_representative || "Not set"}</p>
          <p className="text-muted-foreground">{formData.partyB_email || "Not set"}</p>
        </div>

        <Separator />

        <div>
          <p className="text-muted-foreground">Purpose</p>
          <p className="font-medium line-clamp-3">
            {formData.purpose || "Not set"}
          </p>
        </div>

        <Separator />

        <div>
          <p className="text-muted-foreground font-semibold">Governing Law</p>
          <p className="font-medium">{formData.governingLaw || "Not set"}</p>
        </div>

        <div>
          <p className="text-muted-foreground font-semibold">Jurisdiction</p>
          <p className="font-medium">{formData.jurisdiction || "Not set"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
