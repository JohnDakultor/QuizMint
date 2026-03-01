"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

export default function GCashSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying GCash payment...");

  useEffect(() => {
    const run = async () => {
      try {
        const checkoutId = searchParams.get("checkout_session_id") || searchParams.get("checkout_id");
        if (!checkoutId) {
          setState("error");
          setMessage("Missing checkout ID");
          return;
        }

        const res = await fetch("/api/gcash/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkoutId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setState("error");
          setMessage(data?.error || "Payment verification failed");
          return;
        }

        setState("success");
        setMessage("Payment confirmed. Your plan has been updated.");
        setTimeout(() => router.push("/account"), 2200);
      } catch {
        setState("error");
        setMessage("Network error while verifying payment");
      }
    };
    run();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 text-center shadow">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-blue-600" />
            <h1 className="text-xl font-semibold">Processing Payment</h1>
            <p className="mt-2 text-sm text-zinc-600">{message}</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-600" />
            <h1 className="text-xl font-semibold">GCash Payment Successful</h1>
            <p className="mt-2 text-sm text-zinc-600">{message}</p>
            <Button className="mt-5" onClick={() => router.push("/account")}>
              Go to Account
            </Button>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="mx-auto mb-3 h-10 w-10 text-red-600" />
            <h1 className="text-xl font-semibold">Payment Verification Failed</h1>
            <p className="mt-2 text-sm text-zinc-600">{message}</p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="outline" onClick={() => router.push("/subscription")}>
                Back to Subscription
              </Button>
              <Button onClick={() => router.push("/account")}>Go to Account</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
