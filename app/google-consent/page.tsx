"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function GoogleConsent() {
  const router = useRouter();
  const { data: session, status } = useSession(); // Add status
  const [accepted, setAccepted] = useState({ terms: false, privacy: false });
  const [loading, setLoading] = useState(false);

  // Only run when session is loaded
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!session?.user?.id) return;

    fetch(`/api/userPolicyStatus?userId=${session.user.id}`)
      .then((res) => res.json())
      .then((data) => {
        setAccepted({
          terms: data.termsAccepted,
          privacy: data.privacyAccepted,
        });
      });
  }, [session, status]);

  const handleAccept = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

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
  };

  // Show loading or message if session not ready
  if (status === "loading") return <p>Loading...</p>;
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
