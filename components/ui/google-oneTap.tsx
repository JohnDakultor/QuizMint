"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleOneTap() {
  useEffect(() => {
    // Load the Google One Tap script dynamically
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
            const res = await fetch("/api/google_auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });
            if (res.ok) window.location.href = "/home";
          } catch (err) {
            console.error("Google One Tap error", err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Show One Tap prompt
      window.google.accounts.id.prompt();
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null;
}
