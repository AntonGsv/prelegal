import { NdaForm } from "../../../../components/nda-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Mutual NDA - Prelegal",
  description: "Generate a professional Mutual Non-Disclosure Agreement",
};

export default function CreateNdaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Prelegal</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Create Mutual NDA</h2>
          <p className="text-muted-foreground">
            Fill in the details below to generate your Mutual Non-Disclosure Agreement
          </p>
        </div>
        <NdaForm />
      </main>
    </div>
  );
}
