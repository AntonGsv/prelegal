"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Download, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { DocumentPreview } from "./document-preview";
import { MessageBubble, ThinkingBubble } from "./chat-bubbles";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { saveDocument, sendDocumentChat } from "../src/lib/api-client";
import { isLoggedIn } from "../src/lib/auth-storage";
import { toCompleteDocumentData } from "../src/lib/document-chat-data";
import { generateDocumentPdf } from "../src/lib/pdf-generator";
import type { DocumentConfig } from "../src/lib/document-registry";
import type { ChatMessage, PartialDocumentData } from "../src/types/chat";

function buildGreeting(config: DocumentConfig): ChatMessage {
  const [roleA, roleB] = config.partyRoles;
  return {
    role: "assistant",
    content:
      `Hi! I'll help you put together a ${config.shortName}. To get started, ` +
      `who are the two parties involved (the ${roleA.label} and the ${roleB.label})?`,
  };
}

export function DocumentChat({
  config,
  templateBody,
}: {
  config: DocumentConfig;
  templateBody: string;
}) {
  const greeting = useMemo(() => buildGreeting(config), [config]);
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [fields, setFields] = useState<PartialDocumentData>({});
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const completeData = toCompleteDocumentData(config, fields);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isSending]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await sendDocumentChat(config.slug, nextMessages);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
      setFields(response.fields);
    } catch (error) {
      console.error("Chat request failed:", error);
      toast.error("The assistant is unavailable right now. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleGenerate = async () => {
    if (!completeData) return;
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      generateDocumentPdf(config, templateBody, completeData);
      toast.success("PDF downloaded successfully!");
      // Persist to the user's history so they can revisit/re-download it later.
      // A save failure must never block the download the user just got, so it is
      // handled separately and surfaced only as a soft warning.
      void persistToHistory(completeData);
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const persistToHistory = async (data: Record<string, string>) => {
    if (!isLoggedIn()) return;
    try {
      await saveDocument(config.slug, data);
      toast.success("Saved to your documents");
    } catch (error) {
      console.error("Saving document to history failed:", error);
      toast.warning("Downloaded, but couldn't save to your documents.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
      {/* Chat Section */}
      <Card className="flex h-[75vh] flex-col">
        <CardHeader>
          <CardTitle>{config.shortName} Assistant</CardTitle>
          <CardDescription>
            Chat with the assistant to fill in your {config.name}. The document
            preview updates as you go.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto pr-1"
            data-testid="chat-messages"
          >
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            {isSending && <ThinkingBubble />}
          </div>

          {completeData ? (
            <div className="rounded-md border border-brand-purple/30 bg-brand-purple/5 p-3">
              <p className="mb-2 text-sm font-medium">
                All details collected — ready to generate your document.
              </p>
              <Button
                className="w-full bg-brand-purple text-white hover:bg-brand-purple/90"
                onClick={handleGenerate}
                disabled={isGenerating}
                data-testid="generate-pdf"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate & Download PDF
                  </>
                )}
              </Button>
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <textarea
              className="flex max-h-32 min-h-[44px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Type your answer..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              aria-label="Message"
              data-testid="chat-input"
            />
            <Button
              size="icon"
              onClick={() => void sendMessage()}
              disabled={isSending || input.trim() === ""}
              aria-label="Send message"
              data-testid="chat-send"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Document Preview */}
      <DocumentPreview
        config={config}
        fields={fields}
        templateBody={templateBody}
      />
    </div>
  );
}
