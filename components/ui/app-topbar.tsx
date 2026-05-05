"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CircleHelp, User } from "lucide-react";

type DisplayUser = {
  username: string;
  image?: string | null;
  authProvider?: string | null;
} | null;

function resolveTourId(pathname: string) {
  if (pathname === "/account") return "account";
  if (pathname === "/home") return "home-dashboard";
  if (pathname === "/workspace") return "workspace";
  if (pathname === "/classes") return "classes-workflow";
  if (pathname.startsWith("/classes/")) return "class-detail-workflow";
  if (pathname === "/library") return "library";
  if (pathname.startsWith("/assignments/")) return "assignment-workflow";
  if (pathname === "/generate-quiz") return "home-quiz";
  if (pathname === "/lessonPlan") return "lessonplan-generator";
  return null;
}

export default function AppTopbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<DisplayUser>(null);

  const tourId = useMemo(() => resolveTourId(pathname), [pathname]);

  useEffect(() => {
    fetch("/api/display-user")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="sticky top-0 z-30 mb-6">
      <div className="rounded-lg border border-slate-200 bg-white/95 px-4 py-3 text-slate-950 shadow-sm backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-white sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/home" className="flex min-w-0 items-center gap-3">
            <span
              className="topbar-logo-chip flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm dark:border-zinc-700"
            >
              <Image
                src="/icon.png"
                alt="QuizMintAI"
                width={34}
                height={34}
                className="h-8 w-8 shrink-0 object-contain"
              />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">
                Teacher workflow
              </p>
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                Plan, assign, review, follow up
              </p>
            </div>
          </Link>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/workspace"
              className="hidden h-10 items-center rounded-md bg-teal-700 px-3 text-sm font-medium text-white transition hover:bg-teal-800 lg:inline-flex"
            >
              Open Workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <div className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-950 sm:px-3">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.username || "Teacher"}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                  <User className="h-4 w-4" />
                </div>
              )}
              <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 dark:text-zinc-200 sm:block">
                {user?.username || "Teacher"}
              </span>
            </div>
            <button
              type="button"
              aria-label="Open tour"
              onClick={() => {
                if (!tourId) return;
                window.dispatchEvent(new CustomEvent("start-tour", { detail: { id: tourId } }));
              }}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:text-teal-300"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
