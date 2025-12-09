"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";

export default function SignIn() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (res?.ok) {
      router.push("/user-home");
    } else {
      setError(res?.error || "Invalid email or password");
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
            Sign in to continue to <span className="font-medium text-blue-600">QuizMint</span>
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-5">
            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                className="border-zinc-300 dark:border-zinc-700"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                className="border-zinc-300 dark:border-zinc-700"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link
                href="/forgot-password"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Forgot password?
              </Link>
            </div>

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

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Don’t have an account?{" "}
            <Link
              href="/sign-up"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
