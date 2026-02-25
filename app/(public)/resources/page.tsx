import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Teacher and Student Quiz Guides | QuizMintAI",
  description:
    "Explore subject-specific quiz and lesson plan guides for teachers and students, including science, math, history, and exam prep.",
  alternates: {
    canonical: "https://www.quizmintai.com/resources",
  },
  openGraph: {
    title: "Teacher and Student Quiz Guides | QuizMintAI",
    description:
      "Access all QuizMintAI subject and audience guides in one place.",
    url: "https://www.quizmintai.com/resources",
    type: "website",
  },
};

const guidePages = [
  { href: "/science-quiz-generator", title: "Science Quiz Generator" },
  { href: "/math-quiz-generator", title: "Math Quiz Generator" },
  { href: "/history-quiz-generator", title: "History Quiz Generator" },
  { href: "/english-quiz-generator", title: "English Quiz Generator" },
  { href: "/biology-quiz-generator", title: "Biology Quiz Generator" },
  { href: "/chemistry-quiz-generator", title: "Chemistry Quiz Generator" },
  { href: "/physics-quiz-generator", title: "Physics Quiz Generator" },
  { href: "/exam-prep-quiz-generator", title: "Exam Prep Quiz Generator" },
  {
    href: "/lesson-plan-generator-for-teachers",
    title: "Lesson Plan Generator for Teachers",
  },
  {
    href: "/interactive-quiz-maker-for-students",
    title: "Interactive Quiz Maker for Students",
  },
];

export default function ResourcesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12">
      <section className="mb-10 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-100 p-8 text-center">
        <h1 className="mb-3 text-3xl font-bold text-zinc-900 md:text-4xl">
          QuizMintAI Resource Guides
        </h1>
        <p className="mx-auto max-w-3xl text-zinc-700">
          One hub for all teacher and student intent pages. Browse all 10
          subject and audience-specific guides.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guidePages.map((page, index) => (
          <Link
            key={page.href}
            href={page.href}
            className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
              {index + 1}
            </div>
            <h2 className="font-semibold text-zinc-900 group-hover:text-blue-700 dark:text-zinc-100 dark:group-hover:text-blue-300">
              {page.title}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Open guide
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
