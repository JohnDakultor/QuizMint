"use client";
import { useEffect } from "react";
import { signIn } from "next-auth/react";

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
            // ✅ Send credential to custom API to create/update user
            const res = await fetch("/api/google_auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed to create user");

            // ✅ Optional: then sign in via NextAuth
            await signIn("google", { credential: response.credential, callbackUrl: "/home" });
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

    // ✅ Cleanup function explicitly returns void
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return null;
}
