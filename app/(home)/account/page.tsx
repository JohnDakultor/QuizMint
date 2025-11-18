"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { hasFeature } from "@/lib/features";

interface UserSubscription {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  subscriptionEnd: string | null;
  stripeCustomerId: string | null;
}

export default function Account() {
  const [user, setUser] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [adaptiveLearning, setAdaptiveLearning] = useState(false);


 const plan = user?.subscriptionPlan ?? null;

const aiDifficultyEnabled = hasFeature(plan, "ai_difficulty");
const adaptiveEnabled = hasFeature(plan, "adaptive_learning");
const exportGF = hasFeature(plan, "export_google_forms");
const exportPDF = hasFeature(plan, "export_pdf");
const exportCSV = hasFeature(plan, "export_csv");
const analyticsEnabled = hasFeature(plan, "advanced_analytics");





  // Fetch account info
  const fetchAccount = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch account");
      setUser(data.user);
      // Optional: Load saved settings
      if (data.user.subscriptionPlan === "pro" || data.user.subscriptionPlan === "premium") {
        setDifficulty(data.user.aiDifficulty || "medium");
        setAdaptiveLearning(data.user.adaptiveLearning || false);
      }else{
        setDifficulty("easy");
        setAdaptiveLearning(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load account info");
    } finally {
      setLoading(false);
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;

    setCanceling(true);
    try {
      const res = await fetch("/api/account", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel subscription");
      alert("Subscription canceled successfully");
      fetchAccount();
    } catch (err: any) {
      alert(err.message || "Failed to cancel subscription");
    } finally {
      setCanceling(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );

  if (error)
    return (
      <div className="max-w-md mx-auto mt-20">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );

  if (!user)
    return (
      <div className="max-w-md mx-auto mt-20 text-center text-gray-600">
        No account information found. Please log in.
      </div>
    );

  // Features based on subscription plan
  const isPro = user.subscriptionPlan === "pro";
  const isPremium = user.subscriptionPlan === "premium";

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
      <h1 className="text-3xl font-bold mb-6 text-center text-zinc-900 dark:text-zinc-50">
        Account Settings
      </h1>

      {/* Subscription Info */}
      <div className="space-y-3 mb-6">
        <p>
          <strong>Plan:</strong>{" "}
          {user.subscriptionPlan ? (
            <Badge
              className={`px-3 py-1 rounded-full ${
                isPro
                  ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                  : isPremium
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
              }`}
            >
              {user.subscriptionPlan.charAt(0).toUpperCase() +
                user.subscriptionPlan.slice(1)}
            </Badge>
          ) : (
            "None"
          )}
        </p>

        <p>
          <strong>Status:</strong>{" "}
          {user.subscriptionStatus ? (
            <Badge
              className={`px-3 py-1 rounded-full ${
                user.subscriptionStatus === "active"
                  ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                  : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
              }`}
            >
              {user.subscriptionStatus.charAt(0).toUpperCase() +
                user.subscriptionStatus.slice(1)}
            </Badge>
          ) : (
            "None"
          )}
        </p>

        <p>
          <strong>Expires:</strong>{" "}
          {user.subscriptionEnd
            ? new Date(user.subscriptionEnd).toLocaleDateString()
            : "N/A"}
        </p>
      </div>

      {/* Feature Settings */}
      <div className="mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
          Features
        </h2>

        {/* AI Difficulty Control */}
        <div className="flex flex-col space-y-2">
          <label className="font-medium">AI Difficulty Control</label>
          <select
            className="border rounded p-2 w-full dark:bg-zinc-800 dark:text-zinc-50"
            disabled={!isPro && !isPremium}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Adaptive Learning (Premium Only) */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <span>Adaptive Learning Control</span>
          <input
            type="checkbox"
            checked={adaptiveLearning}
            disabled={!isPremium}
            onChange={(e) => setAdaptiveLearning(e.target.checked)}
            className="w-5 h-5"
          />
        </div>

        {/* Informational Features */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <span>Export to Google Forms, PDF & CSV</span>
            <Badge
              variant="secondary"
              className="px-2 py-1 text-sm"
            >
              {isPremium ? "Enabled" : "Premium Only"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <span>Priority Email Support</span>
            <Badge
              variant="secondary"
              className="px-2 py-1 text-sm"
            >
              {isPremium ? "Enabled" : "Premium Only"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <span>Advanced Analytics & Performance Tracking</span>
            <Badge
              variant="secondary"
              className="px-2 py-1 text-sm"
            >
              {isPremium ? "Enabled" : "Premium Only"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Cancel Subscription Button */}
      {user.subscriptionStatus === "active" && (
        <Button
          onClick={cancelSubscription}
          disabled={canceling}
          className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
        >
          {canceling && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {canceling ? "Canceling..." : "Cancel Subscription"}
        </Button>
      )}

      {!user.subscriptionStatus && (
        <p className="text-center text-gray-500 mt-4">
          You have no active subscription.
        </p>
      )}
    </div>
  );
}
