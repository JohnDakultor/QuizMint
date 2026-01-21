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
    // Load Google One Tap script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: (response: any) => {
          // Use NextAuth to sign in with Google token
          signIn("google", {
            credential: response.credential,
            redirect: true,
            callbackUrl: "/home", // redirect after login
          });
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
