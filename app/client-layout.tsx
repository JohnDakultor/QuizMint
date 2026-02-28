"use client";

import { SessionProvider } from "next-auth/react";
import LiteModeSync from "@/components/lite-mode-sync";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <LiteModeSync />
      {children}
    </SessionProvider>
  );
}
