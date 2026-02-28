"use client";

import { useEffect } from "react";

function applyLiteMode(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-lite-mode", enabled ? "true" : "false");
}

export default function LiteModeSync() {
  useEffect(() => {
    const fromStorage = localStorage.getItem("quizmint_lite_mode");
    if (fromStorage === "1" || fromStorage === "0") {
      applyLiteMode(fromStorage === "1");
    }

    let ignore = false;
    fetch("/api/user", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (ignore || !data?.user) return;
        const enabled = Boolean(data.user.liteMode);
        localStorage.setItem("quizmint_lite_mode", enabled ? "1" : "0");
        applyLiteMode(enabled);
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  return null;
}
