"use client";

import { useEffect } from "react";
import { signIn, getSession } from "next-auth/react";

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleOneTap() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (response: any) => {
          try {
            // 1️⃣ Sign in with NextAuth
            const signInResult = await signIn("google", {
              credential: response.credential,
              redirect: false, // we will handle redirect manually
            });

            if (!signInResult?.ok) throw new Error(signInResult?.error || "Google sign in failed");

            // 2️⃣ Get user session
            const session = await getSession();
            if (!session?.user?.id) throw new Error("Unable to get user session");

            const userId = session.user.id;

            // 3️⃣ Automatically accept Terms & Privacy
            await Promise.all([
              fetch("/api/policyAcceptance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, policyType: "terms" }),
              }),
              fetch("/api/policyAcceptance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, policyType: "privacy" }),
              }),
            ]);

            // 4️⃣ Redirect after login
            window.location.href = "/home";
          } catch (err) {
            console.error("Google One Tap error:", err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.prompt();
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null;
}
