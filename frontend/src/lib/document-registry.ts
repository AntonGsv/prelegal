import registryJson from "./document-registry.json";

/**
 * The document registry is the single source of truth for the fields, chat
 * framing, and party roles of every supported legal document. This file is a
 * byte-identical copy of `backend/src/prelegal_api/document_registry.json`; a
 * backend guard test keeps the two in sync.
 */

export type FieldKind = "text" | "email" | "date" | "longtext";

export type FieldGroup = "party:partyA" | "party:partyB" | "terms" | "legal";

export interface FieldConfig {
  key: string;
  label: string;
  group: string;
  kind: FieldKind;
  required: boolean;
  minLength?: number;
  promptHint: string;
}

export interface PartyRole {
  key: string;
  label: string;
}

export interface BodyPlaceholder {
  pattern: string;
  field: string;
}

export interface DocumentConfig {
  slug: string;
  catalogFilename: string;
  name: string;
  shortName: string;
  description: string;
  systemPromptIntro: string;
  partyRoles: PartyRole[];
  fields: FieldConfig[];
  bodyPlaceholders: BodyPlaceholder[];
}

export const documentRegistry = registryJson as DocumentConfig[];

export function listDocuments(): DocumentConfig[] {
  return documentRegistry;
}

export function getDocumentConfig(slug: string): DocumentConfig | undefined {
  return documentRegistry.find((doc) => doc.slug === slug);
}

/** Fields belonging to a party role, e.g. the four Party A fields. */
export function partyFields(config: DocumentConfig, roleKey: string): FieldConfig[] {
  return config.fields.filter((f) => f.group === `party:${roleKey}`);
}

/** Fields in a non-party group ("terms" or "legal"). */
export function groupFields(config: DocumentConfig, group: string): FieldConfig[] {
  return config.fields.filter((f) => f.group === group);
}
