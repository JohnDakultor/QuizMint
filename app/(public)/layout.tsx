import Link from "next/link";
import { Sparkles, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import icon from "@/public/icon.png"
import Footer from "@/components/ui/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Navbar */}
      <nav className="flex justify-between items-center w-full max-w-6xl mx-auto px-6 py-6">
        {/* Left: Logo + Public Links */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center space-x-2 text-2xl font-bold"
          >
            {/* <Sparkles className="text-blue-500 h-6 w-6" /> */}
            <Image
              src={icon}
              alt="Logo"
              className="w-15 h-15"
            />
            <span>QuizMintAI</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
            <Link
              href="/about"
              className="hover:text-zinc-900 dark:hover:text-zinc-50 transition"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="hover:text-zinc-900 dark:hover:text-zinc-50 transition"
            >
              Contact
            </Link>
          </div>
        </div>

        {/* Right: Auth Actions */}
        <div className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Login</Link>
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" asChild>
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex flex-col items-center w-full">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}
