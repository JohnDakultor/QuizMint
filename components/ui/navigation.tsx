"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, CreditCard, User, LogOut, Sparkles } from "lucide-react";
import Image from "next/image";

export default function Navigation() {
  const pathname = usePathname();

  const tabs = [
    { href: "/user-home", icon: <Home size={24} />, label: "Home" },
    { href: "/subscription", icon: <CreditCard size={24} />, label: "Subscription" },
    { href: "/account", icon: <User size={24} />, label: "Account" },
  ];

  return (
    <>
      {/* Desktop Navigation - Oblong purple */}
      <header className="hidden sm:flex justify-center w-full py-6">
        <nav className="flex space-x-8 bg-linear-to-r from-purple-800 via-indigo-900 to-blue-800 shadow-lg rounded-full px-8 py-4 items-center w-[90%] max-w-5xl">
          <Link
            href="/user-home"
            className="flex items-center space-x-2 text-yellow-400 text-2xl font-bold"
          >
            <Sparkles className="text-blue-500 h-6 w-6" />
            <span>QuizMintAI</span>
          </Link>

          <div className="flex items-center space-x-6 ml-auto">
            {tabs.map((tab) => (
              <NavIcon
                key={tab.href}
                href={tab.href}
                icon={tab.icon}
                label={tab.label}
                active={pathname === tab.href}
              />
            ))}
            <button
              onClick={() => signOut()}
              className="flex flex-col items-center text-red-400 hover:text-red-500 transition"
            >
              <LogOut size={24} />
              <span className="text-[10px] mt-1">Logout</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-linear-to-r from-purple-800 via-indigo-900 to-blue-800 sm:hidden flex justify-around px-6 py-3 rounded-full shadow-xl w-[90%] max-w-md">
        {tabs.map((tab) => (
          <NavIcon
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

function NavIcon({
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
