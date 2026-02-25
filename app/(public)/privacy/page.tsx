import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | QuizMintAI",
  description:
    "Privacy Policy for QuizMintAI. Learn what data we collect, how we use it, and your rights.",
  alternates: {
    canonical: "https://quizmintai.com/privacy",
  },
};

const sectionClass =
  "rounded-2xl border border-zinc-200/80 bg-white/80 p-6 backdrop-blur-sm dark:border-zinc-700/70 dark:bg-zinc-900/70";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <section className="mb-8 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-100 p-8 dark:border-blue-700/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
        <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Privacy Policy
        </h1>
        <p className="text-zinc-700 dark:text-zinc-300">Last updated: February 2026</p>
        <p className="mt-3 text-zinc-700 dark:text-zinc-300">
          Your privacy is important to us. This Privacy Policy explains how
          QuizMintAI collects, uses, and protects your information.
        </p>
      </section>

      <div className="space-y-4">
        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
          <h3 className="mt-3 font-semibold">a. Information You Provide</h3>
          <ul className="mt-1 list-inside list-disc text-zinc-700 dark:text-zinc-300">
            <li>Name, email address, and account details</li>
            <li>Content you upload (text, documents, prompts)</li>
          </ul>
          <h3 className="mt-3 font-semibold">b. Automatically Collected Information</h3>
          <ul className="mt-1 list-inside list-disc text-zinc-700 dark:text-zinc-300">
            <li>IP address</li>
            <li>Device and browser information</li>
            <li>Usage data (pages visited, actions taken)</li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
          <ul className="mt-2 list-inside list-disc text-zinc-700 dark:text-zinc-300">
            <li>Provide and improve the service</li>
            <li>Generate quizzes, lesson plans, and related outputs</li>
            <li>Communicate with you</li>
            <li>Ensure security and prevent abuse</li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">3. Cookies and Analytics</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            We may use cookies and similar technologies for core functionality,
            analytics, and ad measurement. Third-party services may process data
            under their own policies.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">4. Advertising</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            We may use Google AdSense and similar providers. These providers may
            place or read cookies and collect device data to deliver and measure
            ads.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">5. Data Sharing</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            We do not sell personal data. We may share data:
          </p>
          <ul className="mt-1 list-inside list-disc text-zinc-700 dark:text-zinc-300">
            <li>With service providers needed to operate QuizMintAI</li>
            <li>When required by law or legal process</li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">6. AI Processing</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Inputs may be processed by third-party AI providers to generate
            outputs. Do not submit confidential or sensitive information.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">7. Your Rights</h2>
          <ul className="mt-2 list-inside list-disc text-zinc-700 dark:text-zinc-300">
            <li>Access your personal data</li>
            <li>Request correction or deletion where applicable</li>
            <li>Withdraw consent where applicable</li>
          </ul>
        </section>

        <section className={sectionClass}>
          <h2 className="text-2xl font-semibold">8. Contact</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            Contact us via{" "}
            <Link className="underline" href="/contact">
              /contact
            </Link>{" "}
            for privacy-related questions.
          </p>
        </section>
      </div>
    </main>
  );
}
