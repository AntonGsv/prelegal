import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AppHeader } from "../../../../components/app-header";
import { DocumentChat } from "../../../../components/document-chat";
import {
  documentRegistry,
  getDocumentConfig,
} from "../../../../src/lib/document-registry";
import { loadTemplateBody } from "../../../../src/lib/template-loader";

// Only the registry's slugs are valid; any other slug 404s without a runtime
// render. This keeps the pages fully static (the template body is read at build
// time) so the production runner never needs the source `.md` files.
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
    title: `Create ${config.name} - Prelegal`,
    description: config.description,
  };
}

export default async function CreateDocumentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getDocumentConfig(slug);
  if (!config) notFound();

  const templateBody = loadTemplateBody(config.catalogFilename);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Create {config.name}</h2>
          <p className="text-muted-foreground">
            Chat with our AI assistant to generate your {config.name}.
          </p>
        </div>
        <DocumentChat config={config} templateBody={templateBody} />
      </main>
    </div>
  );
}
