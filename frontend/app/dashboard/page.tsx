import type { Metadata } from "next";

import { AppHeader } from "../../components/app-header";
import { DocumentGallery } from "../../components/document-gallery";
import { DocumentFinder } from "../../components/document-finder";

export const metadata: Metadata = {
  title: "Dashboard - Prelegal",
  description: "Generate professional legal documents with an AI assistant.",
};

/**
 * Dashboard: the hub for choosing a document. Users can either pick one of the
 * supported document types from the gallery, or describe what they need and let
 * the AI route them (or suggest the closest supported document).
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <AppHeader />

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-brand-navy dark:text-white">
            Legal Documents Made Simple
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Choose a document below, or describe what you need and let our AI
            assistant guide you. No legal expertise required.
          </p>
        </div>

        <div className="mx-auto mb-12 max-w-3xl">
          <DocumentFinder />
        </div>

        <h3 className="mb-4 text-xl font-semibold text-brand-navy dark:text-white">
          Supported documents
        </h3>
        <DocumentGallery />

        <p className="mt-16 text-center text-xs text-muted-foreground">
          Based on CommonPaper templates (CC BY 4.0)
        </p>
      </main>
    </div>
  );
}
