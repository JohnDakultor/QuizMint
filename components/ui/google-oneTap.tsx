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

// components/GoogleOneTap.tsx
'use client';

import { useEffect, useState } from 'react';

// Type definitions for Google Identity Services
interface CredentialResponse {
  credential: string;
  select_by?: string;
}

interface PromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
}

interface GoogleAccounts {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: CredentialResponse) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
      context?: string;
      ux_mode?: string;
      itp_support?: boolean;
      use_fedcm_for_prompt?: boolean;
      allowed_parent_origin?: string;
    }) => void;
    prompt: (callback?: (notification: PromptNotification) => void) => void;
    renderButton: (element: HTMLElement, options: any) => void;
  };
}

// Extend Window interface
declare global {
  interface Window {
    google?: GoogleAccounts;
    handleCredentialResponse?: (response: CredentialResponse) => void;
  }
}

export default function GoogleOneTap() {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if FedCM is available
    const isFedCMAvailable = 'identity' in navigator;
    
    const initializeGoogleOneTap = () => {
      // Remove any existing script
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existingScript) existingScript.remove();

      // Load Google Identity Services
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = 'google-identity-script';
      document.body.appendChild(script);

      script.onload = () => {
        if (!window.google) {
          console.error('Google Identity Services failed to load');
          setShowFallback(true);
          return;
        }

        // Initialize with FedCM opt-in
        window.google.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
          callback: handleCredentialResponse,
          auto_select: false, // Changed to false for better UX
          cancel_on_tap_outside: true,
          context: 'use',
          ux_mode: 'popup',
          itp_support: true,
          use_fedcm_for_prompt: true, // Opt-in to FedCM
          allowed_parent_origin: window.location.origin,
        });

        // Try to prompt One Tap with delay
        setTimeout(() => {
          try {
            window.google?.id.prompt((notification: PromptNotification) => {
              console.log('Google One-Tap notification:', notification);
              
              if (notification.isNotDisplayed()) {
                const reason = notification.getNotDisplayedReason();
                console.log('One Tap not displayed:', reason);
                
                // Common reasons for not showing
                if (reason === 'opt_out_or_no_session' || 
                    reason === 'suppressed_by_user' ||
                    reason === 'unregistered_origin') {
                  setShowFallback(true);
                }
              }
              
              if (notification.isSkippedMoment()) {
                const skippedReason = notification.getSkippedReason();
                console.log('One Tap skipped:', skippedReason);
                
                if (skippedReason === 'auto_cancel' || 
                    skippedReason === 'user_cancel' ||
                    skippedReason === 'tap_outside') {
                  setShowFallback(true);
                }
              }
              
              if (notification.isDisplayed()) {
                console.log('One Tap displayed successfully');
              }
            });
          } catch (error: unknown) {
            console.error('Error prompting One Tap:', error);
            setShowFallback(true);
          }
        }, 1500);
      };

      script.onerror = () => {
        console.error('Failed to load Google Identity Services script');
        setShowFallback(true);
      };
    };

    const handleCredentialResponse = async (response: CredentialResponse) => {
      console.log('Google One-Tap response received');
      
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
          console.log('Auth successful:', data);
          
          // Redirect to dashboard or reload
          if (data.success) {
            window.location.href = data.redirectTo || '/dashboard';
          }
        } else {
          const error = await res.json();
          console.error('Auth failed:', error);
          alert('Authentication failed. Please try again.');
        }
      } catch (error: unknown) {
        console.error('Google One-Tap error:', error);
        alert('Network error. Please try again.');
      }
    };

    // Set global callback for fallback button
    window.handleCredentialResponse = handleCredentialResponse;

    // Initialize Google One Tap
    initializeGoogleOneTap();

    // Check if FedCM is blocked
    const checkFedCM = async () => {
      if (isFedCMAvailable) {
        try {
          // Type assertion for experimental identity API
          const credential = await (navigator.credentials as any).get({
            identity: {
              providers: [{
                configURL: 'https://accounts.google.com/.well-known/openid-configuration',
                clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
              }]
            }
          } as CredentialRequestOptions);
          
          if (credential) {
            console.log('FedCM credential obtained:', credential);
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name === 'NotAllowedError') {
            console.warn('FedCM blocked by user or browser settings');
            setShowFallback(true);
          }
        }
      }
    };

    checkFedCM();

    return () => {
      const script = document.getElementById('google-identity-script');
      if (script) script.remove();
      
      // Clean up global callback
      delete window.handleCredentialResponse;
    };
  }, []);

  return (
    <>
      {/* One Tap will auto-display */}
      
      {/* Fallback UI if One Tap doesn't show */}
      {showFallback && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#fff',
          border: '1px solid #dadce0',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 9999,
          maxWidth: '300px'
        }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
            Sign in with Google
          </p>
          <div
            id="g_id_onload"
            data-client_id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
            data-context="signin"
            data-ux_mode="popup"
            data-callback="handleCredentialResponse"
            data-auto_prompt="false"
          />
          <div
            className="g_id_signin"
            data-type="standard"
            data-shape="rectangular"
            data-theme="outline"
            data-text="signin_with"
            data-size="large"
            data-logo_alignment="left"
            data-width="250"
          />
          <button
            onClick={() => setShowFallback(false)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}