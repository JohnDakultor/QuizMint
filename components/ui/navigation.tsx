"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ChevronLeft,
  CircleHelp,
  CreditCard,
  Ellipsis,
  Home,
  LogOut,
  Menu,
  Presentation,
  Sparkles,
  User,
} from "lucide-react";
import ThemeToggle from "@/components/ui/theme-toggle";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    username: string;
    image?: string | null;
    authProvider?: string | null;
  } | null>(null);

  const tourId =
    pathname === "/account"
      ? "account"
      : pathname === "/home"
      ? "home-dashboard"
      : pathname === "/generate-quiz"
      ? "home-quiz"
      : pathname === "/lessonPlan"
      ? "lessonplan-generator"
      : null;

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
    document.documentElement.style.setProperty("--sidebar-width", collapsed ? "5rem" : "16rem");
  }, [collapsed]);

  useEffect(() => {
    fetch("/api/display-user")
      .then((res) => res.ok && res.json())
      .then((data) => setUser(data?.user))
      .catch(console.error);
  }, []);

  const tabs = [
    { href: "/home", icon: <Home size={22} />, label: "Dashboard" },
    { href: "/generate-quiz", icon: <Sparkles size={22} />, label: "Generate Quiz" },
    { href: "/subscription", icon: <CreditCard size={22} />, label: "Subscription" },
    { href: "/lessonPlan", icon: <Presentation size={22} />, label: "Lesson Plan" },
    { href: "/account", icon: <User size={22} />, label: "Account" },
  ];
  const mobilePrimaryTabs = tabs.filter((t) =>
    ["/home", "/generate-quiz", "/lessonPlan", "/account"].includes(t.href),
  );

  useEffect(() => {
    const routesToWarm = [...new Set([...tabs.map((tab) => tab.href), "/support"])];
    routesToWarm.forEach((href) => {
      if (href !== pathname) {
        router.prefetch(href);
      }
    });
  }, [pathname, router]);

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-screen border-r border-white/15 bg-linear-to-b from-[#0b1020] via-[#111a3c] to-[#1d1e52] shadow-[0_16px_40px_-16px_rgba(2,6,23,0.95)] transition-all duration-300 sm:flex ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex h-full w-full flex-col p-4">
          <div className="mb-6 flex items-center justify-between">
            {!collapsed && (
              <Link href="/home" className="flex items-center gap-2 text-lg font-bold text-white">
                <Image
                  src="/icon.png"
                  alt="Logo"
                  className="h-10 w-10 rounded-full bg-white/95 p-1 shadow-md"
                  width={40}
                  height={40}
                />
                <span className="bg-linear-to-r from-amber-200 via-yellow-100 to-sky-100 bg-clip-text text-transparent">
                  QuizMintAI
                </span>
              </Link>
            )}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-lg p-1 text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              {collapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
            </button>
          </div>

          {!collapsed && user && (
            <div className="mb-4 truncate rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-2">
                {user.image ? (
                  <img src={user.image} alt="Profile" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                    <User size={16} />
                  </div>
                )}
                <span className="truncate">{user.username}</span>
              </div>
            </div>
          )}

          <div className={`mb-6 ${collapsed ? "flex justify-center" : ""}`}>
            <ThemeToggle compact={collapsed} />
          </div>

          <nav className="flex flex-1 flex-col gap-2">
            {tabs.map((tab) => (
              <SidebarItem
                key={tab.href}
                {...tab}
                active={pathname === tab.href}
                collapsed={collapsed}
                onNavigate={() => router.prefetch(tab.href)}
              />
            ))}
          </nav>

          <button
            onClick={() => {
              if (!tourId) return;
              window.dispatchEvent(new CustomEvent("start-tour", { detail: { id: tourId } }));
            }}
            className={`flex items-center rounded-lg px-3 py-2 text-white/85 transition hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <CircleHelp size={22} />
            {!collapsed && <span className="text-sm">Help / Tour</span>}
          </button>

          <button
            onClick={() => signOut()}
            className={`mt-4 flex items-center rounded-lg px-3 py-2 text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200 ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <LogOut size={22} />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-[94%] max-w-md items-center justify-between rounded-2xl border border-white/15 bg-linear-to-r from-[#0b1020]/95 via-[#111a3c]/95 to-[#1d1e52]/95 px-2 py-2 shadow-2xl backdrop-blur-md sm:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 0.35rem)" }}
      >
        {mobilePrimaryTabs.map((tab) => (
          <MobileIcon
            key={tab.href}
            {...tab}
            active={pathname === tab.href}
            onNavigate={() => {
              router.prefetch(tab.href);
              setMobileMenuOpen(false);
            }}
          />
        ))}

        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className={`min-w-[56px] rounded-xl px-2 py-1 transition ${mobileMenuOpen ? "bg-amber-400 text-slate-900" : "text-white hover:bg-white/15 hover:text-white"}`}
        >
          <div className="flex flex-col items-center justify-center">
            <Ellipsis size={20} />
            <span className="mt-1 text-[9px]">More</span>
          </div>
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute bottom-24 right-3 w-56 space-y-1 rounded-xl border border-slate-700/70 bg-slate-950/95 p-2 text-slate-200 shadow-xl">
            {user && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-2 text-sm">
                {user.image ? (
                  <img src={user.image} alt="Profile" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700">
                    <User size={14} />
                  </div>
                )}
                <span className="truncate">{user.username}</span>
              </div>
            )}
            <Link
              href="/subscription"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-800"
            >
              <CreditCard size={16} />
              Subscription
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (tourId) {
                  window.dispatchEvent(new CustomEvent("start-tour", { detail: { id: tourId } }));
                }
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-800"
            >
              <CircleHelp size={16} />
              Help / Tour
            </button>
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
            >
              <LogOut size={16} />
              Logout
            </button>
            <div className="px-1 pt-1">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type NavItemProps = {
  href: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
};

function SidebarItem({ href, icon, label, active, collapsed, onNavigate }: NavItemProps) {
  return (
    <Link
      href={href}
      onMouseEnter={onNavigate}
      onFocus={onNavigate}
      className={`flex items-center rounded-lg px-3 py-3 transition ${collapsed ? "justify-center" : "gap-3"} ${active ? "bg-white text-slate-900 shadow-sm" : "text-white/95 hover:bg-white/15 hover:text-white"}`}
    >
      {icon}
      {!collapsed && <span className="text-sm">{label}</span>}
    </Link>
  );
}

function MobileIcon({ href, icon, label, active, onNavigate }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      onMouseEnter={onNavigate}
      onFocus={onNavigate}
      className={`flex min-w-[56px] flex-col items-center justify-center rounded-xl px-2 py-1 text-[11px] transition ${active ? "bg-amber-300 text-slate-900" : "text-white hover:bg-white/15 hover:text-white"}`}
    >
      <span>{icon}</span>
      <span className="mt-1 whitespace-nowrap text-[9px]">{label}</span>
    </Link>
  );
}
