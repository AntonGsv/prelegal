"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { formatDate, renderStandardTerms } from "../src/lib/document-template";
import {
  groupFields,
  partyFields,
  type FieldConfig,
} from "../src/lib/document-registry";
import type { DocumentConfig } from "../src/lib/document-registry";
import type { PartialDocumentData } from "../src/types/chat";

const BLANK = "________";

function value(raw?: string | null): string {
  return raw && raw.trim() !== "" ? raw : BLANK;
}

function fieldValue(field: FieldConfig, fields: PartialDocumentData): string {
  const raw = fields[field.key];
  if (field.kind === "date") {
    return raw && raw.trim() !== "" ? formatDate(raw) : BLANK;
  }
  return value(raw);
}

export function DocumentPreview({
  config,
  fields,
  templateBody,
}: {
  config: DocumentConfig;
  fields: PartialDocumentData;
  templateBody: string;
}) {
  const terms = groupFields(config, "terms");
  const legal = groupFields(config, "legal");

  return (
    <Card className="sticky top-4" data-testid="document-preview">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Live document preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[70vh] overflow-y-auto rounded-md border bg-white p-6 text-sm leading-relaxed text-slate-900 shadow-inner">
          <h1 className="mb-6 text-center text-base font-bold uppercase tracking-wide text-[#032147]">
            {config.name}
          </h1>

          {config.partyRoles.map((role) => (
            <Section key={role.key} title={role.label}>
              <dl className="space-y-1">
                {partyFields(config, role.key).map((field) => (
                  <Row
                    key={field.key}
                    label={field.label}
                    value={fieldValue(field, fields)}
                  />
                ))}
              </dl>
            </Section>
          ))}

          {terms.length > 0 && (
            <Section title="Key Terms">
              <dl className="space-y-2">
                {terms.map((field) =>
                  field.kind === "longtext" ? (
                    <div key={field.key}>
                      <dt className="font-semibold text-slate-700">
                        {field.label}:
                      </dt>
                      <dd className="whitespace-pre-wrap text-slate-900">
                        {fieldValue(field, fields)}
                      </dd>
                    </div>
                  ) : (
                    <Row
                      key={field.key}
                      label={field.label}
                      value={fieldValue(field, fields)}
                    />
                  ),
                )}
              </dl>
            </Section>
          )}

          {legal.length > 0 && (
            <Section title="Governing Law and Jurisdiction">
              <dl className="space-y-1">
                {legal.map((field) => (
                  <Row
                    key={field.key}
                    label={field.label}
                    value={fieldValue(field, fields)}
                  />
                ))}
              </dl>
            </Section>
          )}

          <Section title="Signatures">
            <div className="space-y-6 pt-2">
              {config.partyRoles.map((role) => (
                <SignatureLine
                  key={role.key}
                  label={`${role.label} Representative`}
                />
              ))}
            </div>
          </Section>

          <h2 className="mb-3 mt-8 border-t pt-6 text-center text-sm font-bold text-[#032147]">
            Standard Terms
          </h2>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
            {renderStandardTerms(config, templateBody, fields)}
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

function SignatureLine({ label }: { label: string }) {
  return (
    <div>
      <div className="border-t border-slate-400" />
      <p className="mt-1 text-xs text-slate-600">{label}</p>
    </div>
  );
}
