"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DocumentPreview } from "./document-preview";
import { Button } from "./ui/button";
import { getDocument, type SavedDocumentDetail } from "../src/lib/api-client";
import { generateDocumentPdf } from "../src/lib/pdf-generator";
import type { DocumentConfig } from "../src/lib/document-registry";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; document: SavedDocumentDetail };

/**
 * Read-only view of a previously generated document. The template body is baked
 * in at build time (server component, static per slug); the saved field values
 * are fetched client-side by the `?id=` query param, then rendered into the same
 * preview used during creation and offered as a fresh PDF download.
 */
export function DocumentView({
  config,
  templateBody,
}: {
  config: DocumentConfig;
  templateBody: string;
}) {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const id = Number(idParam);
    if (!idParam || Number.isNaN(id)) {
      setState({ status: "error", message: "This document link is invalid." });
      return;
    }

    let cancelled = false;
    getDocument(id)
      .then((document) => {
        if (cancelled) return;
        if (document.slug !== config.slug) {
          setState({
            status: "error",
            message: "This document link doesn't match its type.",
          });
          return;
        }
        setState({ status: "ready", document });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Could not load document.";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [idParam, config.slug]);

  if (state.status === "loading") {
    return (
      <div
        className="flex items-center gap-2 text-muted-foreground"
        data-testid="document-view-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading document...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-md border bg-card p-6" data-testid="document-view-error">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Link href="/history" className="mt-4 inline-block">
          <Button variant="outline">Back to my documents</Button>
        </Link>
      </div>
    );
  }

  const { document } = state;

  const handleDownload = () => {
    try {
      generateDocumentPdf(config, templateBody, document.fields);
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-brand-navy dark:text-white">
            {document.title}
          </h2>
          <p className="text-sm text-muted-foreground">{config.name}</p>
        </div>
        <Button onClick={handleDownload} data-testid="download-pdf">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div className="mx-auto max-w-3xl">
        <DocumentPreview
          config={config}
          fields={document.fields}
          templateBody={templateBody}
        />
      </div>
    </div>
  );
}
