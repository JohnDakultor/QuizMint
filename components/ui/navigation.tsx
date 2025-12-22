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
  Sparkles,
  Menu,
  ChevronLeft,
} from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/display-user");
        if (!res.ok) return;
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const tabs = [
    { href: "/user-home", icon: <Home size={22} />, label: "Home" },
    { href: "/subscription", icon: <CreditCard size={22} />, label: "Subscription" },
    { href: "/account", icon: <User size={22} />, label: "Account" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden sm:flex fixed left-0 top-0 h-screen bg-linear-to-b from-purple-800 via-indigo-900 to-blue-900 shadow-xl z-40 transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex flex-col w-full p-4 h-full">
          {/* Top Section */}
          <div className="flex items-center justify-between mb-6">
            {!collapsed && (
              <Link
                href="/user-home"
                className="flex items-center space-x-2 text-yellow-400 text-lg font-bold"
              >
                <Sparkles className="text-blue-400 h-5 w-5" />
                <span>QuizMintAI</span>
              </Link>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-white hover:text-yellow-400 transition"
            >
              {collapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
            </button>
          </div>

          {/* User Name */}
          {!collapsed && user && (
            <div className="flex items-center justify-between bg-white/10 px-3 py-2 rounded-lg mb-6 text-white">
              <span className="truncate font-medium ">{user.username}</span>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex flex-col space-y-2 flex-1">
            {tabs.map((tab) => (
              <SidebarItem
                key={tab.href}
                href={tab.href}
                icon={tab.icon}
                label={tab.label}
                active={pathname === tab.href}
                collapsed={collapsed}
              />
            ))}
          </nav>

          {/* Logout */}
          <button
            onClick={() => signOut()}
            className={`flex items-center ${collapsed ? "justify-center" : "space-x-3"} text-red-400 hover:text-red-500 transition mt-4 px-3 py-2 rounded-lg`}
          >
            <LogOut size={22} />
            {!collapsed && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-linear-to-r from-purple-800 via-indigo-900 to-blue-800 sm:hidden flex justify-around px-6 py-3 rounded-full shadow-xl w-[90%] max-w-md">
        {tabs.map((tab) => (
          <MobileIcon
            key={tab.href}
            href={tab.href}
            icon={tab.icon}
            label={tab.label}
            active={pathname === tab.href}
          />
        ))}
        <button
          onClick={() => signOut()}
          className="flex flex-col items-center justify-center text-red-400 hover:text-red-500 transition"
        >
          <LogOut size={22} />
          <span className="mt-0.5 text-[10px]">Logout</span>
        </button>
      </nav>
    </>
  );
}

/* Sidebar Item */
function SidebarItem({
  href,
  icon,
  label,
  active,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center ${collapsed ? "justify-center" : "space-x-3"} px-3 py-3 rounded-lg transition ${
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

/* Mobile Icon */
function MobileIcon({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center transition text-xs px-4 py-2 rounded-full ${
        active
          ? "bg-yellow-400 text-white"
          : "text-white hover:bg-yellow-400 hover:text-white"
      }`}
    >
      {icon}
      <span className="mt-1 text-[10px]">{label}</span>
    </Link>
  );
}
