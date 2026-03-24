"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PopoutCard } from "@/components/ui/popout-card";
import SkeletonLoading from "@/components/ui/skeleton-loading";
import Tour from "@/components/ui/tour";
import {
  CheckCircle,
  XCircle,
  CreditCard,
  Sparkles,
  PieChart,
  Settings2,
  Zap,
} from "lucide-react";

type UserSubscription = {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  subscriptionEnd: string | null | undefined;
  stripeCustomerId: string | null;
  aiDifficulty?: "easy" | "medium" | "hard";
  adaptiveLearning?: boolean;
  liteMode?: boolean;
};

import { useRouter } from "next/navigation";
export default function Account() {
  const [user, setUser] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNoticeOpen, setSaveNoticeOpen] = useState(false);

  const [difficulty, setDifficulty] =
    useState<UserSubscription["aiDifficulty"]>("medium");
  const [adaptiveLearning, setAdaptiveLearning] = useState<boolean>(false);
  const [liteMode, setLiteMode] = useState<boolean>(false);

  const router = useRouter();

  const fetchAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load account");
      setUser(data.user);
      setDifficulty(data.user?.aiDifficulty ?? "medium");
      setAdaptiveLearning(Boolean(data.user?.adaptiveLearning ?? false));
      setLiteMode(Boolean(data.user?.liteMode ?? false));
    } catch (err: any) {
      setError(err.message || "Failed to load account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  const isPro = user?.subscriptionPlan === "pro";
  const isPremium = user?.subscriptionPlan === "premium";
  const isActive = user?.subscriptionStatus === "active";

  const saveSettings = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty, adaptiveLearning, liteMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      applyLiteMode(liteMode);
      await fetchAccount();
      setSaveNoticeOpen(true);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const manageBilling = () => {
    window.location.href = "/subscription";
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="rounded-3xl border border-indigo-200/60 bg-linear-to-r from-slate-950 via-indigo-900 to-cyan-800 p-6 shadow-[0_20px_55px_-20px_rgba(30,64,175,0.65)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <SkeletonLoading className="h-10 w-44 bg-white/20 dark:bg-white/15" />
              <SkeletonLoading className="h-5 w-72 bg-white/15 dark:bg-white/10" />
            </div>
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <SkeletonLoading className="h-4 w-16 bg-white/15 dark:bg-white/10" />
                <SkeletonLoading className="h-7 w-24 bg-white/20 dark:bg-white/15" />
              </div>
              <SkeletonLoading className="h-14 w-14 rounded-full bg-white/20 dark:bg-white/15" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-[0_20px_40px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-4">
              <SkeletonLoading className="h-7 w-32" />
              <SkeletonLoading className="h-5 w-48" />
              <SkeletonLoading className="h-5 w-24" />
              <SkeletonLoading className="h-11 w-full rounded-xl" />
              <SkeletonLoading className="h-16 w-full rounded-xl" />
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-indigo-200/70 bg-white/90 p-6 shadow-[0_18px_42px_-22px_rgba(99,102,241,0.45)] dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <SkeletonLoading className="h-7 w-40" />
                  <SkeletonLoading className="h-4 w-64" />
                </div>
                <SkeletonLoading className="h-8 w-20 rounded-full" />
              </div>
              <SkeletonLoading className="h-24 w-full rounded-xl" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SkeletonLoading className="h-14 rounded-xl" />
                <SkeletonLoading className="h-14 rounded-xl" />
                <SkeletonLoading className="h-14 rounded-xl" />
              </div>
              <div className="flex gap-3">
                <SkeletonLoading className="h-11 w-44 rounded-xl" />
                <SkeletonLoading className="h-11 w-28 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SkeletonLoading className="h-20 rounded-xl" />
                <SkeletonLoading className="h-20 rounded-xl" />
                <SkeletonLoading className="h-20 rounded-xl" />
                <SkeletonLoading className="h-20 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
     <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-transparent">
      <PopoutCard
        open={saveNoticeOpen}
        onClose={() => setSaveNoticeOpen(false)}
        variant="success"
        title="Preferences Saved"
        message="Your account settings were updated successfully."
      />
      <Tour
        tourId="account"
        steps={[
          {
            element: "#account-header",
            popover: {
              title: "Account overview",
              description:
                "See your subscription status and manage your billing here.",
            },
          },
          {
            element: "#account-plan",
            popover: {
              title: "Plan details",
              description:
                "Review your current plan, expiration, and upgrade options.",
            },
          },
          {
            element: "#account-billing",
            popover: {
              title: "Manage billing",
              description: "Open billing to update or manage your subscription.",
            },
          },
          {
            element: "#account-preferences",
            popover: {
              title: "AI preferences",
              description:
                "Customize difficulty and adaptive learning settings.",
            },
          },
          {
            element: "#account-save",
            popover: {
              title: "Save preferences",
              description: "Apply your AI preference changes.",
            },
          },
          {
            element: "#account-lite-mode",
            popover: {
              title: "Lite mode",
              description:
                "Turn on low-bandwidth mode to reduce visual overhead for weaker internet or devices.",
            },
          },
        ]}
      />
      {/* Header */}
      <div
        id="account-header"
        className="relative overflow-hidden rounded-3xl border border-indigo-200/60 bg-linear-to-r from-slate-950 via-indigo-900 to-cyan-800 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10 shadow-[0_20px_55px_-20px_rgba(30,64,175,0.65)]"
      >
        <div className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white wrap-break-word">
            Account
          </h1>
          <p className="text-blue-100 mt-1 wrap-break-word">
            Manage your subscription, billing, and AI preferences.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <div className="text-sm text-blue-100">Status</div>
            <div className="flex items-center gap-2 flex-wrap">
              {isActive ? (
                <Badge className="bg-green-600 text-white px-3 py-1">
                  Active
                </Badge>
              ) : (
                <Badge className="bg-white/20 text-white border border-white/30 px-3 py-1">
                  Inactive
                </Badge>
              )}
            </div>
          </div>

          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 18 }}
            className="rounded-full p-1 bg-linear-to-br from-sky-400 to-violet-500 shadow-md"
          >
            <div className="h-12 w-12 rounded-full bg-white/95 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-violet-600" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plan Card */}
        <motion.div
          id="account-plan"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.28 }}
          className={`relative rounded-2xl p-6 border min-w-0 ${
            isPremium
              ? "border-purple-600/30 shadow-[0_20px_40px_rgba(124,58,237,0.12)] bg-linear-to-br from-white to-purple-50/50 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
              : isPro
              ? "border-emerald-600/30 shadow-[0_20px_40px_rgba(16,185,129,0.12)] bg-linear-to-br from-white to-emerald-50/40 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
              : "border-zinc-200 bg-linear-to-br from-white to-slate-50/70 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0 flex-wrap">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold wrap-break-word">
                  {user?.subscriptionPlan
                    ? user.subscriptionPlan.toUpperCase()
                    : "FREE"}
                </h3>
                {isPremium && (
                  <Badge className="bg-purple-600 text-white px-2 py-1">
                    Premium
                  </Badge>
                )}
                {isPro && !isPremium && (
                  <Badge className="bg-emerald-600 text-white px-2 py-1">
                    Pro
                  </Badge>
                )}
              </div>

              <p className="mt-2 text-sm text-zinc-500 wrap-break-word">
                {isPremium
                  ? "All features unlocked — best for teams & heavy users."
                  : isPro
                  ? "Great for power users and educators."
                  : "Try Pro or Premium for advanced features."}
              </p>

              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <div className="text-xs text-zinc-500">Expires</div>
                <div className="text-sm font-medium">
                  {user?.subscriptionEnd
                    ? new Date(user.subscriptionEnd).toLocaleDateString()
                    : "N/A"}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 min-w-0">
              <div className="text-sm text-zinc-400 mr-0 sm:mr-2">Billing</div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  id="account-billing"
                  onClick={manageBilling}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Manage Billing
                </Button>
              </div>

              <div className="mt-2 text-right text-sm flex items-center gap-2">
                {isActive ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" /> Active
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-500">
                    <XCircle className="w-4 h-4" /> Not Active
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CTA & Cancel */}
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => router.push("/subscription")}
                className="flex-1 bg-linear-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white"
                disabled={isActive}
              >
                {isActive ? "Subscribed" : "Upgrade / Subscribe"}
              </Button>

              <Button
                variant="ghost"
                onClick={() => router.push("/support")}
                className="px-4"
              >
                Support
              </Button>
            </div>

            <div className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300">
              Plan changes are managed in Billing. Use <span className="font-medium">Manage Billing</span> to update or change your subscription.
            </div>
          </div>
        </motion.div>

        {/* Settings Panel */}
        <motion.form
          id="account-preferences"
          onSubmit={saveSettings}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="lg:col-span-2 rounded-2xl p-6 border bg-linear-to-br from-white to-indigo-50/40 border-indigo-200/70 backdrop-blur-xl shadow-[0_18px_42px_-22px_rgba(99,102,241,0.45)] min-w-0 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold wrap-break-word">
                AI Preferences
              </h2>
              <p className="text-sm text-zinc-500 mt-1 wrap-break-word">
                Personalize quiz difficulty and adaptive learning.
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-sm text-zinc-500">Adaptive</div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={adaptiveLearning}
                  onChange={(e) => setAdaptiveLearning(e.target.checked)}
                  disabled={!isPremium}
                />
                <div className="w-14 h-8 bg-zinc-200 peer-checked:bg-violet-600 rounded-full peer-focus:ring-2 peer-focus:ring-violet-300 transition-colors"></div>
                <span className="absolute left-1 top-1 w-6 h-6 rounded-full bg-white shadow transform peer-checked:translate-x-6 transition-transform" />
              </label>
            </div>
          </div>

          <div
            id="account-lite-mode"
            className="mt-4 rounded-lg border border-indigo-200/80 bg-linear-to-r from-indigo-50 to-cyan-50 px-4 py-3 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  Lite Mode (All Plans)
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Reduces animations and also uses lighter AI generation paths (lower tokens and less retrieval) for low-bandwidth or low-performance environments.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={liteMode}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setLiteMode(next);
                    applyLiteMode(next);
                  }}
                />
                <div className="w-14 h-8 bg-zinc-200 peer-checked:bg-sky-600 rounded-full peer-focus:ring-2 peer-focus:ring-sky-300 transition-colors"></div>
                <span className="absolute left-1 top-1 w-6 h-6 rounded-full bg-white shadow transform peer-checked:translate-x-6 transition-transform" />
              </label>
            </div>
          </div>

          {/* Rest of form remains the same */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 min-w-0">
              <label className="block text-sm font-medium text-zinc-700 wrap-break-word">
                Difficulty
              </label>
              <div className="mt-2 flex gap-2 flex-wrap">
                {["easy", "medium", "hard"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level as any)}
                    className={`flex-1 py-2 rounded-lg border min-w-0 ${
                      difficulty === level
                        ? "bg-sky-600 text-white border-transparent"
                        : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                    disabled={!isPro && !isPremium}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
              {!isPro && !isPremium && (
                <p className="text-xs text-zinc-500 mt-2 wrap-break-word">
                  AI difficulty control is available for Pro & Premium plans.
                </p>
              )}
            </div>

            <div className="flex flex-col justify-center min-w-0">
              <div className="text-sm text-zinc-600 mb-2 wrap-break-word">
                Your Plan Perks
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 wrap-break-word">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <div className="text-sm">
                    {isPremium
                      ? "All perks enabled"
                      : isPro
                      ? "Most perks enabled"
                      : "Limited access"}
                  </div>
                </div>

                <div className="flex items-center gap-2 wrap-break-word">
                  <PieChart className="w-4 h-4 text-sky-500" />
                  <div className="text-sm">
                    Advanced analytics {isPremium ? "✓" : "•"}
                  </div>
                </div>

                <div className="flex items-center gap-2 wrap-break-word">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div className="text-sm">
                    Priority generation {isPremium ? "✓" : "•"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 flex-wrap">
            <Button
              id="account-save"
              type="submit"
              className="bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
              disabled={saving}
            >
              {saving ? (
                <PopoutCard open={true} title="Saving" message="Saving..." onClose={() => {}} />
              ) : null}
              {saving ? "Saving..." : "Save Preferences"}
            </Button>

            <Button variant="outline" onClick={fetchAccount}>
              Refresh
            </Button>

            {/* <Button
              variant="ghost"
              onClick={() => alert("Exporting settings...")}
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Export
            </Button> */}
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FeatureRow
              icon={<Sparkles className="w-5 h-5 text-violet-500" />}
              title="Export (PDF / CSV / GForms)"
              enabled={isPremium}
            />
            <FeatureRow
              icon={<PieChart className="w-5 h-5 text-sky-500" />}
              title="Advanced Analytics"
              enabled={isPremium}
              onClick={
                isPremium
                  ? () => (window.location.href = "/analytics")
                  : undefined
              }
            />

            <FeatureRow
              icon={<Zap className="w-5 h-5 text-amber-500" />}
              title="Priority Generation"
              enabled={isPremium || isPro}
            />
            <FeatureRow
              icon={<CheckCircle className="w-5 h-5 text-green-500" />}
              title="Adaptive Learning"
              enabled={isPremium}
            />
          </div>
        </motion.form>
      </div>

      <section className="mt-10 rounded-2xl border border-sky-200/70 bg-linear-to-br from-sky-50 to-indigo-50/50 p-5 shadow-[0_14px_30px_-22px_rgba(14,116,144,0.45)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-sky-600" />
          <h2 className="text-xl font-semibold">Teacher Toolkit</h2>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">
          Recommended workflow for educators: plan lessons, generate quizzes, and track learning results in one place.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 p-4 bg-white/90 shadow-[0_8px_18px_-14px_rgba(2,132,199,0.5)] dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-medium mb-2">1) Build Lesson Plans</h3>
            <p className="text-sm text-zinc-500 mb-3">
              Create structured, classroom-ready lesson plans with export options for docs, PDF, and slides.
            </p>
            <Button size="sm" variant="outline" onClick={() => router.push("/lessonPlan")}>
              Open Lesson Plan Generator
            </Button>
          </div>

          <div className="rounded-xl border border-zinc-200 p-4 bg-white/90 shadow-[0_8px_18px_-14px_rgba(79,70,229,0.45)] dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-medium mb-2">2) Generate Assessments</h3>
            <p className="text-sm text-zinc-500 mb-3">
              Produce quiz items quickly by topic, file upload, or source links for formative and summative checks.
            </p>
            <Button size="sm" variant="outline" onClick={() => router.push("/generate-quiz")}>
              Open Quiz Generator
            </Button>
          </div>

        </div>
      </section>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  enabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  enabled: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`p-4 rounded-lg border flex items-center justify-between min-w-0 cursor-${
        enabled && onClick ? "pointer" : "default"
      } bg-linear-to-r from-white to-slate-50 border-zinc-200 shadow-[0_8px_18px_-14px_rgba(71,85,105,0.35)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800`}
      onClick={enabled && onClick ? onClick : undefined}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-md bg-white shadow-sm border border-zinc-200 dark:bg-slate-900 dark:border-slate-700">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium wrap-break-word">{title}</div>
          <div className="text-xs text-zinc-500 wrap-break-word">
            {enabled
              ? onClick
                ? "Click to view"
                : "Enabled"
              : "Upgrade for this"}
          </div>
        </div>
      </div>

      <div>
        {enabled ? (
          <Badge className="bg-green-600 text-white">On</Badge>
        ) : (
          <Badge className="bg-zinc-200 text-zinc-700">
            Locked
          </Badge>
        )}
      </div>
    </div>
  );
}
  const applyLiteMode = (enabled: boolean) => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-lite-mode", enabled ? "true" : "false");
    localStorage.setItem("quizmint_lite_mode", enabled ? "1" : "0");
  };
