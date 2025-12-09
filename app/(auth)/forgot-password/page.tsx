"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send reset email");
      }

      setSuccess("Password reset email sent successfully! Please check your inbox.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-6">
      <Card className="w-full max-w-md p-6 shadow-md border-zinc-200 dark:border-zinc-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Forgot Password 🔒
          </CardTitle>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
            Enter your email address and we will send you a password reset link.
          </p>
        </CardHeader>

        <CardContent>
          {success && (
            <Alert variant="default" className="mb-4">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 relative">
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                className="border-zinc-300 dark:border-zinc-700 pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="absolute left-3 top-[38px] h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/sign-in" className="text-blue-600 hover:underline dark:text-blue-400">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
