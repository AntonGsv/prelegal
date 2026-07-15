import { NdaChat } from "../../../../components/nda-chat";
import { AppHeader } from "../../../../components/app-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Mutual NDA - Prelegal",
  description: "Generate a professional Mutual Non-Disclosure Agreement",
};

export default function CreateNdaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Create Mutual NDA</h2>
          <p className="text-muted-foreground">
            Chat with our AI assistant to generate your Mutual Non-Disclosure Agreement
          </p>
        </div>
        <NdaChat />
      </main>
    </div>
  );
}
