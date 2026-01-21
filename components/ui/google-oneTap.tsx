// "use client";

// import { useEffect } from "react";
// import { signIn } from "next-auth/react";

// declare global {
//   interface Window {
//     google?: any;
//   }
// }

// export default function GoogleOneTap() {
//   useEffect(() => {
//     // Load Google One Tap script
//     const script = document.createElement("script");
//     script.src = "https://accounts.google.com/gsi/client";
//     script.async = true;
//     script.defer = true;

//     script.onload = () => {
//       if (!window.google) return;

//       window.google.accounts.id.initialize({
//         client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
//         callback: (response: any) => {
//           // Use NextAuth to sign in with Google token
//           signIn("google", {
//             credential: response.credential,
//             redirect: true,
//             callbackUrl: "/home", // redirect after login
//           });
//         },
//         auto_select: false,
//         cancel_on_tap_outside: true,
//       });

//       window.google.accounts.id.prompt();
//     };

//     document.body.appendChild(script);

//     return () => {
//       document.body.removeChild(script);
//     };
//   }, []);

//   return null;
// }


// components/GoogleOneTap.jsx
'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleOneTap() {
  useEffect(() => {
    const initializeGoogleOneTap = () => {
      if (typeof window === 'undefined') return;

      // Load Google Identity Services script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        window.google?.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: true,
          cancel_on_tap_outside: false,
          context: 'signin',
        });

        // Display the One Tap UI
        window.google?.accounts.id.prompt((notification: { isNotDisplayed: () => string | null; isSkippedMoment: () => string | null; getNotDisplayedReason: () => any; }) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('One Tap not displayed:', notification.getNotDisplayedReason());
          }
        });
      };
    };

    const handleCredentialResponse = async (response: { credential: string | null; }) => {
      try {
        const res = await fetch('/api/auth/google-one-tap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credential: response.credential }),
        });

        if (res.ok) {
          const data = await res.json();
          // Redirect or update auth state
          window.location.reload();
        }
      } catch (error) {
        console.error('Google One-Tap error:', error);
      }
    };

    initializeGoogleOneTap();

    return () => {
      // Cleanup
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return null;
}