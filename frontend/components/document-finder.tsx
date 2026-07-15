"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { detectDocumentType } from "../src/lib/api-client";
import { getDocumentConfig } from "../src/lib/document-registry";

interface Suggestion {
  reply: string;
  suggestedSlug: string | null;
}

/**
 * Freeform entry point: the user describes the document they need, and the AI
 * either routes them to the matching document's chat, or explains we can't
 * generate that exact document and offers the closest supported one.
 */
export function DocumentFinder() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const detect = async () => {
    const content = input.trim();
    if (!content || isDetecting) return;
    setIsDetecting(true);
    setSuggestion(null);

    try {
      const result = await detectDocumentType([{ role: "user", content }]);
      if (result.matchedSlug && getDocumentConfig(result.matchedSlug)) {
        router.push(`/documents/${result.matchedSlug}/create`);
        return;
      }
      setSuggestion({ reply: result.reply, suggestedSlug: result.suggestedSlug });
    } catch (error) {
      console.error("Document detection failed:", error);
      toast.error(
        "Couldn't reach the assistant. Please try again or pick a document below.",
      );
    } finally {
      setIsDetecting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void detect();
    }
  };

  const suggested = suggestion?.suggestedSlug
    ? getDocumentConfig(suggestion.suggestedSlug)
    : undefined;

  return (
    <Card className="border-[#209dd7]/30 bg-[#209dd7]/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-[#032147]">
          <Sparkles className="h-5 w-5 text-[#ecad0a]" />
          Not sure which document you need?
        </CardTitle>
        <CardDescription>
          Describe what you&apos;re trying to do, and we&apos;ll point you to the
          right document — or the closest one we can generate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <textarea
            className="flex max-h-32 min-h-[44px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. I need to protect confidential info before a partnership talk"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            aria-label="Describe the document you need"
            data-testid="finder-input"
          />
          <Button
            onClick={() => void detect()}
            disabled={isDetecting || input.trim() === ""}
            className="bg-[#209dd7] text-white hover:bg-[#209dd7]/90"
            data-testid="finder-submit"
          >
            {isDetecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Find it"
            )}
          </Button>
        </div>

        {suggestion && (
          <div
            className="rounded-md border bg-white p-3 text-sm"
            data-testid="finder-suggestion"
          >
            <p className="whitespace-pre-wrap text-slate-700">{suggestion.reply}</p>
            {suggested && (
              <Link href={`/documents/${suggested.slug}/create`}>
                <Button
                  variant="outline"
                  className="mt-3"
                  data-testid="finder-suggested-link"
                >
                  Create {suggested.name} instead
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
