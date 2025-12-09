"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Key } from "lucide-react";
import Link from "next/link";

interface Props {
  token: string;
}

export default function ResetPasswordClient({ token }: Props) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "validating" | "invalid" | "submitting" | "success" | "error"
  >("validating");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await fetch(`/api/validate-token?token=${token}`);
        const data = await res.json();
        if (data.valid) {
          setStatus("idle");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setStatus("submitting");

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setTimeout(() => router.push("/sign-in"), 3000);
      } else {
        setStatus("error");
        setError(data.error || "Failed to reset password.");
      }
    } catch {
      setStatus("error");
      setError("Failed to reset password.");
    }
  };

  // Loading / validating
  if (status === "validating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-6">
        <p className="text-zinc-900 dark:text-zinc-50 text-center text-lg">
          Validating reset link...
        </p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-6">
        <p className="text-red-600 dark:text-red-400 text-center text-lg">
          Invalid or expired reset link.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-6">
      <Card className="w-full max-w-md p-6 shadow-md border-zinc-200 dark:border-zinc-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Reset Password 🔑
          </CardTitle>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
            Enter your new password below.
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {status === "success" && (
            <Alert variant="default" className="mb-4">
              <AlertDescription>Password reset successfully! Redirecting to Sign In...</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 relative">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                New Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                className="border-zinc-300 dark:border-zinc-700 pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Key className="absolute left-3 top-[38px] h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            </div>

            <div className="space-y-2 relative">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                className="border-zinc-300 dark:border-zinc-700 pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Key className="absolute left-3 top-[38px] h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={status === "submitting" || status === "success"}
            >
              {status === "submitting" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reset Password
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
