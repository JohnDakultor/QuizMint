"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gauge } from "lucide-react";

type UserResponse = {
  user?: {
    liteMode?: boolean;
  };
};

export default function LiteModeBadge({ className = "" }: { className?: string }) {
  const [liteMode, setLiteMode] = useState(false);

  useEffect(() => {
    fetch("/api/user", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UserResponse | null) => {
        setLiteMode(Boolean(data?.user?.liteMode));
      })
      .catch(() => undefined);
  }, []);

  return (
    <Link
      href="/account"
      title="Open account settings"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm transition ${className} ${
        liteMode
          ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-300 hover:shadow-md dark:border-sky-400/40 dark:bg-sky-500/20 dark:text-sky-100 dark:hover:bg-sky-400/35 dark:hover:border-sky-300 dark:hover:shadow-[0_0_0_2px_rgba(56,189,248,0.22)]"
          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:border-slate-400 dark:hover:shadow-[0_0_0_2px_rgba(148,163,184,0.2)]"
      }`}
    >
      <Gauge className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">{liteMode ? "Lite Mode On" : "Lite Mode Off"}</span>
      <span className="sm:hidden">{liteMode ? "Lite On" : "Lite Off"}</span>
    </Link>
  );
}
