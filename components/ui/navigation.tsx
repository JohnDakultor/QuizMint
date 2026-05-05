"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Ellipsis,
  GraduationCap,
  Home,
  Library,
  LogOut,
  Menu,
  Presentation,
  Sparkles,
  Workflow,
  User,
  CircleHelp,
} from "lucide-react";
import ThemeToggle from "@/components/ui/theme-toggle";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(true);
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
      : pathname === "/workspace"
      ? "workspace"
      : pathname === "/classes"
      ? "classes-workflow"
      : pathname.startsWith("/classes/")
      ? "class-detail-workflow"
      : pathname === "/library"
      ? "library"
      : pathname.startsWith("/assignments/")
      ? "assignment-workflow"
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

  const productTabs = [
    { href: "/workspace", icon: <Workflow size={20} />, label: "Workspace" },
    { href: "/generate-quiz", icon: <Sparkles size={20} />, label: "Create Quiz" },
    { href: "/lessonPlan", icon: <Presentation size={20} />, label: "Plan Lessons" },
    { href: "/classes", icon: <GraduationCap size={20} />, label: "Classes" },
    { href: "/library", icon: <Library size={20} />, label: "Teaching Library" },
    { href: "/organizations", icon: <Building2 size={20} />, label: "Organization" },
  ];
  const tabs = [
    { href: "/home", icon: <Home size={19} />, label: "Command Center" },
    { href: "/analytics", icon: <ChartNoAxesCombined size={19} />, label: "Results" },
    { href: "/subscription", icon: <CreditCard size={19} />, label: "Plans & Billing" },
    { href: "/account", icon: <User size={19} />, label: "Account" },
  ];
  const mobilePrimaryTabs = [
    { href: "/home", icon: <Home size={22} />, label: "Home" },
    { href: "/workspace", icon: <Workflow size={22} />, label: "Workspace" },
    { href: "/classes", icon: <GraduationCap size={22} />, label: "Classes" },
    { href: "/generate-quiz", icon: <Sparkles size={22} />, label: "Quiz" },
    { href: "/lessonPlan", icon: <Presentation size={22} />, label: "Plan" },
  ];
  const productsActive = productTabs.some(
    (tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
  );

  useEffect(() => {
    const routesToWarm = [
      ...new Set([...tabs.map((tab) => tab.href), ...productTabs.map((tab) => tab.href), "/support"]),
    ];
    routesToWarm.forEach((href) => {
      if (href !== pathname) {
        router.prefetch(href);
      }
    });
  }, [pathname, router]);

  useEffect(() => {
    if (productsActive) {
      setProductsOpen(true);
    }
  }, [productsActive]);

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-screen border-r border-slate-800 bg-slate-950 shadow-[0_16px_40px_-16px_rgba(2,6,23,0.95)] transition-all duration-300 sm:flex ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex h-full w-full flex-col p-4">
          <div className={`mb-5 flex ${collapsed ? "justify-center" : "justify-end"}`}>
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-lg p-1 text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              {collapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
            </button>
          </div>

          <div className={`mb-5 ${collapsed ? "flex justify-center" : ""}`}>
            <ThemeToggle compact={collapsed} />
          </div>

          <div className="flex-1">
            <nav className="flex flex-col gap-1.5">
              {tabs.map((tab) => (
                <SidebarItem
                  key={tab.href}
                  {...tab}
                  active={pathname === tab.href || pathname.startsWith(`${tab.href}/`)}
                  collapsed={collapsed}
                  onNavigate={() => router.prefetch(tab.href)}
                />
              ))}
              {collapsed ? (
                productTabs.map((tab) => (
                  <SidebarItem
                    key={tab.href}
                    href={tab.href}
                    icon={tab.icon}
                    label={tab.label}
                    active={pathname === tab.href || pathname.startsWith(`${tab.href}/`)}
                    collapsed
                    onNavigate={() => router.prefetch(tab.href)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-white/10/0 bg-transparent p-1">
                  <button
                    type="button"
                    onClick={() => setProductsOpen((current) => !current)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                      productsActive
                        ? "bg-white/12 text-white"
                        : "text-white/95 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Workflow size={17} />
                      <span className="text-[12px] font-medium">Create & Manage</span>
                    </span>
                    <ChevronDown
                      size={15}
                      className={`transition-transform ${productsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {productsOpen && (
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      {productTabs.map((tab) => (
                        <Link
                          key={tab.href}
                          href={tab.href}
                          onMouseEnter={() => router.prefetch(tab.href)}
                          onFocus={() => router.prefetch(tab.href)}
                          className={`flex min-h-[58px] flex-col items-start justify-center rounded-lg px-2.5 py-2 transition ${
                            pathname === tab.href || pathname.startsWith(`${tab.href}/`)
                              ? "bg-white/12 text-white"
                              : "text-white/95 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <span className="mb-1 flex items-center text-white/90">{tab.icon}</span>
                          <span className="text-[11px] leading-4">{tab.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          <div className="shrink-0 border-t border-white/10 pt-2.5">
            <button
              onClick={() => signOut()}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200 ${collapsed ? "justify-center" : "gap-3"}`}
            >
              <LogOut size={19} />
              {!collapsed && <span className="text-[13px]">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-[94%] max-w-md items-center justify-between rounded-2xl border border-white/15 bg-slate-950/95 px-2 py-2 shadow-2xl backdrop-blur-md sm:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 0.35rem)" }}
      >
        {mobilePrimaryTabs.map((tab) => (
          <MobileIcon
            key={tab.href}
            {...tab}
            active={pathname === tab.href || pathname.startsWith(`${tab.href}/`)}
            onNavigate={() => {
              router.prefetch(tab.href);
              setMobileMenuOpen(false);
            }}
          />
        ))}

        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className={`min-w-[56px] rounded-xl px-2 py-1 transition ${mobileMenuOpen ? "bg-teal-300 text-slate-950" : "text-white hover:bg-white/15 hover:text-white"}`}
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
              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-2 text-sm">
                {user.image ? (
                  <img
                    src={user.image}
                    alt="Profile"
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700">
                    <User size={14} />
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate">{user.username}</span>
              </div>
            )}
            <Link
              href="/subscription"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-800"
            >
              <CreditCard size={16} />
              Plans & Billing
            </Link>
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-2">
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Teaching Workspace
              </p>
              {productTabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-800"
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              ))}
            </div>
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-slate-800"
            >
              <User size={16} />
              Account
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
  inset?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
};

function SidebarItem({ href, icon, label, active, collapsed, inset, compact, onNavigate }: NavItemProps) {
  return (
    <Link
      href={href}
      onMouseEnter={onNavigate}
      onFocus={onNavigate}
      className={`flex items-center rounded-lg px-2.5 py-2.5 transition ${
        collapsed ? "justify-center" : compact ? "gap-2.5 px-2.5 py-2" : "gap-3"
      } ${inset && !collapsed ? "ml-2" : ""} ${
        active ? "bg-white/12 text-white" : "text-white/95 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className={collapsed ? "scale-90 transform" : ""}>{icon}</span>
      {!collapsed && <span className={compact ? "text-[12px]" : "text-[13px]"}>{label}</span>}
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
      className={`flex min-w-[56px] flex-col items-center justify-center rounded-xl px-2 py-1 text-[11px] transition ${active ? "bg-teal-300 text-slate-950" : "text-white hover:bg-white/15 hover:text-white"}`}
    >
      <span>{icon}</span>
      <span className="mt-1 whitespace-nowrap text-[9px]">{label}</span>
    </Link>
  );
}
