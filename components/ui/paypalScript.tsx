"use client";

import { ReactNode } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

type PaypalProviderProps = {
  children: ReactNode;
};

export default function PaypalProvider({ children }: PaypalProviderProps) {
  // Use NEXT_PUBLIC_PAYPAL_CLIENT_ID for client-side env
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      "Missing NEXT_PUBLIC_PAYPAL_CLIENT_ID in your .env.local file"
    );
  }

  return (
    <PayPalScriptProvider
      options={{
         clientId, // ✅ required
        intent: "subscription",
        vault: true,
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
