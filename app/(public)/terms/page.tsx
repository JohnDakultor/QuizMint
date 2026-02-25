import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | QuizMintAI",
  description:
    "Terms of Service for using QuizMintAI, including acceptable use, AI content limitations, and account responsibilities.",
  alternates: {
    canonical: "https://www.quizmintai.com/terms",
  },
};

const sectionClass =
  "rounded-2xl border border-zinc-200/80 bg-white/80 p-6 backdrop-blur-sm dark:border-zinc-700/70 dark:bg-zinc-900/70";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <section className="mb-8 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-100 p-8 dark:border-blue-700/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
        <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Terms of Service
        </h1>
        <p className="text-zinc-700 dark:text-zinc-300">Last updated: February 2026</p>
        <p className="mt-3 text-zinc-700 dark:text-zinc-300">
          By accessing or using QuizMintAI, you agree to these Terms. If you do
          not agree, do not use the service.
        </p>
      </section>

      <div className="space-y-4">
        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">1. Use of the Service</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            You must be at least 13 years old to use QuizMintAI and use the
            service only for lawful purposes.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">2. Accounts</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            You are responsible for your account credentials and for activity on
            your account.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">3. AI-Generated Content</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            AI outputs may be inaccurate. You are responsible for reviewing and
            validating generated content before educational or professional use.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">4. Intellectual Property</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            QuizMintAI branding and software are owned by us. You retain ownership
            of your uploaded content and grant us a limited license to process it
            to provide the service.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">5. Payments and Plans</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Paid features are described in-app. Fees are non-refundable unless
            required by applicable law.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">6. Prohibited Activities</h2>
          <ul className="mt-2 list-inside list-disc text-zinc-700 dark:text-zinc-300">
            <li>Abusing, exploiting, or reverse engineering the service</li>
            <li>Uploading malicious, illegal, or harmful content</li>
            <li>Interfering with platform security or availability</li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">7. Termination</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            We may suspend or terminate access for violations of these Terms or
            misuse of the service.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">8. Disclaimer and Liability</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            The service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties.
            To the maximum extent allowed by law, QuizMintAI is not liable for
            indirect or consequential damages.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">9. Changes</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            We may update these Terms from time to time. Continued use of the
            service means you accept the updated Terms.
          </p>
        </section>
      </div>
    </main>
  );
}
