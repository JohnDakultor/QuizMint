import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuizMint | AI Quiz Generator",
  description:
    "Turn any text, document, or lesson into an interactive quiz instantly using AI.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8981480808378326"
     crossOrigin="anonymous"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-linear-to-b from-white to-zinc-50 dark:from-black dark:to-zinc-900 text-zinc-900 dark:text-zinc-50`}
      >
        {/* ✅ Navbar */}
        <nav className="flex justify-between items-center w-full max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-2">
            <Sparkles className="text-blue-500 h-6 w-6" />
            <span className="font-bold text-xl">QuizMint</span>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Login</Link>
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <Link href="/sign-up">Sign Up</Link>
            </Button>
          </div>
        </nav>

        {/* ✅ Page Content */}
        <main className="flex flex-col items-center w-full">{children}</main>

        {/* ✅ Footer */}
        <Separator className="my-16 max-w-6xl mx-auto" />
        <footer className="text-center mb-6 text-sm text-zinc-500">
          © {new Date().getFullYear()} QuizMint — Built with ❤️ by Boss John
        </footer>
      </body>
    </html>
  );

  
}     