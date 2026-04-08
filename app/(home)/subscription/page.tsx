"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CreditCard,
  Radio,
  Lock,
  Zap,
  Sparkles,
  Wallet,
  Smartphone,
  Apple,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PopoutCard } from "@/components/ui/popout-card";
import { trackGaEvent } from "@/lib/ga-client";

type CurrencyData = {
  country: string;
  currency: string;
  prices: { pro: number; premium: number };
};

const SYMBOLS: Record<string, string> = {
  USD: "$",
  SAR: "﷼",
  PHP: "₱",
  AED: "د.إ",
  GBP: "£",
  EUR: "€",
  INR: "₹",
};

const plans = [
  {
    id: "pro",
    title: "Teacher Pro",
    description: "For teachers running daily planning, classes, and assignments in one workflow.",
    color: "blue",
    features: [
      "Full quiz generation",
      "Full lesson-plan generation",
      "Saved library",
      "Classes and assignments",
      "Standard teacher workflow",
      "Basic reuse and duplication",
      "Normal support",
    ],
  },
  {
    id: "premium",
    title: "Teacher Premium",
    description: "For power teachers who need analytics, adaptive follow-up, and premium exports.",
    color: "purple",
    features: [
      "Advanced analytics",
      "PDF, CSV, PPTX, and premium exports",
      "Adaptive follow-up recommendations",
      "Intervention workflow support",
      "Priority queue handling for heavy generation jobs",
      "Richer history and reusable teaching assets",
    ],
  },
] as const;

// ATM Card styled payment options
const paymentMethods = [
  {
    id: "stripe",
    name: "Credit/Debit Card",
    icon: CreditCard,
    description: "Pay with Visa, Mastercard, Amex",
    color: "from-purple-500 to-purple-700",
    textColor: "text-white",
    gradient: "bg-gradient-to-r from-purple-600 to-purple-800",
    available: false, // Coming soon
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: Wallet,
    description: "Pay with your PayPal account",
    color: "from-blue-500 to-blue-700",
    textColor: "text-white",
    gradient: "bg-gradient-to-r from-blue-600 to-blue-800",
    available: true,
  },
  {
    id: "gpay",
    name: "Google Pay",
    icon: Smartphone,
    description: "Requires Stripe (coming soon)",
    color: "from-emerald-500 to-teal-700",
    textColor: "text-white",
    gradient: "bg-gradient-to-r from-emerald-600 to-teal-800",
    available: false,
  },
  {
    id: "applepay",
    name: "Apple Pay",
    icon: Apple,
    description: "Requires Stripe (coming soon)",
    color: "from-zinc-700 to-black",
    textColor: "text-white",
    gradient: "bg-gradient-to-r from-zinc-800 to-black",
    available: false,
  },
  {
    id: "gcash",
    name: "GCash",
    icon: Smartphone,
    description: "Temporarily unavailable",
    color: "from-blue-500 to-sky-700",
    textColor: "text-white",
    gradient: "bg-gradient-to-r from-blue-600 to-sky-800",
    available: false, // Temporarily disabled
  },
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  color: string;
  textColor: string;
  gradient: string;
  available: boolean;
}>;

export default function Subscription() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium" | null>(
    null
  );
  const [subscription, setSubscription] = useState<{
    isPro: boolean;
    isPremium: boolean;
    plan: string | null;
    active: boolean;
  } | null>(null);
  const [currencyData, setCurrencyData] = useState<CurrencyData>({
    country: "US",
    currency: "USD",
    prices: { pro: 15, premium: 39 },
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [planToSubscribe, setPlanToSubscribe] = useState<
    "pro" | "premium" | null
  >(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeVariant, setNoticeVariant] = useState<"success" | "error" | "info">("info");

  const showNotice = (
    title: string,
    message = "",
    variant: "success" | "error" | "info" = "info"
  ) => {
    setNoticeTitle(title);
    setNoticeMessage(message);
    setNoticeVariant(variant);
    setNoticeOpen(true);
  };

  // const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  // const PAYPAL_ENV =
  //   process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
  //     ? "production"
  //     : "sandbox";

  // const initialOptions = {
  //   clientId: PAYPAL_CLIENT_ID,
  //   "enable-funding": "venmo",
  //   "disable-funding": "",
  //   "buyer-country": "US",
  //   currency: "USD",
  //   "data-page-type": "product-details",
  //   components: "buttons",
  //   "data-sdk-integration-source": "developer-studio",
  // };

  // Load subscription status
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/subscription");
      const data = await res.json();
      setSubscription(data);
    })();
  }, []);

  // Load dynamic currency
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/currency");
        const data = await res.json();
        setCurrencyData(data);
      } catch (err) {
        console.error("Failed to load currency", err);
      }
    })();
  }, []);

  // Stripe checkout redirect (coming soon)
  const handleStripe = async (plan: "pro" | "premium") => {
    trackGaEvent("subscription_click", {
      action: "checkout_start",
      plan,
      method: "stripe",
      location: "subscription_page",
    });
    setLoading(true);
    setSelectedPlan(plan);
    try {
      const res = await fetch("/api/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showNotice("Checkout Failed", "Failed to create checkout session. Please try again.", "error");
      }
    } catch (err) {
      console.error(err);
      showNotice("Request Failed", "An error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle PayPal subscription
  const handlePayPalSubscription = async (planType: "pro" | "premium") => {
    trackGaEvent("subscription_click", {
      action: "checkout_start",
      plan: planType,
      method: "paypal",
      location: "subscription_page",
    });
    setLoading(true);
    setSelectedPlan(planType);

    try {
      console.log(`Creating ${planType} subscription...`);

      const res = await fetch("/api/paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || data.message || `HTTP error: ${res.status}`
        );
      }

      if (data.approvalLink) {
        console.log("Redirecting to PayPal approval page:", data.approvalLink);
        window.location.href = data.approvalLink;
      } else if (data.subscriptionId) {
        showNotice(
          "Subscription Created",
          `ID: ${data.subscriptionId} - Plan: ${data.planId}`,
          "success"
        );
        setShowPaymentModal(false);
        const subRes = await fetch("/api/subscription");
        const subData = await subRes.json();
        setSubscription(subData);
      } else {
        throw new Error("No approval link or subscription ID received");
      }
    } catch (err: unknown) {
      console.error("PayPal subscription error:", err);
      showNotice(
        "PayPal Error",
        err instanceof Error ? err.message : "Unable to complete subscription.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGooglePay = async (plan: "pro" | "premium") => {
    await handleStripe(plan);
  };

  const handleApplePay = async (plan: "pro" | "premium") => {
    await handleStripe(plan);
  };

  // Handle proceed button click
  const handleProceed = () => {
    if (!selectedPaymentMethod) {
      showNotice("Select Payment Method", "Please select a payment method.", "info");
      return;
    }

    if (!planToSubscribe) {
      showNotice("No Plan Selected", "Choose a plan first.", "info");
      return;
    }

    const method = paymentMethods.find((m) => m.id === selectedPaymentMethod);
    if (!method?.available) {
      showNotice("Method Unavailable", `${method?.name} is coming soon. Please select PayPal for now.`, "info");
      return;
    }

    setLoading(true);
    trackGaEvent("subscription_click", {
      action: "proceed_payment",
      plan: planToSubscribe,
      method: selectedPaymentMethod,
      location: "subscription_modal",
    });

    switch (selectedPaymentMethod) {
      case "stripe":
        handleStripe(planToSubscribe);
        break;
      case "paypal":
        handlePayPalSubscription(planToSubscribe);
        break;
      case "gpay":
        handleGooglePay(planToSubscribe);
        break;
      case "applepay":
        handleApplePay(planToSubscribe);
        break;
      case "gcash":
        showNotice("GCash Unavailable", "Please use PayPal, Google Pay, or Apple Pay.", "info");
        setLoading(false);
        break;
      default:
        showNotice("Invalid Selection", "Invalid payment method selected.", "error");
        setLoading(false);
    }
  };

  return (
    // <PayPalScriptProvider options={initialOptions}>
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-transparent">
      <PopoutCard
        open={noticeOpen}
        onClose={() => setNoticeOpen(false)}
        variant={noticeVariant}
        title={noticeTitle}
        message={noticeMessage}
      />
      <div className="max-w-5xl mx-auto pt-14 pb-10 px-4 text-center">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-200/60 bg-linear-to-r from-slate-950 via-indigo-900 to-cyan-800 p-6 sm:p-8 text-white shadow-[0_20px_55px_-20px_rgba(30,64,175,0.65)] mb-8">
          <div className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Choose Your Teacher Workflow Plan
          </h1>
          <p className="text-cyan-100 text-sm sm:text-base">
            Pick the plan that fits your classroom workflow, from daily planning to adaptive follow-up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`overflow-hidden border p-8 rounded-[28px] shadow-[0_16px_38px_-24px_rgba(15,23,42,0.55)] hover:-translate-y-1 hover:shadow-[0_24px_55px_-24px_rgba(59,130,246,0.45)] transition-all duration-300 relative bg-white border-zinc-200 dark:border-slate-700 dark:bg-slate-900 ${
                plan.id === "premium"
                  ? "ring-1 ring-violet-300/70 bg-[radial-gradient(circle_at_top_right,_rgba(244,114,182,0.18),_transparent_38%),linear-gradient(180deg,rgba(139,92,246,0.10),rgba(255,255,255,0.96))] dark:bg-[radial-gradient(circle_at_top_right,_rgba(244,114,182,0.18),_transparent_34%),linear-gradient(180deg,rgba(91,33,182,0.50),rgba(15,23,42,0.96))]"
                  : "bg-linear-to-b from-sky-50/40 to-white dark:from-slate-900 dark:to-slate-800"
              }`}
            >
              {plan.id === "premium" && (
                <>
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-fuchsia-400 via-violet-500 to-cyan-400" />
                  <div className="pointer-events-none absolute -right-12 top-10 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-3xl" />
                  <div className="pointer-events-none absolute left-0 top-24 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl" />
                </>
              )}
              {selectedPlan === plan.id && loading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-xl z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-slate-100">{plan.title}</h2>
              <p className="text-zinc-600 mt-2 dark:text-slate-300">
                {plan.description}
              </p>
                </div>
                <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${
                  plan.id === "premium"
                    ? "bg-violet-950 text-violet-100 border border-violet-700/70 shadow-[0_10px_30px_-18px_rgba(139,92,246,0.85)]"
                    : "bg-sky-100 text-sky-700 border border-sky-200"
                }`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {plan.id === "premium" ? "High-Leverage" : "Core Workflow"}
                </div>
              </div>

              <div className={`mt-5 rounded-2xl border px-4 py-4 text-left ${
                plan.id === "premium"
                  ? "border-violet-200/80 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-violet-500/30 dark:bg-slate-950/40"
                  : "border-sky-100 bg-white/75 dark:border-slate-700 dark:bg-slate-950/30"
              }`}>
              <p className="text-3xl font-bold text-zinc-900 dark:text-slate-100">
                {SYMBOLS[currencyData.currency] || currencyData.currency}
                {currencyData.prices[plan.id]}.00
                <span className="text-base font-medium text-zinc-600 dark:text-slate-300">/ month</span>
              </p>
              <p className={`mt-2 text-xs ${
                plan.id === "premium"
                  ? "text-violet-700 dark:text-violet-200"
                  : "text-zinc-500 dark:text-slate-400"
              }`}>
                {plan.id === "premium"
                  ? "Built for analytics, intervention workflows, and premium export needs."
                  : "Built for everyday lesson planning, class setup, and assignment flow."}
              </p>
              </div>

              <ul className="mt-5 space-y-2.5 text-left">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-zinc-600 dark:text-slate-300"
                  >
                    <span className={`mt-1.5 h-2 w-2 rounded-full ${
                      plan.id === "premium"
                        ? "bg-gradient-to-br from-fuchsia-500 to-violet-500 shadow-[0_0_0_4px_rgba(139,92,246,0.10)]"
                        : "bg-emerald-500"
                    }`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-6 w-full ${
                  plan.color === "purple"
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                onClick={() => {
                  trackGaEvent("subscription_click", {
                    action: "open_payment_modal",
                    plan: plan.id,
                    location: "subscription_page",
                  });
                  setPlanToSubscribe(plan.id);
                  setShowPaymentModal(true);
                }}
                disabled={
                  loading ||
                  (subscription?.isPro && plan.id === "pro") ||
                  (subscription?.isPremium && plan.id === "premium")
                }
              >
                {subscription?.isPro && plan.id === "pro"
                  ? "Subscribed"
                  : subscription?.isPremium && plan.id === "premium"
                  ? "Subscribed"
                  : loading && selectedPlan === plan.id
                  ? "Processing..."
                  : `Subscribe to ${plan.title}`}
              </Button>

              {plan.id === "premium" && (
                <Badge className="absolute top-4 right-4 bg-violet-100 text-violet-800 px-2 py-1 border border-violet-200 shadow-sm">
                  Popular
                </Badge>
              )}
            </div>
          ))}
        </div>

        {showPaymentModal && planToSubscribe && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white rounded-2xl shadow-2xl max-w-xs sm:max-w-sm w-full overflow-hidden border border-gray-200 dark:bg-slate-900 dark:border-slate-700">
              {/* Modal Header - Ultra Compact */}
              <div className="bg-linear-to-r from-slate-950 via-indigo-900 to-cyan-800 p-3 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-5 h-5" />
                    <div>
                      <h2 className="text-sm font-bold">Payment</h2>
                      <p className="text-gray-300 text-[10px]">Choose method</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-300">Plan</div>
                    <div className="font-semibold text-xs">
                      {planToSubscribe === "pro" ? "Teacher Pro" : "Teacher Premium"}
                    </div>
                  </div>
                </div>

                {/* Amount Display - Ultra Compact */}
                <div className="bg-black/30 p-2 rounded">
                  <div className="text-[10px] text-gray-300">Total</div>
                  <div className="text-xl font-bold">
                    {SYMBOLS[currencyData.currency] || currencyData.currency}
                    {currencyData.prices[planToSubscribe]}.00
                    <span className="text-[10px] font-normal ml-0.5">/mo</span>
                  </div>
                </div>
              </div>

              {/* Payment Methods - Ultra Compact */}
              <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto bg-linear-to-b from-white to-slate-50/50">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                    <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Methods
                    </h3>
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {paymentMethods.filter((m) => m.available).length}/
                    {paymentMethods.length}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {paymentMethods.map((method) => {
                    const isSelected = selectedPaymentMethod === method.id;
                    const isAvailable = method.available;
                    const MethodIcon = method.icon;

                    return (
                      <div
                        key={method.id}
                        className={`relative border rounded p-2 cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? `border-blue-400 dark:border-blue-400 shadow-sm ${method.gradient}`
                            : isAvailable
                            ? "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30"
                        } ${
                          isSelected
                            ? method.textColor
                            : "bg-white dark:bg-gray-800"
                        }`}
                        onClick={() =>
                          isAvailable && setSelectedPaymentMethod(method.id)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="relative shrink-0">
                              {isAvailable ? (
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? "border-white bg-blue-400"
                                      : "border-gray-300 dark:border-gray-500"
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                  )}
                                </div>
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <MethodIcon className="h-4 w-4" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`font-medium text-xs truncate ${
                                        isSelected
                                          ? "text-white"
                                          : isAvailable
                                          ? "text-gray-800 dark:text-gray-200"
                                          : "text-gray-500 dark:text-gray-400"
                                      }`}
                                    >
                                      {method.name}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1 py-0 leading-none h-3.5 ${
                                        isAvailable
                                          ? "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                                          : "border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
                                      }`}
                                    >
                                      {isAvailable ? "✓" : "⏳"}
                                    </Badge>
                                  </div>
                                  <div
                                    className={`text-[10px] truncate ${
                                      isSelected
                                        ? "text-gray-200"
                                        : isAvailable
                                        ? "text-gray-500 dark:text-gray-400"
                                        : "text-gray-400 dark:text-gray-500"
                                    }`}
                                  >
                                    {method.description}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {isSelected && isAvailable && (
                            <Radio className="w-3.5 h-3.5 text-white shrink-0" />
                          )}
                        </div>

                        {!isAvailable && (
                          <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-0.5 text-[10px]">
                              <Zap className="w-2.5 h-2.5 text-yellow-500 shrink-0" />
                              <span className="text-yellow-600 dark:text-yellow-400 truncate">
                                Coming soon
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Dynamic Summary - Ultra Compact */}
                {paymentMethods.filter((m) => m.available).length > 0 && (
                  <div className="mt-2 p-1.5 bg-linear-to-r from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 rounded border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          paymentMethods.filter((m) => m.available).length > 0
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      ></div>
                      <div className="text-[10px] text-green-800 dark:text-green-300">
                        {selectedPaymentMethod &&
                        paymentMethods.find(
                          (m) => m.id === selectedPaymentMethod
                        )?.available
                          ? `${
                              paymentMethods.find(
                                (m) => m.id === selectedPaymentMethod
                              )?.name
                            } selected`
                          : `${
                              paymentMethods.filter((m) => m.available).length
                            } methods available`}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons - Ultra Compact */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col gap-2">
                  {selectedPaymentMethod &&
                  paymentMethods.find((m) => m.id === selectedPaymentMethod)
                    ?.available ? (
                    <Button
                      className={`py-2 text-xs ${
                        selectedPaymentMethod === "stripe"
                          ? "bg-linear-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                        : selectedPaymentMethod === "gpay"
                          ? "bg-linear-to-r from-emerald-500 to-teal-700 hover:from-emerald-600 hover:to-teal-800"
                        : selectedPaymentMethod === "applepay"
                          ? "bg-linear-to-r from-zinc-700 to-black hover:from-zinc-800 hover:to-black"
                        : selectedPaymentMethod === "gcash"
                          ? "bg-linear-to-r from-blue-500 to-sky-700 hover:from-blue-600 hover:to-sky-800"
                          : selectedPaymentMethod === "paypal"
                          ? "bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                          : "bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                      } text-white border-0`}
                      onClick={handleProceed}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3 h-3 mr-1" />
                          Pay with{" "}
                          {paymentMethods.find(
                            (m) => m.id === selectedPaymentMethod
                          )?.name || ""}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="py-2 text-xs bg-linear-to-r from-gray-300 to-gray-400 text-gray-700 border-0 cursor-not-allowed"
                      disabled
                    >
                      <CreditCard className="w-3 h-3 mr-1" />
                      Select method
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="py-1.5 text-xs border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedPaymentMethod("");
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>

                {/* Security Badges - Ultra Compact */}
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                      <span className="text-[8px] text-gray-500 dark:text-gray-400">
                        SSL
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      <span className="text-[8px] text-gray-500 dark:text-gray-400">
                        PCI
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                      <span className="text-[8px] text-gray-500 dark:text-gray-400">
                        256-bit
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* </PayPalScriptProvider> */}
    </div>
  );
}
