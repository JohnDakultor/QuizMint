"use client";

import { useEffect } from "react";

function applyLiteMode(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-lite-mode", enabled ? "true" : "false");
}

function applyLiteThemeOverride(enabled: boolean) {
  if (typeof document === "undefined" || typeof localStorage === "undefined") return;
  if (!enabled) return;
  const root = document.getElementById("auth-theme-root");
  const html = document.documentElement;
  const resolved = "light";

  if (root) {
    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-theme-preference", resolved);
    (root as HTMLElement).style.colorScheme = resolved;
  }

  html.classList.remove("dark");
  html.dataset.theme = resolved;
  html.dataset.themePreference = resolved;
  html.style.colorScheme = resolved;
  localStorage.setItem("quizmint-theme", resolved);
}

export default function LiteModeSync() {
  useEffect(() => {
    const fromStorage = localStorage.getItem("quizmint_lite_mode");
    if (fromStorage === "1" || fromStorage === "0") {
      const enabled = fromStorage === "1";
      applyLiteMode(enabled);
      applyLiteThemeOverride(enabled);
    }

    let ignore = false;
    fetch("/api/user", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (ignore || !data?.user) return;
        const enabled = Boolean(data.user.liteMode);
        localStorage.setItem("quizmint_lite_mode", enabled ? "1" : "0");
        applyLiteMode(enabled);
        applyLiteThemeOverride(enabled);
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  return null;
}
