"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import GoogleOneTap from "@/components/ui/google-oneTap";
import { useRecaptcha } from "@/components/ui/use-recaptcha";
import { resolveClientCallbackUrl } from "@/lib/app-url";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (score <= 2) return { label: "Weak", color: "bg-red-500", score };
  if (score === 3 || score === 4) return { label: "Medium", color: "bg-yellow-500", score };
  return { label: "Strong", color: "bg-green-600", score };
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
    } catch (err: any) {
      setError(err?.message || "Google sign up failed.");
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-6">
      <GoogleOneTap />
      <Card className="w-full max-w-md p-6 shadow-md border-zinc-200 dark:border-zinc-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Create an Account
          </CardTitle>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
            Sign up to start generating quizzes with{" "}
            <span className="font-medium text-blue-600">QuizMint</span>
          </p>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <Button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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

            <Separator className="my-3" />

            {!otpStep ? (
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
                    placeholder="********"
                    required
                    className="pr-10 border-zinc-300 dark:border-zinc-700"
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
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
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
                        className="h-11 w-11 p-0 text-center text-lg font-semibold"
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      />
                    ))}
                  </div>
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
            <Link href="/sign-in" className="text-blue-600 hover:underline dark:text-blue-400">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
