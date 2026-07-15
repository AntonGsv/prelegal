"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  STANDARD_TERMS,
  STANDARD_TERMS_PLACEHOLDERS,
  formatDate,
} from "../src/lib/nda-template";
import type { PartialNdaData } from "../src/types/chat";

const BLANK = "________";

function value(raw?: string | null): string {
  return raw && raw.trim() !== "" ? raw : BLANK;
}

/**
 * Mirror the placeholder substitution done in `pdf-generator.ts` so the preview
 * matches the generated PDF, but only substitute fields that are known (keeping
 * the readable placeholder words visible until the user has provided a value).
 * Markdown bold markers are stripped for on-screen readability.
 */
function renderStandardTerms(fields: PartialNdaData): string {
  let text = STANDARD_TERMS;
  for (const [pattern, field] of STANDARD_TERMS_PLACEHOLDERS) {
    const raw = fields[field];
    if (raw && raw.trim() !== "") {
      text = text.replace(pattern, raw);
    }
  }
  return text.replace(/\*\*/g, "");
}

export function NdaDocumentPreview({ fields }: { fields: PartialNdaData }) {
  const effectiveDate = fields.effectiveDate
    ? formatDate(fields.effectiveDate)
    : BLANK;

  return (
    <Card className="sticky top-4" data-testid="nda-document-preview">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Live document preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[70vh] overflow-y-auto rounded-md border bg-white p-6 text-sm leading-relaxed text-slate-900 shadow-inner">
          <h1 className="mb-6 text-center text-base font-bold uppercase tracking-wide text-[#032147]">
            Mutual Non-Disclosure Agreement
          </h1>

          <dl className="space-y-1">
            <Row label="Effective Date" value={effectiveDate} />
            <Row label="Term" value={value(fields.ndaTerm)} />
            <Row label="Confidentiality Term" value={value(fields.confidentialityTerm)} />
          </dl>

          <Section title="Purpose">
            <p className="whitespace-pre-wrap">{value(fields.purpose)}</p>
          </Section>

          <Section title="Party A">
            <PartyBlock
              company={fields.partyA_companyName}
              address={fields.partyA_address}
              representative={fields.partyA_representative}
              email={fields.partyA_email}
            />
          </Section>

          <Section title="Party B">
            <PartyBlock
              company={fields.partyB_companyName}
              address={fields.partyB_address}
              representative={fields.partyB_representative}
              email={fields.partyB_email}
            />
          </Section>

          <Section title="Governing Law and Jurisdiction">
            <dl className="space-y-1">
              <Row label="Governing Law" value={value(fields.governingLaw)} />
              <Row label="Jurisdiction" value={value(fields.jurisdiction)} />
            </dl>
          </Section>

          <Section title="Signatures">
            <div className="space-y-6 pt-2">
              <SignatureLine label="Party A Representative" />
              <SignatureLine label="Party B Representative" />
            </div>
          </Section>

          <h2 className="mb-3 mt-8 border-t pt-6 text-center text-sm font-bold text-[#032147]">
            Standard Terms
          </h2>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
            {renderStandardTerms(fields)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="font-semibold text-slate-700">{label}:</dt>
      <dd className="text-slate-900">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="mb-1 font-bold text-[#032147]">{title}</h3>
      {children}
    </div>
  );
}

function PartyBlock({
  company,
  address,
  representative,
  email,
}: {
  company?: string | null;
  address?: string | null;
  representative?: string | null;
  email?: string | null;
}) {
  return (
    <dl className="space-y-1">
      <Row label="Company" value={value(company)} />
      <Row label="Address" value={value(address)} />
      <Row label="Representative" value={value(representative)} />
      <Row label="Email" value={value(email)} />
    </dl>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div>
      <div className="border-t border-slate-400" />
      <p className="mt-1 text-xs text-slate-600">{label}</p>
    </div>
  );
}
