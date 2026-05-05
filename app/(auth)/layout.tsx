import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Image from "next/image";
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
  title: "QuizMintAI | Teacher Workspace Access",
  description:
    "Sign in or create a QuizMintAI account to plan lessons, generate quizzes, assign work, review results, and follow up with students.",
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 text-slate-950 antialiased dark:bg-zinc-950 dark:text-zinc-50`}
      >
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/icon.png"
              alt="QuizMintAI logo"
              className="h-11 w-11"
              width={44}
              height={44}
              priority
            />
            <span className="text-xl font-bold">QuizMintAI</span>
          </Link>
          <Link
            href="/"
            className="hidden text-sm font-medium text-slate-600 transition hover:text-teal-800 sm:inline dark:text-zinc-300 dark:hover:text-teal-300"
          >
            Back to site
          </Link>
        </header>

        <main className="w-full px-6 pb-12">
          {children}
        </main>
      </div>
    </>
  );
}
