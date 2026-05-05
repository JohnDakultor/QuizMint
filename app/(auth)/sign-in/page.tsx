"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { resolveClientCallbackUrl } from "@/lib/app-url";

import GoogleOneTap from "@/components/ui/google-oneTap";
import { useRecaptcha } from "@/components/ui/use-recaptcha";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.6 5.8 2.7 14.2l7.8 6.1C12.3 13.7 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12.6c-.5 3-2.3 5.6-5.1 7.3l7.8 6.1c4.6-4.3 7.2-10.6 7.2-17.1z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.3c-.6-1.7-.9-3.5-.9-5.3s.3-3.6.9-5.3l-7.8-6.1C1 14.9 0 19.4 0 23s1 8.1 2.7 11.4l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.2 0 11.6-2 15.4-5.5l-7.8-6.1c-2.2 1.5-5 2.4-7.6 2.4-6.3 0-11.7-4.2-13.6-9.9l-7.8 6.1C6.6 42.2 14.6 48 24 48z"
      />
    </svg>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function SignInContent() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = resolveClientCallbackUrl(
    searchParams.get("callbackUrl") || "/home"
  );
  const { getToken } = useRecaptcha();

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Google sign in failed"));
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!accepted) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = await getToken("signin");
      const res = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
        recaptchaToken,
      });

      if (!res?.ok) {
        setError(res?.error || "Invalid email or password");
        return;
      }

      const session = await getSession();
      if (!session?.user?.id) {
        throw new Error("Unable to retrieve user session");
      }

      const userId = session.user.id;
      await Promise.all([
        fetch("/api/policyAcceptance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, policyType: "terms" }),
        }),
        fetch("/api/policyAcceptance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, policyType: "privacy" }),
        }),
      ]);

      router.push(callbackUrl);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <GoogleOneTap />
      <section className="hidden lg:block">
        <p className="text-sm font-semibold uppercase text-teal-700 dark:text-teal-300">
          Teacher workflow access
        </p>
        <h1 className="mt-3 max-w-xl text-5xl font-bold leading-tight">
          Pick up where your class workflow left off.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600 dark:text-zinc-300">
          Sign in to continue planning lessons, generating quizzes, assigning
          work, reviewing results, and preparing the next reteach step.
        </p>

        <div className="mt-8 grid max-w-xl gap-3">
          {[
            {
              icon: BookOpenCheck,
              title: "Lesson and quiz workspace",
              body: "Keep drafts, exports, and reusable classroom assets in one place.",
            },
            {
              icon: BarChart3,
              title: "Results-aware follow-up",
              body: "Use student performance to plan what needs reteaching next.",
            },
            {
              icon: RefreshCw,
              title: "Reusable classroom flow",
              body: "Move from plan to assignment to review without rebuilding context.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Card className="w-full rounded-lg border-slate-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <CardHeader className="px-0 text-left">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
            <LogIn className="h-5 w-5" />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-950 dark:text-zinc-50">
            Welcome back
          </CardTitle>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            Sign in to your QuizMintAI teacher workspace.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <Button
            type="button"
            className="h-11 w-full border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <span className="mr-2">
              <GoogleMark />
            </span>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 py-1">
            <Separator className="flex-1" />
            <span className="text-xs font-medium uppercase text-slate-400">
              or use email
            </span>
            <Separator className="flex-1" />
          </div>
          <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="h-11 border-slate-300 dark:border-zinc-700"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    required
                    className="h-11 border-slate-300 pr-10 dark:border-zinc-700"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-teal-700"
                />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" className="font-medium text-teal-800 underline dark:text-teal-300">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="font-medium text-teal-800 underline dark:text-teal-300">
                    Privacy Policy
                  </Link>
                </span>
              </div>

              <Button type="submit" className="h-11 w-full bg-teal-700 text-white hover:bg-teal-800" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                Sign In
              </Button>
            </form>

          <Separator className="my-2" />

          <div className="grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-zinc-950 dark:text-zinc-400">
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-300" />
              Protected by recaptcha and account policy checks.
            </p>
          </div>

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Don't have an account?{" "}
            <Link href="/sign-up" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
              Create one
              <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-slate-50 dark:bg-zinc-950" />}>
      <SignInContent />
    </Suspense>
  );
}
