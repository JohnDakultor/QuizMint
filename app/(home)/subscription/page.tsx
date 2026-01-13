// "use client";

// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Loader2 } from "lucide-react";
// import { Badge } from "@/components/ui/badge";

// export default function Subscription() {
//   const [loading, setLoading] = useState(false);
//   const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium" | null>(
//     null
//   );
//   const [subscription, setSubscription] = useState<{
//     isPro: boolean;
//     isPremium: boolean;
//     plan: string | null;
//     active: boolean;
//   } | null>(null);

//   useEffect(() => {
//     const loadSub = async () => {
//       const res = await fetch("/api/subscription");
//       const data = await res.json();
//       setSubscription(data);
//     };

//     loadSub();
//   }, []);

//   const handleSubscribe = async (plan: "pro" | "premium") => {
//     setLoading(true);
//     setSelectedPlan(plan);
//     try {
//       const res = await fetch("/api/stripe-checkout", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ plan }),
//       });

//       const data = await res.json();
//       if (data.url) {
//         window.location.href = data.url;
//       } else {
//         alert("Failed to create checkout session. Please try again.");
//       }
//     } catch (err) {
//       console.error(err);
//       alert("An error occurred. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const plans = [
//     {
//       id: "pro",
//       title: "Pro Plan",
//       description: "For teachers, students & everyday use",
//       price: "$5.00 / month",
//       color: "blue",
//     },
//     {
//       id: "premium",
//       title: "Premium Plan",
//       description: "Unlimited power users & institutions",
//       price: "$15.00 / month",
//       color: "purple",
//     },
//   ] as const;

//   return (
//     <div className="max-w-4xl mx-auto mt-20 px-4 text-center">
//       <h1 className="text-4xl font-bold mb-12">
//         Choose Your Subscription Plan
//       </h1>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//         {plans.map((plan) => (
//           <div
//             key={plan.id}
//             className={`border p-8 rounded-xl shadow hover:shadow-lg transition-all duration-300 relative ${
//               plan.color === "blue"
//                 ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
//                 : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
//             }`}
//           >
//             {selectedPlan === plan.id && loading && (
//               <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-xl z-10">
//                 <Loader2 className="w-8 h-8 animate-spin text-white" />
//               </div>
//             )}

//             <h2 className="text-2xl font-semibold">{plan.title}</h2>
//             <p className="text-zinc-600 dark:text-zinc-400 mt-2">
//               {plan.description}
//             </p>
//             <p className="text-3xl font-bold mt-4">{plan.price}</p>

//             <Button
//   className={`mt-6 w-full ${
//     plan.color === "purple"
//       ? "bg-purple-600 hover:bg-purple-700 text-white"
//       : "bg-blue-600 hover:bg-blue-700 text-white"
//   }`}
//   onClick={() => handleSubscribe(plan.id)}
//   disabled={
//     loading ||
//     (subscription?.isPro && plan.id === "pro") ||
//     (subscription?.isPremium && plan.id === "premium")
//   }
// >
//   {subscription?.isPro && plan.id === "pro"
//     ? "Subscribed"
//     : subscription?.isPremium && plan.id === "premium"
//     ? "Subscribed"
//     : loading && selectedPlan === plan.id
//     ? "Processing..."
//     : `Subscribe to ${plan.title}`}
// </Button>

//             {plan.id === "premium" && (
//               <Badge className="absolute top-4 right-4 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 px-2 py-1">
//                 Popular
//               </Badge>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// "use client";

// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Loader2 } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

// type CurrencyData = {
//   country: string;
//   currency: string;
//   prices: { pro: number; premium: number };
// };

// const SYMBOLS: Record<string, string> = {
//   USD: "$",
//   SAR: "﷼",
//   PHP: "₱",
//   AED: "د.إ",
//   GBP: "£",
//   EUR: "€",
//   INR: "₹",
// };

// const plans = [
//   { id: "pro", title: "Pro Plan", description: "For teachers, students & everyday use", color: "blue" },
//   { id: "premium", title: "Premium Plan", description: "Unlimited power users & institutions", color: "purple" },
// ] as const;

// export default function Subscription() {
//   const [loading, setLoading] = useState(false);
//   const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium" | null>(null);
//   const [subscription, setSubscription] = useState<{ isPro: boolean; isPremium: boolean; plan: string | null; active: boolean } | null>(null);
//   const [currencyData, setCurrencyData] = useState<CurrencyData>({
//     country: "US",
//     currency: "USD",
//     prices: { pro: 5, premium: 15 },
//   });

//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [planToSubscribe, setPlanToSubscribe] = useState<"pro" | "premium" | null>(null);

//   const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
//   if (!PAYPAL_CLIENT_ID) throw new Error("Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID in .env.local");

//   // Load subscription status
//   useEffect(() => {
//     (async () => {
//       const res = await fetch("/api/subscription");
//       const data = await res.json();
//       setSubscription(data);
//     })();
//   }, []);

//   // Load dynamic currency
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await fetch("/api/currency");
//         const data = await res.json();
//         setCurrencyData(data);
//       } catch (err) {
//         console.error("Failed to load currency", err);
//       }
//     })();
//   }, []);

//   // Stripe checkout redirect
//   const handleStripe = async (plan: "pro" | "premium") => {
//     setLoading(true);
//     setSelectedPlan(plan);
//     try {
//       const res = await fetch("/api/stripe-checkout", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ plan }),
//       });
//       const data = await res.json();
//       if (data.url) window.location.href = data.url;
//       else alert("Failed to create Stripe session");
//     } catch (err) {
//       console.error(err);
//       alert("An error occurred. Please try again.");
//     } finally {
//       setLoading(false);
//       setShowPaymentModal(false);
//     }
//   };

//   return (
//     <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, intent: "subscription", vault: true }}>
//       <div className="max-w-4xl mx-auto mt-20 px-4 text-center">
//         <h1 className="text-4xl font-bold mb-12">Choose Your Subscription Plan</h1>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           {plans.map((plan) => (
//             <div
//               key={plan.id}
//               className="border p-8 rounded-xl shadow hover:shadow-lg transition-all duration-300 relative bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
//             >
//               {selectedPlan === plan.id && loading && (
//                 <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-xl z-10">
//                   <Loader2 className="w-8 h-8 animate-spin text-white" />
//                 </div>
//               )}

//               <h2 className="text-2xl font-semibold">{plan.title}</h2>
//               <p className="text-zinc-600 dark:text-zinc-400 mt-2">{plan.description}</p>

//               <p className="text-3xl font-bold mt-4">
//                 {SYMBOLS[currencyData.currency]}
//                 {currencyData.prices[plan.id]}.00
//                 <span className="text-base font-medium">/ month</span>
//               </p>

//               <Button
//                 className={`mt-6 w-full ${plan.color === "purple" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
//                 onClick={() => {
//                   setPlanToSubscribe(plan.id);
//                   setShowPaymentModal(true);
//                 }}
//                 disabled={loading || (subscription?.isPro && plan.id === "pro") || (subscription?.isPremium && plan.id === "premium")}
//               >
//                 {subscription?.isPro && plan.id === "pro"
//                   ? "Subscribed"
//                   : subscription?.isPremium && plan.id === "premium"
//                   ? "Subscribed"
//                   : loading && selectedPlan === plan.id
//                   ? "Processing..."
//                   : `Subscribe to ${plan.title}`}
//               </Button>

//               {plan.id === "premium" && (
//                 <Badge className="absolute top-4 right-4 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 px-2 py-1">
//                   Popular
//                 </Badge>
//               )}
//             </div>
//           ))}
//         </div>

//         {/* Payment Modal */}
//         {showPaymentModal && planToSubscribe && (
//           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//             <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl max-w-sm w-full text-center">
//               <h2 className="text-xl font-bold mb-4">Choose Payment Method</h2>

//               {/* Stripe */}
//               <Button
//                 className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white"
//                 onClick={() => handleStripe(planToSubscribe)}
//               >
//                 Pay with Stripe
//               </Button>

//               {/* PayPal */}
//               <div className="my-4">
//                 <PayPalButtons
//   style={{ layout: "vertical" }}
//   createSubscription={(data, actions) => {
//     return actions.subscription.create({
//       plan_id:
//         planToSubscribe === "pro"
//           ? process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID!
//           : process.env.NEXT_PUBLIC_PAYPAL_PREMIUM_PLAN_ID!,
//     });
//   }}
//   onApprove={async (data) => {
//     console.log("Subscription approved:", data.subscriptionID);

//     // OPTIONAL: save subscriptionID to backend
//     await fetch("/api/paypal", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         subscriptionId: data.subscriptionID,
//       }),
//     });

//     alert("Subscription successful!");
//     setShowPaymentModal(false);
//   }}
//   onError={(err) => {
//     console.error("PayPal error:", err);
//     alert("PayPal failed. Try again.");
//   }}
// />

//               </div>

//               <Button className="mt-4 w-full bg-gray-300 hover:bg-gray-400 text-black" onClick={() => setShowPaymentModal(false)}>
//                 Cancel
//               </Button>
//             </div>
//           </div>
//         )}
//       </div>
//     </PayPalScriptProvider>
//   );
// }

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Radio, Lock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

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
    title: "Pro Plan",
    description: "For teachers, students & everyday use",
    color: "blue",
  },
  {
    id: "premium",
    title: "Premium Plan",
    description: "Unlimited power users & institutions",
    color: "purple",
  },
] as const;

// ATM Card styled payment options
const paymentMethods = [
  {
    id: "stripe",
    name: "Credit/Debit Card",
    icon: "💳",
    description: "Pay with Visa, Mastercard, Amex",
    color: "from-purple-500 to-purple-700",
    textColor: "text-white",
    gradient: "bg-gradient-to-r from-purple-600 to-purple-800",
    available: true, // Coming soon
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: "🔵",
    description: "Pay with your PayPal account",
    color: "from-blue-500 to-blue-700",
    textColor: "text-white",
    gradient: "bg-gradient-to-r from-blue-600 to-blue-800",
    available: true,
  },
  {
    id: "gpay",
    name: "Google Pay",
    icon: "🔴🟢🟡🔵",
    description: "Fast checkout with Google Pay",
    color: "from-gray-800 to-gray-900",
    textColor: "text-white",
    gradient: "bg-gradient-to-r from-gray-900 to-black",
    available: false, // Coming soon
  },
  {
    id: "applepay",
    name: "Apple Pay",
    icon: "🍎",
    description: "Fast checkout with Apple Pay",
    color: "from-gray-800 to-gray-900",
    textColor: "text-white",
    gradient: "bg-gradient-to-r from-gray-900 to-black",
    available: false, // Coming soon
  }

];

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
    prices: { pro: 5, premium: 15 },
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [planToSubscribe, setPlanToSubscribe] = useState<
    "pro" | "premium" | null
  >(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");

  const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  const PAYPAL_ENV =
    process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
      ? "production"
      : "sandbox";

  const initialOptions = {
    clientId: PAYPAL_CLIENT_ID,
    "enable-funding": "venmo",
    "disable-funding": "",
    "buyer-country": "US",
    currency: "USD",
    "data-page-type": "product-details",
    components: "buttons",
    "data-sdk-integration-source": "developer-studio",
  };

  useEffect(() => {
    fetch('/api/paypal/debug-subs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'get' })
    })
      .then(res => res.json())
      .then(data => console.log('Current state:', data))
      .catch(error => console.error('Error:', error));
  }, []);

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
        alert("Failed to create checkout session. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle PayPal subscription
  const handlePayPalSubscription = async (planType: "pro" | "premium") => {
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
        alert(
          `✅ Subscription created! ID: ${data.subscriptionId}\nPlan ID: ${data.planId}`
        );
        setShowPaymentModal(false);
        const subRes = await fetch("/api/subscription");
        const subData = await subRes.json();
        setSubscription(subData);
      } else {
        throw new Error("No approval link or subscription ID received");
      }
    } catch (err: any) {
      console.error("PayPal subscription error:", err);
      alert(`❌ Error: ${err.message}\n\nCheck console for details.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Pay (coming soon)
  const handleGooglePay = async (plan: "pro" | "premium") => {
    setLoading(true);
    alert("Google Pay integration is coming soon! For now, please use PayPal.");
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  // Handle proceed button click
  const handleProceed = () => {
    if (!selectedPaymentMethod) {
      alert("Please select a payment method");
      return;
    }

    if (!planToSubscribe) {
      alert("No plan selected");
      return;
    }

    const method = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (!method?.available) {
      alert(`${method?.name} is coming soon! Please select PayPal for now.`);
      return;
    }

    setLoading(true);

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
      default:
        alert("Invalid payment method selected");
        setLoading(false);
    }
  };

  return (
    <PayPalScriptProvider options={initialOptions}>
      <div className="max-w-4xl mx-auto mt-20 px-4 text-center">
        <h1 className="text-4xl font-bold mb-12">
          Choose Your Subscription Plan
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="border p-8 rounded-xl shadow hover:shadow-lg transition-all duration-300 relative bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
            >
              {selectedPlan === plan.id && loading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-xl z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}

              <h2 className="text-2xl font-semibold">{plan.title}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                {plan.description}
              </p>

              <p className="text-3xl font-bold mt-4">
                {SYMBOLS[currencyData.currency] || currencyData.currency}
                {currencyData.prices[plan.id]}.00
                <span className="text-base font-medium">/ month</span>
              </p>

              <Button
                className={`mt-6 w-full ${
                  plan.color === "purple"
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                onClick={() => {
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
                <Badge className="absolute top-4 right-4 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 px-2 py-1">
                  Popular
                </Badge>
              )}
            </div>
          ))}
        </div>

    {showPaymentModal && planToSubscribe && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-xs sm:max-w-sm w-full overflow-hidden border border-gray-300 dark:border-gray-700">
      {/* Modal Header - Ultra Compact */}
      <div className="bg-linear-to-r from-gray-900 to-black p-3 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-5 h-5" />
            <div>
              <h2 className="text-sm font-bold">Payment</h2>
              <p className="text-gray-300 text-[10px]">
                Choose method
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-300">Plan</div>
            <div className="font-semibold text-xs">
              {planToSubscribe === "pro" ? "Pro" : "Premium"}
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
      <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              Methods
            </h3>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
            {paymentMethods.filter(m => m.available).length}/{paymentMethods.length}
          </div>
        </div>

        <div className="space-y-1.5">
          {paymentMethods.map((method) => {
            const isSelected = selectedPaymentMethod === method.id;
            const isAvailable = method.available;
            
            return (
              <div
                key={method.id}
                className={`relative border rounded p-2 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? `border-blue-400 dark:border-blue-400 shadow-sm ${method.gradient}`
                    : isAvailable
                    ? "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30"
                } ${isSelected ? method.textColor : "bg-white dark:bg-gray-800"}`}
                onClick={() => isAvailable && setSelectedPaymentMethod(method.id)}
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
                        <span className="text-lg leading-none">{method.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className={`font-medium text-xs truncate ${
                              isSelected 
                                ? "text-white" 
                                : isAvailable
                                ? "text-gray-800 dark:text-gray-200"
                                : "text-gray-500 dark:text-gray-400"
                            }`}>
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
                          <div className={`text-[10px] truncate ${
                            isSelected 
                              ? "text-gray-200" 
                              : isAvailable
                              ? "text-gray-500 dark:text-gray-400"
                              : "text-gray-400 dark:text-gray-500"
                          }`}>
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
        {paymentMethods.filter(m => m.available).length > 0 && (
          <div className="mt-2 p-1.5 bg-linear-to-r from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 rounded border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                paymentMethods.filter(m => m.available).length > 0 
                  ? "bg-green-500" 
                  : "bg-yellow-500"
              }`}></div>
              <div className="text-[10px] text-green-800 dark:text-green-300">
                {selectedPaymentMethod && paymentMethods.find(m => m.id === selectedPaymentMethod)?.available
                  ? `${paymentMethods.find(m => m.id === selectedPaymentMethod)?.name} selected`
                  : `${paymentMethods.filter(m => m.available).length} methods available`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - Ultra Compact */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col gap-2">
          {selectedPaymentMethod && paymentMethods.find(m => m.id === selectedPaymentMethod)?.available ? (
            <Button
              className={`py-2 text-xs ${
                selectedPaymentMethod === "stripe" 
                  ? "bg-linear-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700" 
                  : selectedPaymentMethod === "gpay"
                  ? "bg-linear-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black"
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
                  Pay with {paymentMethods.find(m => m.id === selectedPaymentMethod)?.name || ""}
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
              <span className="text-[8px] text-gray-500 dark:text-gray-400">SSL</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
              <span className="text-[8px] text-gray-500 dark:text-gray-400">PCI</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
              <span className="text-[8px] text-gray-500 dark:text-gray-400">256-bit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
      </div>
    </PayPalScriptProvider>
  );
}
// "use client";

// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Loader2, Bug, ExternalLink } from "lucide-react";
// import { Badge } from "@/components/ui/badge";
// import { PayPalScriptProvider } from "@paypal/react-paypal-js";

// type CurrencyData = {
//   country: string;
//   currency: string;
//   prices: { pro: number; premium: number };
// };

// const SYMBOLS: Record<string, string> = {
//   USD: "$",
//   SAR: "﷼",
//   PHP: "₱",
//   AED: "د.إ",
//   GBP: "£",
//   EUR: "€",
//   INR: "₹",
// };

// const plans = [
//   { id: "pro", title: "Pro Plan", description: "For teachers, students & everyday use", color: "blue" },
//   { id: "premium", title: "Premium Plan", description: "Unlimited power users & institutions", color: "purple" },
// ] as const;

// export default function Subscription() {
//   const [loading, setLoading] = useState(false);
//   const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium" | null>(null);
//   const [subscription, setSubscription] = useState<{ isPro: boolean; isPremium: boolean; plan: string | null; active: boolean } | null>(null);
//   const [currencyData, setCurrencyData] = useState<CurrencyData>({
//     country: "US",
//     currency: "USD",
//     prices: { pro: 5, premium: 15 },
//   });

//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [planToSubscribe, setPlanToSubscribe] = useState<"pro" | "premium" | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [debugData, setDebugData] = useState<any>(null);
//   const [showDebug, setShowDebug] = useState(false);
//   const [testing, setTesting] = useState(false);

//   const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

//   if (!PAYPAL_CLIENT_ID) {
//     console.error("❌ Missing PayPal Client ID in environment variables");
//   }

//   // Load subscription status
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await fetch("/api/subscription");
//         const data = await res.json();
//         setSubscription(data);
//       } catch (err) {
//         console.error("Failed to load subscription:", err);
//       }
//     })();
//   }, []);

//   // Load dynamic currency
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await fetch("/api/currency");
//         const data = await res.json();
//         setCurrencyData(data);
//       } catch (err) {
//         console.error("Failed to load currency", err);
//       }
//     })();
//   }, []);

//   // Run PayPal debug test
//   const runDebugTest = async () => {
//     setTesting(true);
//     setError(null);
//     try {
//       console.log("🔍 Running PayPal debug test...");
//       const res = await fetch("/api/paypal/debug");
//       const data = await res.json();
//       setDebugData(data);
//       setShowDebug(true);

//       if (!data.success) {
//         setError("PayPal configuration has issues. Check debug panel below.");
//       } else {
//         console.log("✅ PayPal debug test successful", data);
//       }
//     } catch (err: any) {
//       console.error("Debug test failed:", err);
//       setError(`Debug test failed: ${err.message}`);
//     } finally {
//       setTesting(false);
//     }
//   };

//   // Handle PayPal subscription
//   const handlePayPalSubscription = async (planId: "pro" | "premium") => {
//     setLoading(true);
//     setError(null);
//     try {
//       console.log(`Creating ${planId} subscription...`);

//       const res = await fetch("/api/paypal", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ planId }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         console.error("API Error Response:", data);

//         let errorMsg = data.error || data.message || `HTTP error: ${res.status}`;
//         if (data.details) {
//           errorMsg += ` - ${JSON.stringify(data.details)}`;
//         }

//         throw new Error(errorMsg);
//       }

//       if (data.approvalLink) {
//         console.log("✅ Redirecting to PayPal:", data.approvalLink);
//         window.location.href = data.approvalLink;
//       } else if (data.subscriptionId) {
//         alert(`Subscription created with ID: ${data.subscriptionId}. Please check your PayPal account.`);
//         setShowPaymentModal(false);
//       } else {
//         throw new Error("No approval link or subscription ID received");
//       }
//     } catch (err: any) {
//       console.error("❌ PayPal subscription error:", err);
//       setError(err.message);
//       alert(`PayPal Error: ${err.message}\n\nRun the debug test to check your configuration.`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Stripe checkout redirect
//   const handleStripe = async (plan: "pro" | "premium") => {
//     setLoading(true);
//     setSelectedPlan(plan);
//     try {
//       const res = await fetch("/api/stripe-checkout", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ plan }),
//       });
//       const data = await res.json();
//       if (data.url) window.location.href = data.url;
//       else alert("Failed to create Stripe session");
//     } catch (err) {
//       console.error(err);
//       alert("An error occurred. Please try again.");
//     } finally {
//       setLoading(false);
//       setShowPaymentModal(false);
//     }
//   };

//   return (
//     <PayPalScriptProvider
//       options={{
//         clientId: PAYPAL_CLIENT_ID || "",
//         intent: "subscription",
//         vault: true,
//         currency: currencyData.currency,
//         components: "buttons",
//       }}
//     >
//       <div className="max-w-6xl mx-auto mt-10 px-4">
//         {/* Debug Panel */}
//         {showDebug && debugData && (
//           <div className="mb-8 p-6 bg-gray-900 text-white rounded-xl">
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-xl font-bold flex items-center gap-2">
//                 <Bug className="w-5 h-5" />
//                 PayPal Debug Results
//               </h2>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => setShowDebug(false)}
//                 className="text-white hover:bg-gray-800"
//               >
//                 Close
//               </Button>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
//               <div className={`p-3 rounded-lg ${debugData.summary?.auth?.includes("✅") ? "bg-green-900" : "bg-red-900"}`}>
//                 <div className="text-sm opacity-80">Authentication</div>
//                 <div className="font-bold">{debugData.summary?.auth || "Not tested"}</div>
//               </div>
//               <div className={`p-3 rounded-lg ${debugData.summary?.proPlan?.includes("✅") ? "bg-green-900" : "bg-red-900"}`}>
//                 <div className="text-sm opacity-80">Pro Plan</div>
//                 <div className="font-bold">{debugData.summary?.proPlan || "Not tested"}</div>
//               </div>
//               <div className={`p-3 rounded-lg ${debugData.summary?.premiumPlan?.includes("✅") ? "bg-green-900" : "bg-red-900"}`}>
//                 <div className="text-sm opacity-80">Premium Plan</div>
//                 <div className="font-bold">{debugData.summary?.premiumPlan || "Not tested"}</div>
//               </div>
//             </div>

//             {debugData.error && (
//               <div className="mb-4 p-3 bg-red-800 rounded-lg">
//                 <div className="font-bold">Error:</div>
//                 <div>{debugData.error}</div>
//               </div>
//             )}

//             <div className="space-y-4">
//               <div>
//                 <h3 className="font-semibold mb-2">Environment Variables:</h3>
//                 <pre className="text-sm bg-gray-800 p-3 rounded overflow-auto max-h-40">
//                   {JSON.stringify(debugData.envCheck, null, 2)}
//                 </pre>
//               </div>

//               <div>
//                 <h3 className="font-semibold mb-2">Plan Tests:</h3>
//                 <pre className="text-sm bg-gray-800 p-3 rounded overflow-auto max-h-60">
//                   {JSON.stringify(debugData.planTests, null, 2)}
//                 </pre>
//               </div>

//               {debugData.allPlans && debugData.allPlans.length > 0 && (
//                 <div>
//                   <h3 className="font-semibold mb-2">All Available Plans:</h3>
//                   <pre className="text-sm bg-gray-800 p-3 rounded overflow-auto max-h-60">
//                     {JSON.stringify(debugData.allPlans, null, 2)}
//                   </pre>
//                 </div>
//               )}
//             </div>

//             <div className="mt-4 text-sm text-gray-400">
//               <p>Timestamp: {debugData.timestamp}</p>
//               <p>Status: {debugData.success ? "✅ Success" : "❌ Failed"}</p>
//             </div>
//           </div>
//         )}

//         {/* Header with Debug Button */}
//         <div className="text-center mb-12">
//           <h1 className="text-4xl font-bold mb-4">Choose Your Subscription Plan</h1>
//           <p className="text-gray-600 dark:text-gray-400 mb-6">
//             Select a plan that fits your needs
//           </p>

//           <div className="flex justify-center gap-4 mb-4">
//             <Button
//               variant="outline"
//               onClick={runDebugTest}
//               disabled={testing}
//               className="flex items-center gap-2"
//             >
//               {testing ? (
//                 <>
//                   <Loader2 className="w-4 h-4 animate-spin" />
//                   Testing PayPal...
//                 </>
//               ) : (
//                 <>
//                   <Bug className="w-4 h-4" />
//                   Test PayPal Configuration
//                 </>
//               )}
//             </Button>

//             <Button
//               variant="outline"
//               onClick={() => window.open("/api/paypal/debug", "_blank")}
//               className="flex items-center gap-2"
//             >
//               <ExternalLink className="w-4 h-4" />
//               Open Debug in New Tab
//             </Button>
//           </div>

//           {error && !showDebug && (
//             <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
//               <p className="font-semibold">Configuration Issue Detected:</p>
//               <p>{error}</p>
//               <p className="text-sm mt-2">
//                 Click "Test PayPal Configuration" above to see details.
//               </p>
//             </div>
//           )}
//         </div>

//         {/* Subscription Plans */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//           {plans.map((plan) => (
//             <div
//               key={plan.id}
//               className="border p-8 rounded-xl shadow hover:shadow-lg transition-all duration-300 relative bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
//             >
//               {selectedPlan === plan.id && loading && (
//                 <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-xl z-10">
//                   <Loader2 className="w-8 h-8 animate-spin text-white" />
//                 </div>
//               )}

//               <h2 className="text-2xl font-semibold">{plan.title}</h2>
//               <p className="text-zinc-600 dark:text-zinc-400 mt-2">{plan.description}</p>

//               <p className="text-3xl font-bold mt-4">
//                 {SYMBOLS[currencyData.currency] || currencyData.currency}
//                 {currencyData.prices[plan.id]}.00
//                 <span className="text-base font-medium">/ month</span>
//               </p>

//               <Button
//                 className={`mt-6 w-full ${plan.color === "purple" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
//                 onClick={() => {
//                   setPlanToSubscribe(plan.id);
//                   setShowPaymentModal(true);
//                 }}
//                 disabled={loading || (subscription?.isPro && plan.id === "pro") || (subscription?.isPremium && plan.id === "premium")}
//               >
//                 {subscription?.isPro && plan.id === "pro"
//                   ? "✓ Subscribed"
//                   : subscription?.isPremium && plan.id === "premium"
//                   ? "✓ Subscribed"
//                   : loading && selectedPlan === plan.id
//                   ? "Processing..."
//                   : `Subscribe to ${plan.title}`}
//               </Button>

//               {plan.id === "premium" && (
//                 <Badge className="absolute top-4 right-4 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-100 px-2 py-1">
//                   Popular
//                 </Badge>
//               )}
//             </div>
//           ))}
//         </div>

//         {/* Payment Modal */}
//         {showPaymentModal && planToSubscribe && (
//           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
//             <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl max-w-md w-full mx-4 text-center">
//               <h2 className="text-xl font-bold mb-4">Choose Payment Method</h2>
//               <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
//                 Subscribing to {planToSubscribe === "pro" ? "Pro" : "Premium"} Plan
//               </p>

//               {/* PayPal Button */}
//               <div className="mb-4">
//                 <Button
//                   className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-2"
//                   onClick={() => handlePayPalSubscription(planToSubscribe)}
//                   disabled={loading}
//                 >
//                   {loading ? "Processing..." : "Pay with PayPal"}
//                 </Button>
//                 <p className="text-xs text-zinc-500">Secure PayPal payment</p>
//               </div>

//               {/* Stripe Button */}
//               <div className="mb-4">
//                 <Button
//                   className="w-full bg-purple-600 hover:bg-purple-700 text-white mb-2"
//                   onClick={() => handleStripe(planToSubscribe)}
//                   disabled={loading}
//                 >
//                   {loading ? "Processing..." : "Pay with Stripe"}
//                 </Button>
//                 <p className="text-xs text-zinc-500">Credit/Debit card payments</p>
//               </div>

//               {/* Cancel Button */}
//               <Button
//                 variant="outline"
//                 className="w-full mt-4"
//                 onClick={() => setShowPaymentModal(false)}
//                 disabled={loading}
//               >
//                 Cancel
//               </Button>

//               {error && (
//                 <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
//                   <p className="font-medium">Error:</p>
//                   <p>{error}</p>
//                   <button
//                     onClick={runDebugTest}
//                     className="mt-2 text-blue-600 hover:underline text-xs"
//                   >
//                     Run Configuration Test
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Help Section */}
//         <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
//           <h3 className="text-lg font-semibold mb-2">Having Issues with PayPal?</h3>
//           <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
//             <li>1. Click "Test PayPal Configuration" button above</li>
//             <li>2. Check if your plan IDs are correct and ACTIVE in PayPal</li>
//             <li>3. Make sure your .env.local file has all required variables</li>
//             <li>4. Visit <a href="https://developer.paypal.com/dashboard" target="_blank" className="text-blue-600 hover:underline">PayPal Developer Dashboard</a> to verify your plans</li>
//             <li>5. Restart your development server after updating .env.local</li>
//           </ul>
//         </div>
//       </div>
//     </PayPalScriptProvider>
//   );
// }
