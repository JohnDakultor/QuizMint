import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer | QuizMintAI",
  description:
    "Important disclaimers for QuizMintAI, including AI-generated content accuracy, advertising disclosure, and educational-use guidance.",
  alternates: {
    canonical: "https://quizmintai.com/disclaimer",
  },
};

export default function DisclaimerPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
      <h1 className="text-3xl font-bold">Disclaimer</h1>
      <p className="text-zinc-600 dark:text-zinc-300">
        Last updated: February 2026
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Educational Purpose</h2>
        <p className="text-zinc-700 dark:text-zinc-300">
          QuizMintAI is an educational productivity tool. Generated quizzes,
          lesson plans, and slide content are provided for guidance and should be
          reviewed by a teacher, trainer, or qualified professional before use.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">AI-Generated Content</h2>
        <p className="text-zinc-700 dark:text-zinc-300">
          AI outputs may contain errors, outdated facts, or incomplete context.
          You are responsible for validating facts, citations, and suitability
          for your classroom, learners, and curriculum standards.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Advertising Disclosure</h2>
        <p className="text-zinc-700 dark:text-zinc-300">
          QuizMintAI may display ads from third-party providers, including Google
          AdSense. Ad providers may use cookies and similar technologies to
          deliver and measure ads according to their own policies.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">No Professional Advice</h2>
        <p className="text-zinc-700 dark:text-zinc-300">
          Content on this website is not legal, medical, financial, or
          professional advice. Always consult qualified professionals where
          necessary.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-zinc-700 dark:text-zinc-300">
          If you have compliance or policy concerns, contact us via{" "}
          <a className="underline" href="/contact">
            /contact
          </a>
          .
        </p>
      </section>
    </div>
  );
}
