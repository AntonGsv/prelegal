import { Bot, Loader2, User } from "lucide-react";

import type { ChatMessage } from "../src/types/chat";

/** A single chat message bubble, used by the document chat. */
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      data-testid={`message-${message.role}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-brand-blue text-white" : "bg-brand-navy text-white"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
          isUser ? "bg-brand-blue text-white" : "bg-muted text-foreground"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

/** The "assistant is thinking" placeholder bubble. */
export function ThinkingBubble() {
  return (
    <div className="flex gap-2" data-testid="thinking">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-white">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Thinking...
      </div>
    </div>
  );
}
