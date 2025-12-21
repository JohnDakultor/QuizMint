"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
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
};

import { useRouter } from "next/navigation";
export default function Account() {
  const [user, setUser] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [difficulty, setDifficulty] =
    useState<UserSubscription["aiDifficulty"]>("medium");
  const [adaptiveLearning, setAdaptiveLearning] = useState<boolean>(false);

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

  const cancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;
    setCanceling(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "POST" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to cancel subscription");
      await fetchAccount();
      alert("Subscription canceled successfully");
    } catch (err: any) {
      setError(err.message || "Failed to cancel subscription");
    } finally {
      setCanceling(false);
    }
  };

  const saveSettings = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/update-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty, adaptiveLearning }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      await fetchAccount();
      alert("Settings updated");
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-sky-500" />
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 wrap-break-word">
            Account
          </h1>
          <p className="text-zinc-500 mt-1 wrap-break-word">
            Manage your subscription, billing, and AI preferences.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <div className="text-sm text-zinc-500">Status</div>
            <div className="flex items-center gap-2 flex-wrap">
              {isActive ? (
                <Badge className="bg-green-600 text-white px-3 py-1">
                  Active
                </Badge>
              ) : (
                <Badge className="bg-gray-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 px-3 py-1">
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
            <div className="h-12 w-12 rounded-full bg-white/95 dark:bg-zinc-900/90 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-violet-600" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plan Card */}
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.28 }}
          className={`relative rounded-2xl p-6 border min-w-0 ${
            isPremium
              ? "border-purple-600/30 shadow-[0_20px_40px_rgba(124,58,237,0.08)] bg-linear-to-br from-white/60 to-purple-50/20 dark:from-zinc-900/60 dark:to-zinc-900/40"
              : isPro
              ? "border-green-600/30 shadow-[0_20px_40px_rgba(34,197,94,0.06)]"
              : "border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60"
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
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white"
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

            {isActive && (
              <Button
                onClick={cancelSubscription}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                disabled={canceling}
              >
                {canceling ? "Canceling..." : "Cancel Subscription"}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Settings Panel */}
        <motion.form
          onSubmit={saveSettings}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="lg:col-span-2 rounded-2xl p-6 border bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 backdrop-blur-xl shadow min-w-0"
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

          {/* Rest of form remains the same */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 min-w-0">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 wrap-break-word">
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
                        : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
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
              type="submit"
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
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
      } bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800`}
      onClick={enabled && onClick ? onClick : undefined}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-md bg-white/80 dark:bg-zinc-800/80 shadow-sm">
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
          <Badge className="bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
            Locked
          </Badge>
        )}
      </div>
    </div>
  );
}
