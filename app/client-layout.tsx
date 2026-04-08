"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import LiteModeSync from "@/components/lite-mode-sync";

type ThemePreference = "light" | "dark" | "system";

function applyAuthTheme(preference: ThemePreference) {
  const root = document.getElementById("auth-theme-root");
  const html = document.documentElement;
  const resolved =
    preference === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;

  if (root) {
    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-theme-preference", preference);
    (root as HTMLElement).style.colorScheme = resolved;
  }

  html.classList.toggle("dark", resolved === "dark");
  html.dataset.theme = resolved;
  html.dataset.themePreference = preference;
  html.style.colorScheme = resolved;
}

function getBootThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const liteMode = localStorage.getItem("quizmint_lite_mode");
  if (liteMode === "1") return "light";
  return (localStorage.getItem("quizmint-theme") as ThemePreference | null) ?? "system";
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const stored = getBootThemePreference();
    applyAuthTheme(stored);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const pref = getBootThemePreference();
      if (pref === "system") applyAuthTheme(pref);
    };
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
      const html = document.documentElement;
      html.classList.remove("dark");
      delete html.dataset.theme;
      delete html.dataset.themePreference;
      html.style.removeProperty("color-scheme");
    };
  }, []);

  return (
    <SessionProvider>
      <LiteModeSync />
      {children}
    </SessionProvider>
  );
}
