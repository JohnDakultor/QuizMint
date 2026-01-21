// pages/google-consent.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function GoogleConsent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [accepted, setAccepted] = useState({ terms: false, privacy: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    // Fetch policy status from backend
    fetch(`/api/userPolicyStatus?userId=${session.user.id}`)
      .then((res) => res.json())
      .then((data) => {
        setAccepted({
          terms: data.termsAccepted,
          privacy: data.privacyAccepted,
        });
      });
  }, [session]);

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
