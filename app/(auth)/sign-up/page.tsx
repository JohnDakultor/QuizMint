"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  KeyRound,
  Layers3,
  Loader2,
  UserPlus,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import GoogleOneTap from "@/components/ui/google-oneTap";
import { useRecaptcha } from "@/components/ui/use-recaptcha";
import { resolveClientCallbackUrl } from "@/lib/app-url";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (score <= 2) return { label: "Weak", color: "bg-red-500", score };
  if (score === 3 || score === 4) return { label: "Medium", color: "bg-amber-500", score };
  return { label: "Strong", color: "bg-teal-700", score };
}

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpTargetEmail, setOtpTargetEmail] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const router = useRouter();
  const strength = getPasswordStrength(form.password);
  const { getToken } = useRecaptcha();

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: resolveClientCallbackUrl("/home") });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Google sign up failed."));
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const recaptchaToken = await getToken("signup");

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "requestOtp", ...form, recaptchaToken }),
      });
      const data = await res.json();

      if (res.ok && data?.requiresOtp) {
        setOtpStep(true);
        setOtpTargetEmail(form.email);
      } else if (res.status === 400 && data.error) {
        setError(data.error);
      } else {
        setError("Sign up failed. Please try again.");
      }
    } catch {
      setError("Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verifyOtp",
          email: otpTargetEmail,
          otp: otpCode,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.verified) {
        router.push("/sign-in");
        return;
      }
      setError(data?.error || "OTP verification failed.");
    } catch {
      setError("OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const otpDigits = Array.from({ length: 6 }, (_, i) => otpCode[i] || "");

  const handleOtpDigitChange = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const next = otpDigits.slice();
    next[index] = digit;
    const nextCode = next.join("");
    setOtpCode(nextCode);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    setOtpCode(pasted);
    const focusIndex = Math.min(pasted.length, 6) - 1;
    if (focusIndex >= 0) otpInputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <GoogleOneTap />
      <section className="hidden lg:block">
        <p className="text-sm font-semibold uppercase text-teal-700 dark:text-teal-300">
          Start the teacher workspace
        </p>
        <h1 className="mt-3 max-w-xl text-5xl font-bold leading-tight">
          Create, assign, review, and follow up from one account.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600 dark:text-zinc-300">
          Create a free QuizMintAI account to turn lesson ideas into classroom
          materials and keep the work connected to student progress.
        </p>

        <div className="mt-8 grid max-w-xl gap-3">
          {[
            {
              icon: BookOpenCheck,
              title: "Generate teaching materials",
              body: "Build quizzes, lesson plans, activities, and export-ready assets.",
            },
            {
              icon: ClipboardList,
              title: "Assign class work",
              body: "Keep student attempts and teacher-side review tied to the original task.",
            },
            {
              icon: Layers3,
              title: "Reuse the workflow",
              body: "Save useful outputs and carry context into the next lesson or follow-up.",
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
            {otpStep ? <KeyRound className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          </div>
          <CardTitle className="text-3xl font-bold text-slate-950 dark:text-zinc-50">
            {otpStep ? "Check your email" : "Create your account"}
          </CardTitle>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400">
            {otpStep
              ? "Enter the verification code to finish creating your workspace."
              : "Start with 100 free quiz points and a workspace built for teaching."}
          </p>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <Button
              type="button"
              className="h-11 w-full border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" className="mr-2">
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

            <div className="flex items-center gap-3 py-1">
              <Separator className="flex-1" />
              <span className="text-xs font-medium uppercase text-slate-400">
                or use email
              </span>
              <Separator className="flex-1" />
            </div>

            {!otpStep ? (
              <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Teacher name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Aisha Khan"
                  required
                  className="h-11 border-slate-300 dark:border-zinc-700"
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  value={form.username}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="h-11 border-slate-300 dark:border-zinc-700"
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
                    placeholder="********"
                    required
                    className="h-11 border-slate-300 pr-10 dark:border-zinc-700"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
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

                {form.password && (
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className={`h-2 rounded transition-all ${strength.color}`}
                        style={{ width: `${(strength.score / 5) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500">
                      Password strength: <span className="font-medium">{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-teal-700 text-white hover:bg-teal-800"
                disabled={loading || strength.score < 3}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Send Verification Code
              </Button>
              <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-zinc-950 dark:text-zinc-400">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
                  Your account starts in the signed-in workspace, where work can
                  be saved, assigned, exported, and reviewed.
                </p>
              </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
                  Enter the 6-digit code sent to <strong>{otpTargetEmail}</strong>.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <div
                    className="flex items-center justify-center gap-2"
                    onPaste={handleOtpPaste}
                  >
                    {otpDigits.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => {
                          otpInputRefs.current[index] = el;
                        }}
                        id={index === 0 ? "otp" : undefined}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        required
                        className="h-11 w-11 border-slate-300 p-0 text-center text-lg font-semibold focus-visible:ring-teal-700 dark:border-zinc-700"
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      />
                    ))}
                  </div>
                </div>
                {error && (
                  <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-11 w-full bg-teal-700 text-white hover:bg-teal-800"
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Verify and Create Account
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setOtpStep(false);
                    setOtpCode("");
                    setError("");
                  }}
                  disabled={loading}
                >
                  Back
                </Button>
              </form>
            )}
          </div>

          <Separator className="my-6" />

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
              Sign In
              <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
