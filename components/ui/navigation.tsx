"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home,
  CreditCard,
  User,
  LogOut,
  Menu,
  ChevronLeft,
  Presentation,
  CircleHelp,
} from "lucide-react";
import Image from "next/image";
import icon from "@/public/icon.png";

export default function Navigation() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const tourId =
    pathname === "/account"
      ? "account"
      : pathname === "/home"
      ? "home-quiz"
      : pathname === "/lessonPlan"
      ? "lesson-plan"
      : null;

  /* Persist sidebar state */
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "5rem" : "16rem"
    );
  }, [collapsed]);

  /* Fetch user */
  useEffect(() => {
    fetch("/api/display-user")
      .then((res) => res.ok && res.json())
      .then((data) => setUser(data?.user))
      .catch(console.error);
  }, []);

  const tabs = [
    { href: "/home", icon: <Home size={22} />, label: "Home" },
    { href: "/subscription", icon: <CreditCard size={22} />, label: "Subscription" },
    { href: "/lessonPlan", icon: <Presentation size={22} />, label: "Lesson Plan" },
    { href: "/account", icon: <User size={22} />, label: "Account" },
  ];

  return (
    <>
      {/* ================= Desktop Sidebar ================= */}
      <aside
        className={`hidden sm:flex fixed left-0 top-0 h-screen z-40
        bg-linear-to-b from-purple-800 via-indigo-900 to-blue-900
        shadow-xl transition-all duration-300
        ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex flex-col w-full p-4 h-full">
          {/* Top */}
          <div className="flex items-center justify-between mb-6">
            {!collapsed && (
              <Link
                href="/home"
                className="flex items-center space-x-2 text-yellow-400 font-bold text-lg"
              >
                <Image src={icon} alt="Logo" className="w-10 h-10" />
                <span>QuizMintAI</span>
              </Link>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-white hover:text-yellow-400"
            >
              {collapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
            </button>
          </div>

          {/* User */}
          {!collapsed && user && (
            <div className="bg-white/10 text-white px-3 py-2 rounded-lg mb-6 truncate">
              {user.username}
            </div>
          )}

          {/* Links */}
          <nav className="flex flex-col gap-2 flex-1">
            {tabs.map((tab) => (
              <SidebarItem
                key={tab.href}
                {...tab}
                active={pathname === tab.href}
                collapsed={collapsed}
              />
            ))}
          </nav>

          {/* Help / Tour */}
          <button
            onClick={() =>
              tourId &&
              window.dispatchEvent(
                new CustomEvent("start-tour", { detail: { id: tourId } })
              )
            }
            className={`flex items-center px-3 py-2 rounded-lg
              text-white/90 hover:text-yellow-400 transition
              ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <CircleHelp size={22} />
            {!collapsed && <span className="text-sm">Help / Tour</span>}
          </button>

          {/* Logout */}
          <button
            onClick={() => signOut()}
            className={`flex items-center mt-4 px-3 py-2 rounded-lg
              text-red-400 hover:text-red-500 transition
              ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <LogOut size={22} />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ================= Mobile Bottom Nav ================= */}
      {/* ================= Mobile Bottom Nav ================= */}
<nav
  className="
    fixed bottom-4 inset-x-0 z-50
    sm:hidden
    w-[90%] max-w-md mx-auto
    flex justify-between items-center
    bg-linear-to-r from-purple-800 via-indigo-900 to-blue-800
    rounded-full shadow-xl
    px-4 py-2
  "
  style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 0.5rem)" }}
>
  {tabs.map((tab) => (
    <MobileIcon key={tab.href} {...tab} active={pathname === tab.href} />
  ))}

  <button
    onClick={() =>
      tourId &&
      window.dispatchEvent(
        new CustomEvent("start-tour", { detail: { id: tourId } })
      )
    }
    className="flex flex-col items-center justify-center text-white hover:text-yellow-400"
  >
    <CircleHelp size={20} />
    <span className="text-[10px] mt-1">Help</span>
  </button>

  <button
    onClick={() => signOut()}
    className="flex flex-col items-center justify-center text-red-400 hover:text-red-500"
  >
    <LogOut size={20} />
    <span className="text-[10px] mt-1">Logout</span>
  </button>
</nav>

    </>
  );
}

/* ================= Components ================= */

function SidebarItem({
  href,
  icon,
  label,
  active,
  collapsed,
}: any) {
  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-3 rounded-lg transition
        ${collapsed ? "justify-center" : "gap-3"}
        ${
          active
            ? "bg-yellow-400 text-white"
            : "text-white hover:bg-yellow-400 hover:text-white"
        }`}
    >
      {icon}
      {!collapsed && <span className="text-sm">{label}</span>}
    </Link>
  );
}

function MobileIcon({ href, icon, label, active }: any) {
  return (
    <Link
      href={href}
      className={`
        flex flex-col items-center justify-center
        px-3 py-1
        rounded-full transition
        text-xs
        ${active ? "bg-yellow-400 text-white" : "text-white hover:bg-yellow-400 hover:text-white"}
      `}
    >
      {/* Icon size smaller and consistent */}
      <span className="">{icon}</span>
      <span className="text-[10px] mt-1">{label}</span>
    </Link>
  );
}
