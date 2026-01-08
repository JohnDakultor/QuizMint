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





"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type CurrencyData = {
  country: string;
  currency: string;
  prices: { pro: number; premium: number };
};

export default function Subscription() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium" | null>(null);
  const [subscription, setSubscription] = useState<{ isPro: boolean; isPremium: boolean; plan: string | null; active: boolean } | null>(null);
  const [currencyData, setCurrencyData] = useState<CurrencyData>({
    country: "US",
    currency: "USD",
    prices: { pro: 5, premium: 15 },
  });

  // Fetch subscription status
  useEffect(() => {
    const loadSub = async () => {
      const res = await fetch("/api/subscription");
      const data = await res.json();
      setSubscription(data);
    };
    loadSub();
  }, []);

  // Fetch dynamic currency and converted prices
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const res = await fetch("/api/currency");
        const data = await res.json();
        setCurrencyData(data);
      } catch (err) {
        console.error("Failed to load currency", err);
      }
    };
    loadCurrency();
  }, []);

  // Handle checkout
  const handleSubscribe = async (plan: "pro" | "premium") => {
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

  const plans = [
    { id: "pro", title: "Pro Plan", description: "For teachers, students & everyday use", color: "blue" },
    { id: "premium", title: "Premium Plan", description: "Unlimited power users & institutions", color: "purple" },
  ] as const;

  // Currency symbol map
  const SYMBOLS: Record<string, string> = {
    USD: "$",
    SAR: "﷼",
    PHP: "₱",
    AED: "د.إ",
    GBP: "£",
    EUR: "€",
    INR: "₹",
  };

  return (
    <div className="max-w-4xl mx-auto mt-20 px-4 text-center">
      <h1 className="text-4xl font-bold mb-12">Choose Your Subscription Plan</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <div key={plan.id} className="border p-8 rounded-xl shadow hover:shadow-lg transition-all duration-300 relative bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
            {selectedPlan === plan.id && loading && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-xl z-10">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}

            <h2 className="text-2xl font-semibold">{plan.title}</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">{plan.description}</p>

            {/* Dynamic Price */}
            <p className="text-3xl font-bold mt-4">
              {SYMBOLS[currencyData.currency]}
              {currencyData.prices[plan.id]}.00
              <span className="text-base font-medium">/ month</span>
            </p>

            <Button
              className={`mt-6 w-full ${plan.color === "purple" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading || (subscription?.isPro && plan.id === "pro") || (subscription?.isPremium && plan.id === "premium")}
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
    </div>
  );
}
