"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, LogIn } from "lucide-react";
import { signIn, getSession } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { useRecaptcha } from "@/components/ui/use-recaptcha";

function SignInContent() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/home";

  const { getToken } = useRecaptcha();

  // ✅ Credentials Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const recaptchaToken = await getToken("signin");

    if (!accepted) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
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

      // Accept policies automatically
      const session = await getSession();
      if (!session?.user?.id)
        throw new Error("Unable to retrieve user session");
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
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Google Sign In (button)
  // Google Button SignIn
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    if (!accepted) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      setLoading(false);
      return;
    }

    try {
      // ✅ Use NextAuth's built-in Google redirect
      await signIn("google", {
        callbackUrl, // After login, redirect here
      });
    } catch (err: any) {
      console.error("Google button error:", err);
      setError(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-6">
      <Card className="w-full max-w-md p-6 shadow-md border-zinc-200 dark:border-zinc-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Welcome Back 👋
          </CardTitle>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
            Sign in to continue to{" "}
            <span className="font-medium text-blue-600">QuizMint</span>
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-5">
            {error && <p className="text-red-600 text-sm">{error}</p>}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  className="pr-10 border-zinc-300 dark:border-zinc-700"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
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

            {/* Terms & Privacy */}
            <div className="flex items-start space-x-2 text-sm">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 accent-blue-600"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="text-blue-600 underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-blue-600 underline">
                  Privacy Policy
                </Link>
              </span>
            </div>

            {/* Sign in button */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Sign In
            </Button>
          </form>

          <Separator className="my-6" />

          {/* Google Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
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
            Continue with Google
          </Button>

          <Separator className="my-6" />

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Don’t have an account?{" "}
            <Link href="/sign-up" className="text-blue-600 hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-900" />}>
      <SignInContent />
    </Suspense>
  );
}
