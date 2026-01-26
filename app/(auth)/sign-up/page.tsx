"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserPlus } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import GoogleOneTap from "@/components/ui/google-oneTap";
import { useRecaptcha } from "@/components/ui/use-recaptcha";

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (score <= 2) return { label: "Weak", color: "bg-red-500", score };
  if (score === 3 || score === 4)
    return { label: "Medium", color: "bg-yellow-500", score };
  return { label: "Strong", color: "bg-green-600", score };
}

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const strength = getPasswordStrength(form.password);

  const { getToken } = useRecaptcha();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const recaptchaToken = await getToken("signup");

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...form, recaptchaToken}),
      });

      const data = await res.json();

      if (res.status === 200 || res.status === 201) {
        router.push("/sign-in");
      } else if (res.status === 400 && data.error) {
        // Display specific error from backend
        setError(data.error);
      } else {
        setError("Sign up failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-6">
      <GoogleOneTap />
      <Card className="w-full max-w-md p-6 shadow-md border-zinc-200 dark:border-zinc-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Create an Account ✨
          </CardTitle>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
            Sign up to start generating quizzes with{" "}
            <span className="font-medium text-blue-600">QuizMint</span>
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">User Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                required
                className="border-zinc-300 dark:border-zinc-700"
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                value={form.username}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                className="border-zinc-300 dark:border-zinc-700"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                value={form.email}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  className="pr-10 border-zinc-300 dark:border-zinc-700"
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  value={form.password}
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

              {/* PASSWORD STRENGTH */}
              {form.password && (
                <div className="space-y-1">
                  <div className="h-2 w-full rounded bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className={`h-2 rounded transition-all ${strength.color}`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500">
                    Password strength:{" "}
                    <span className="font-medium">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>
            {/* Display backend error here */}
            {error && <p className="text-red-600 text-sm">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading || strength.score < 3}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Sign Up
            </Button>
          </form>

          <Separator className="my-6" />

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
