"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, Plus } from "lucide-react";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { listDocuments, type SavedDocumentSummary } from "../src/lib/api-client";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; documents: SavedDocumentSummary[] };

function formatCreatedAt(value: string | null): string {
  if (!value) return "";
  // Stored as a UTC "YYYY-MM-DD HH:MM:SS" timestamp; treat it as UTC.
  const date = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Lists the signed-in user's previously generated documents. */
export function DocumentHistory() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    listDocuments()
      .then((documents) => {
        if (!cancelled) setState({ status: "ready", documents });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Could not load documents.";
        setState({ status: "error", message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div
        className="flex items-center gap-2 text-muted-foreground"
        data-testid="history-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your documents...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p className="text-sm text-muted-foreground" data-testid="history-error">
        {state.message}
      </p>
    );
  }

  if (state.documents.length === 0) {
    return (
      <Card className="text-center" data-testid="history-empty">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
            <FileText className="h-6 w-6" />
          </div>
          <p className="font-medium">No documents yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Documents you generate will appear here so you can revisit and
            re-download them anytime.
          </p>
          <Link href="/dashboard">
            <Button className="mt-2">
              <Plus className="mr-2 h-4 w-4" />
              Create your first document
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="history-list"
    >
      {state.documents.map((doc) => (
        <Link
          key={doc.id}
          href={`/documents/${doc.slug}/view?id=${doc.id}`}
          data-testid={`history-item-${doc.id}`}
          className="group"
        >
          <Card className="h-full transition group-hover:ring-brand-blue group-hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-base text-brand-navy dark:text-white">
                {doc.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm text-muted-foreground">{doc.name}</p>
              {doc.createdAt && (
                <p className="text-xs text-muted-foreground">
                  {formatCreatedAt(doc.createdAt)}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
