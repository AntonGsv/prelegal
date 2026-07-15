"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { loginUser, registerUser } from "../src/lib/api-client";
import { setSession } from "../src/lib/auth-storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

type AuthMode = "login" | "signup";

const MIN_PASSWORD_LENGTH = 8;

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z
  .object({
    displayName: z.string().optional(),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;

const COPY: Record<
  AuthMode,
  {
    title: string;
    description: string;
    submit: string;
    testid: string;
    altPrompt: string;
    altHref: string;
    altLabel: string;
  }
> = {
  login: {
    title: "Sign in",
    description: "Welcome back. Sign in to continue to Prelegal.",
    submit: "Sign in",
    testid: "login-submit",
    altPrompt: "New to Prelegal?",
    altHref: "/signup",
    altLabel: "Create an account",
  },
  signup: {
    title: "Create your account",
    description: "Start generating professional legal documents in minutes.",
    submit: "Create account",
    testid: "signup-submit",
    altPrompt: "Already have an account?",
    altHref: "/login",
    altLabel: "Sign in",
  },
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const copy = COPY[mode];
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The form always carries the full signup field set; in login mode the extra
  // fields are simply unused. The active schema is chosen by mode, cast to the
  // form's resolver type (a union of Zod schemas otherwise won't unify here).
  const resolver = zodResolver(
    mode === "signup" ? signupSchema : loginSchema,
  ) as unknown as Resolver<SignupData>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupData>({
    resolver,
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: LoginData | SignupData) => {
    setIsSubmitting(true);
    try {
      const auth =
        mode === "signup"
          ? await registerUser(
              data.email,
              data.password,
              (data as SignupData).displayName || undefined,
            )
          : await loginUser(data.email, data.password);

      setSession(auth.token, auth.user);
      toast.success(
        mode === "signup" ? "Account created — welcome!" : "Signed in",
      );
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl" role="heading" aria-level={2}>
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Name (optional)</Label>
              <Input
                id="displayName"
                type="text"
                autoComplete="name"
                placeholder="Jane Founder"
                {...register("displayName")}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            data-testid={copy.testid}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "signup" ? "Creating account..." : "Signing in..."}
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {copy.altPrompt}{" "}
          <Link
            href={copy.altHref}
            className="font-medium text-brand-blue hover:underline"
          >
            {copy.altLabel}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
