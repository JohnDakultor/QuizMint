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
        <div className="flex items-center gap-2">
          <Link
            href="/user-home"
            className="flex items-center space-x-2 text-2xl font-bold"
          >
            <Sparkles className="text-blue-500 h-6 w-6" />
            <span>QuizMint</span>
          </Link>
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

      {/* Page Content */}
      <main className="flex flex-col items-center w-full">
        {children}
      </main>

      {/* Footer */}
      <Separator className="my-16 max-w-6xl mx-auto" />
      <footer className="text-center mb-6 text-sm text-zinc-500">
        © {new Date().getFullYear()} QuizMint

        <div className="mt-2">
          <Link href="/terms">Terms of Service</Link> |{" "}
          <Link href="/privacy">Privacy Policy</Link>
        </div>
      </footer>
    </>
  );
}
