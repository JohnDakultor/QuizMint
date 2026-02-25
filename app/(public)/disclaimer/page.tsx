import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer | QuizMintAI",
  description:
    "Important disclaimers for QuizMintAI, including AI-generated content accuracy, advertising disclosure, and educational-use guidance.",
  alternates: {
    canonical: "https://quizmintai.com/disclaimer",
  },
};

const sectionClass =
  "rounded-2xl border border-zinc-200/80 bg-white/80 p-6 backdrop-blur-sm dark:border-zinc-700/70 dark:bg-zinc-900/70";

export default function DisclaimerPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <section className="mb-8 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-100 p-8 dark:border-blue-700/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
        <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Disclaimer
        </h1>
        <p className="text-zinc-700 dark:text-zinc-300">Last updated: February 2026</p>
      </section>

      <div className="space-y-4">
        <section className={sectionClass}>
          <h2 className="text-xl font-semibold">Educational Purpose</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            QuizMintAI is an educational productivity tool. Generated quizzes,
            lesson plans, and slide content are provided for guidance and should be
            reviewed by a teacher, trainer, or qualified professional before use.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-xl font-semibold">AI-Generated Content</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            AI outputs may contain errors, outdated facts, or incomplete context.
            You are responsible for validating facts, citations, and suitability
            for your classroom, learners, and curriculum standards.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-xl font-semibold">Advertising Disclosure</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            QuizMintAI may display ads from third-party providers, including Google
            AdSense. Ad providers may use cookies and similar technologies to
            deliver and measure ads according to their own policies.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-xl font-semibold">No Professional Advice</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Content on this website is not legal, medical, financial, or
            professional advice. Always consult qualified professionals where
            necessary.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            If you have compliance or policy concerns, contact us via{" "}
            <Link className="underline" href="/contact">
              /contact
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
