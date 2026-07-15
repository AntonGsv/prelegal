import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "../../components/auth-form";

export const metadata: Metadata = {
  title: "Create your account - Prelegal",
  description: "Create a Prelegal account to generate legal documents.",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12 dark:from-slate-950 dark:to-slate-900">
      <Link href="/" className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">
          Prelegal
        </h1>
        <p className="text-sm text-muted-foreground">
          Legal documents made simple
        </p>
      </Link>
      <AuthForm mode="signup" />
    </div>
  );
}
