import Link from "next/link";
import type { Metadata } from "next";
import { FileText, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { listDocuments } from "../src/lib/document-registry";

export const metadata: Metadata = {
  title: "Prelegal - AI-Powered Legal Documents",
  description:
    "Generate professional legal agreements through a guided AI chat. From NDAs to service agreements, drafted in minutes.",
};

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Guided AI chat",
    body: "Answer a few questions in plain language. Our assistant asks for exactly what each agreement needs — no legal jargon required.",
  },
  {
    icon: FileText,
    title: "Live document preview",
    body: "Watch your document fill in as you chat, then download a polished PDF the moment every detail is in place.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted templates",
    body: "Built on CommonPaper's openly licensed legal templates, covering the agreements startups reach for most.",
  },
];

/**
 * Public marketing landing page. Signed-out visitors start here; the header
 * links to sign in / get started, and the CTA routes into the account flow.
 */
export default function Home() {
  const documentCount = listDocuments().length;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-white/70 backdrop-blur-sm dark:bg-slate-950/70">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold text-brand-navy dark:text-white">
            Prelegal
          </span>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button data-testid="cta-get-started">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center sm:py-28">
          <div className="mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/5 px-3 py-1 text-sm font-medium text-brand-blue">
              <Sparkles className="h-4 w-4 text-brand-yellow" />
              AI-powered legal drafting
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-brand-navy sm:text-6xl dark:text-white">
              Legal documents, drafted by conversation
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Describe what you need and let our AI assistant guide you through
              it. Generate professional agreements — from NDAs to service
              contracts — in minutes, not billable hours.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="px-6" data-testid="hero-get-started">
                  Get started free
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="px-6">
                  Sign in
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {documentCount} agreement types supported and growing.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="h-full">
                <CardContent className="pt-2">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-brand-navy dark:text-white">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>Based on CommonPaper templates (CC BY 4.0).</p>
          <p className="mt-1">
            Prelegal generates drafts for informational purposes only — not legal
            advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
