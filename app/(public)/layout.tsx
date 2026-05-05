"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Footer from "@/components/ui/footer";

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/teacher-workflow-platform", label: "Workflow" },
  { href: "/lesson-plan-generator-for-teachers", label: "Lesson Plans" },
  { href: "/quiz-generator-for-teachers", label: "Quizzes" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/resources", label: "Resources" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isStudentQuizScreen =
    pathname?.startsWith("/quiz/") || pathname?.startsWith("/assignment/") || false;

  if (isStudentQuizScreen) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/90">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex min-w-0 items-center gap-8">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-xl font-bold"
            >
              <Image
                src="/icon.png"
                alt="QuizMintAI logo"
                className="h-11 w-11"
                width={44}
                height={44}
                priority
              />
              <span>QuizMintAI</span>
            </Link>

            <div className="hidden items-center gap-5 text-sm font-medium text-slate-600 lg:flex dark:text-zinc-300">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-teal-800 dark:hover:text-teal-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button className="bg-teal-700 text-white hover:bg-teal-800" asChild>
              <Link href="/sign-up">Start Free</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex flex-col items-center w-full">
        {children}
      </main>

      <Footer />
    </>
  );
}
