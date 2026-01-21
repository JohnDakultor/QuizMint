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

import { useEffect, useState, useRef } from 'react';

interface CredentialResponse {
  credential: string;
  select_by?: string;
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
      allowed_parent_origin?: string;
    }) => void;
    prompt: (callback?: (notification: any) => void) => void;
  };
}

declare global {
  interface Window {
    google?: GoogleAccounts;
    googleOneTapInitialized?: boolean;
    handleCredentialResponse?: (response: CredentialResponse) => void;
  }
}

export default function GoogleOneTap() {
  const [showFallback, setShowFallback] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const initializedRef = useRef(false);

  const addDebug = (message: string) => {
    console.log(`[OneTap] ${message}`);
    setDebugInfo(prev => [...prev.slice(-9), message]); // Keep last 10 messages
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (initializedRef.current) return; // Prevent double initialization
    if (window.googleOneTapInitialized) return; // Prevent multiple instances
    
    initializedRef.current = true;
    window.googleOneTapInitialized = true;
    
    addDebug('Initializing Google One-Tap...');
    addDebug(`Client ID: ${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 20)}...`);
    addDebug(`Origin: ${window.location.origin}`);

    // Prevent other scripts from interfering
    const originalWindowGoogle = window.google;
    
    const handleCredentialResponse = async (response: CredentialResponse) => {
      addDebug('Credential received');
      console.log('Google response:', response);
      
      try {
        const res = await fetch('/api/auth/google-one-tap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential }),
        });

        if (res.ok) {
          const data = await res.json();
          addDebug(`Auth success: ${data.email}`);
          if (data.success) {
            window.location.href = data.redirectTo || '/dashboard';
          }
        } else {
          const error = await res.json();
          addDebug(`Auth failed: ${error.error}`);
        }
      } catch (error) {
        addDebug(`Network error: ${error}`);
      }
    };

    // Set global callback
    window.handleCredentialResponse = handleCredentialResponse;

    // Check if script already loaded
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      addDebug('Script already exists, reusing...');
      setTimeout(() => initializeOneTap(), 100);
    } else {
      loadGoogleScript();
    }

    function loadGoogleScript() {
      addDebug('Loading Google Identity script...');
      
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = 'google-one-tap-script';
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        addDebug('Google script loaded');
        setTimeout(() => initializeOneTap(), 100);
      };
      
      script.onerror = (error) => {
        addDebug(`Failed to load script: ${error}`);
        setShowFallback(true);
      };
      
      // Add to head instead of body to ensure proper loading
      document.head.appendChild(script);
    }

    function initializeOneTap() {
      addDebug('Attempting to initialize...');
      
      // Check if window.google is available
      if (!window.google) {
        addDebug('ERROR: window.google not available');
        setShowFallback(true);
        return;
      }

      try {
        // IMPORTANT: Use simpler configuration first
        window.google.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
          callback: handleCredentialResponse,
          auto_select: true, // Enable auto-select
          cancel_on_tap_outside: false, // Don't cancel on tap outside
          context: 'signup', // Use 'signup' for landing page
          ux_mode: 'popup',
          itp_support: true,
          // REMOVED: use_fedcm_for_prompt: true, // Remove this for now
          allowed_parent_origin: window.location.origin,
        });
        
        addDebug('Google One-Tap initialized successfully');
        
        // Show One-Tap after a delay
        setTimeout(() => {
          try {
            addDebug('Prompting One-Tap...');
            window.google?.id.prompt((notification: any) => {
              if (!notification) {
                addDebug('No notification received');
                return;
              }
              
              if (notification.isDisplayed?.()) {
                addDebug('One-Tap is displayed!');
              }
              
              if (notification.isNotDisplayed?.()) {
                const reason = notification.getNotDisplayedReason?.();
                addDebug(`Not displayed: ${reason}`);
                if (reason === 'unregistered_origin') {
                  addDebug('ERROR: Domain not authorized in Google Cloud Console');
                }
              }
            });
          } catch (error) {
            addDebug(`Error prompting: ${error}`);
          }
        }, 2000); // Wait 2 seconds before showing
        
      } catch (error) {
        addDebug(`Initialization error: ${error}`);
        setShowFallback(true);
      }
    }

    // Cleanup
    return () => {
      const script = document.getElementById('google-one-tap-script');
      if (script) script.remove();
      delete window.handleCredentialResponse;
      delete window.googleOneTapInitialized;
      
      // Restore original if we modified it
      if (originalWindowGoogle) {
        window.google = originalWindowGoogle;
      }
    };
  }, []);

  return (
    <>
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && debugInfo.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          fontSize: '11px',
          maxHeight: '200px',
          overflow: 'auto',
          zIndex: 9999,
          maxWidth: '300px',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <strong>One-Tap Debug</strong>
            <button 
              onClick={() => setDebugInfo([])}
              style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
          {debugInfo.map((info, i) => (
            <div key={i} style={{ marginBottom: '2px', borderBottom: '1px solid #333', paddingBottom: '2px' }}>
              {info}
            </div>
          ))}
        </div>
      )}

      {/* Fallback button */}
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
          zIndex: 9998,
          maxWidth: '300px'
        }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '500' }}>
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
            data-theme="filled_blue"
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
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

    </>
  );
}