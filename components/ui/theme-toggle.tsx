"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "quizmint-theme";

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }
  return preference;
}

function applyTheme(preference: ThemePreference) {
  if (typeof document === "undefined") return;
  const root = document.getElementById("auth-theme-root");
  const html = document.documentElement;
  const resolved = resolveTheme(preference);

  if (root) {
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    (root as HTMLElement).style.colorScheme = resolved;
  }

  html.classList.toggle("dark", resolved === "dark");
  html.dataset.theme = resolved;
  html.dataset.themePreference = preference;
  html.style.colorScheme = resolved;
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? "system";
    setThemePreference(stored);
    applyTheme(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themePreference);
    applyTheme(themePreference);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (themePreference === "system") applyTheme("system");
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, [themePreference]);

  return (
    <div
      className={`inline-flex max-w-full overflow-hidden rounded-xl border border-white/20 bg-black/20 p-1 backdrop-blur-sm ${
        compact ? "flex-col items-center gap-1" : "items-center gap-1"
      }`}
    >
      <ThemeButton
        icon={<Sun size={14} />}
        label="Light"
        selected={themePreference === "light"}
        compact={compact}
        onClick={() => setThemePreference("light")}
      />
      <ThemeButton
        icon={<Moon size={14} />}
        label="Dark"
        selected={themePreference === "dark"}
        compact={compact}
        onClick={() => setThemePreference("dark")}
      />
      <ThemeButton
        icon={<Monitor size={14} />}
        label="System"
        selected={themePreference === "system"}
        compact={compact}
        onClick={() => setThemePreference("system")}
      />
    </div>
  );
}

function ThemeButton({
  icon,
  label,
  selected,
  compact,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  selected: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
        selected
          ? "bg-white text-slate-900 shadow-sm"
          : "text-white/90 hover:bg-white/15 hover:text-white"
      } ${compact ? "w-8 justify-center px-1 py-1.5" : ""}`}
      aria-pressed={selected}
      aria-label={`Use ${label} theme`}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </button>
  );
}
