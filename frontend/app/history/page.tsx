import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { AppHeader } from "../../components/app-header";
import { DocumentHistory } from "../../components/document-history";
import { Button } from "../../components/ui/button";

export const metadata: Metadata = {
  title: "My documents - Prelegal",
  description: "Revisit and re-download the documents you've generated.",
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <AppHeader />
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-brand-navy dark:text-white">
              My documents
            </h2>
            <p className="text-muted-foreground">
              Revisit and re-download the documents you&apos;ve generated.
            </p>
          </div>
          <Link href="/dashboard">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New document
            </Button>
          </Link>
        </div>
        <DocumentHistory />
      </main>
    </div>
  );
}
