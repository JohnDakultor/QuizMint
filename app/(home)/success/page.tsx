"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SessionData {
  plan?: string;
  amount?: string;
}

export default function SuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return setError("No session ID found");

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/stripe-session?session_id=${sessionId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch session");
        setSession(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold text-red-600">❌ Payment Error</h1>
        <p className="mt-4 text-lg text-zinc-700 dark:text-zinc-300">{error}</p>
        <Button
          className="mt-6 bg-blue-600 hover:bg-blue-700"
          onClick={() => router.push("/subscription")}
        >
          Go Back to Pricing
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
      <Badge className="mb-4 text-green-800 dark:bg-green-900 dark:text-green-100">
        🎉 Success
      </Badge>
      <h1 className="text-4xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
        Subscription Activated!
      </h1>
      <p className="text-lg text-zinc-700 dark:text-zinc-300 mb-2">
        Thank you for subscribing to the <strong>{session?.plan || "Premium Plan"}</strong>.
      </p>
      {session?.amount && (
        <p className="text-md text-zinc-600 dark:text-zinc-400">
          Amount charged: <strong>{session.amount}</strong>
        </p>
      )}
      <p className="mt-6 text-zinc-700 dark:text-zinc-300">
        You now have full access to all premium features.
      </p>

      <Button
        className="mt-8 bg-blue-600 hover:bg-blue-700"
        onClick={() => router.push("/user-home")}
      >
        Go to Home
      </Button>
    </div>
  );
}
