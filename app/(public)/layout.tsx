import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
            <Sparkles className="text-blue-500 h-6 w-6" />
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
      <Separator className="my-16 max-w-6xl mx-auto" />
      <footer className="text-center mb-6 text-sm text-zinc-500">
        © {new Date().getFullYear()} QuizMintAI

        <div className="mt-2 space-x-3">
          <Link href="/about" className="hover:underline">
            About
          </Link>
          <span>·</span>
          <Link href="/contact" className="hover:underline">
            Contact
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </>
  );
}
