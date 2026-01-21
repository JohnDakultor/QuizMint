// components/ConsentForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function ConsentForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
      await Promise.all([
        fetch("/api/policyAcceptance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.user.id, policyType: "terms" }),
        }),
        fetch("/api/policyAcceptance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.user.id, policyType: "privacy" }),
        }),
      ]);

      router.push("/home");
    } catch (err) {
      console.error("Policy acceptance failed:", err);
      setLoading(false);
    }
  };

  if (status === "loading") return <p>Loading session...</p>;
  if (status !== "authenticated") return <p>Please sign in first.</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Consent Required</h1>
      <p>Please accept our Terms of Service and Privacy Policy to continue.</p>
      <Button onClick={handleAccept} disabled={loading} className="mt-4">
        Accept and Continue
      </Button>
    </div>
  );
}
