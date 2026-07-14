import type { Metadata } from "next";

import { LoginForm } from "../../components/login-form";

export const metadata: Metadata = {
  title: "Sign in - Prelegal",
  description: "Sign in to continue to the Prelegal platform.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-12 dark:from-slate-900 dark:to-slate-800">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Prelegal</h1>
        <p className="text-sm text-muted-foreground">
          Legal documents made simple
        </p>
      </div>
      <LoginForm />
    </div>
  );
}