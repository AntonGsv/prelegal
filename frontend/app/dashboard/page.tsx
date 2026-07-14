import Link from "next/link";
import type { Metadata } from "next";

import { AppHeader } from "../../components/app-header";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard - Prelegal",
  description: "Generate professional Mutual Non-Disclosure Agreements.",
};

/**
 * Dashboard page. PL-4 keeps the product surface unchanged — this view
 * simply exposes the same content as the original landing page inside
 * the signed-in shell so the new entry point (`/login` → `/dashboard`)
 * feels like a real platform.
 */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <AppHeader />

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">
            Legal Documents Made Simple
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Generate professional Mutual Non-Disclosure Agreements in minutes.
            No legal expertise required.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fill in Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enter the party information, dates, and legal terms through our simple form interface.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview Document</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                See your NDA in real-time as you fill out the form. No surprises.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Download PDF</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get a professionally formatted PDF ready for signatures.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link href="/nda/mutual/create">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
        </div>

        <p className="mt-16 text-center text-xs text-muted-foreground">
          Based on CommonPaper Mutual NDA template (CC BY 4.0)
        </p>
      </main>
    </div>
  );
}