import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Image from "next/image";
import icon from "@/public/icon.png"

import { Sparkles } from "lucide-react";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuizMint | Auth",
  description: "Sign in or create an account for QuizMint AI Quiz Generator",
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 flex flex-col min-h-screen`}
      >
        {/* Minimal Top Branding */}
        <header className="flex justify-center py-8">
          <Link href="/" className="flex items-center gap-2">
            {/* <Sparkles className="text-blue-500 h-6 w-6" /> */}
            <Image
                          src={icon}
                          alt="Logo"
                          className="w-15 h-15"
                        />
            <span className="font-bold text-xl">QuizMint</span>
          </Link>
        </header>

        {/* Centered Auth Content */}
        <main className="flex flex-1 items-center justify-center w-full px-6">
          {children}
        </main>
      </div>
    </>
  );
}
