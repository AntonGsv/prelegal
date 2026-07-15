import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";

import { AppHeader } from "../../../../components/app-header";
import { DocumentView } from "../../../../components/document-view";
import {
  documentRegistry,
  getDocumentConfig,
} from "../../../../src/lib/document-registry";
import { loadTemplateBody } from "../../../../src/lib/template-loader";

// One static page per slug (the template body is read at build time, matching
// the create route); the specific saved document is selected client-side via a
// `?id=` query param, so the runner never needs the source `.md` files.
export const dynamicParams = false;

export function generateStaticParams() {
  return documentRegistry.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = getDocumentConfig(slug);
  if (!config) return { title: "Document not found - Prelegal" };
  return {
    title: `${config.name} - Prelegal`,
    description: config.description,
  };
}

export default async function ViewDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getDocumentConfig(slug);
  if (!config) notFound();

  const templateBody = loadTemplateBody(config.catalogFilename);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <Suspense
          fallback={
            <p className="text-muted-foreground">Loading document...</p>
          }
        >
          <DocumentView config={config} templateBody={templateBody} />
        </Suspense>
      </main>
    </div>
  );
}
