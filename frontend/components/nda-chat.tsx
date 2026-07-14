"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Bot, Download, Loader2, Send, User } from "lucide-react";
import { toast } from "sonner";

import { NdaDocumentPreview } from "./nda-document-preview";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { sendNdaChat } from "../src/lib/api-client";
import { toCompleteNdaData } from "../src/lib/nda-chat-data";
import { generateNdaPdf } from "../src/lib/pdf-generator";
import type { ChatMessage, PartialNdaData } from "../src/types/chat";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you put together a Mutual NDA. To get started, what are " +
    "the names of the two companies entering into this agreement?",
};

export function NdaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [fields, setFields] = useState<PartialNdaData>({});
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const completeData = toCompleteNdaData(fields);

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
      const response = await sendNdaChat(nextMessages);
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
      generateNdaPdf(completeData);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
      {/* Chat Section */}
      <Card className="flex h-[75vh] flex-col">
        <CardHeader>
          <CardTitle>NDA Assistant</CardTitle>
          <CardDescription>
            Chat with the assistant to fill in your Mutual Non-Disclosure
            Agreement. The document preview updates as you go.
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
            <div className="rounded-md border border-[#753991]/30 bg-[#753991]/5 p-3">
              <p className="mb-2 text-sm font-medium">
                All details collected — ready to generate your NDA.
              </p>
              <Button
                className="w-full bg-[#753991] text-white hover:bg-[#753991]/90"
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
      <NdaDocumentPreview fields={fields} />
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      data-testid={`message-${message.role}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-[#209dd7] text-white" : "bg-[#032147] text-white"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-[#209dd7] text-white"
            : "bg-muted text-foreground"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-2" data-testid="thinking">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#032147] text-white">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Thinking...
      </div>
    </div>
  );
}
