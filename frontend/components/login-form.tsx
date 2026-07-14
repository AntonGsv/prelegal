"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { signIn } from "../src/lib/auth-storage";
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

/**
 * The fake login is purely cosmetic for PL-4 (per ticket: "no authentication,
 * just bring the user into the platform"). We validate the form so the
 * button is grounded, persist a `localStorage` flag via `signIn()`, and
 * route the user to `/dashboard`. No fetch to the backend.
 */
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = methods;

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      // Cosmetic only — see module docstring. A tiny delay keeps the loading
      // state perceptible without being a network round-trip.
      await new Promise((resolve) => setTimeout(resolve, 250));
      signIn();
      toast.success(`Welcome, ${data.email}`);
      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Could not sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl" role="heading" aria-level={2}>Sign in</CardTitle>
        <CardDescription>
          Enter your email to continue to the Prelegal dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...methods}>
          <form
            className="space-y-4"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
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
                <p className="text-xs text-red-500" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-testid="login-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}