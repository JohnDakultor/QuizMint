import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | QuizMintAI",
  description:
    "Privacy Policy for QuizMintAI. Learn what data we collect, how we use it, and your rights.",
  alternates: {
    canonical: "https://quizmintai.com/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-zinc-700">Last updated: February 2026</p>

      <p className="text-zinc-700">
        Your privacy is important to us. This Privacy Policy explains how
        QuizMintAI collects, uses, and protects your information.
      </p>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
        <h3 className="font-semibold">a. Information You Provide</h3>
        <ul className="list-disc list-inside text-zinc-700">
          <li>Name, email address, and account details</li>
          <li>Content you upload (text, documents, prompts)</li>
        </ul>
        <h3 className="font-semibold">b. Automatically Collected Information</h3>
        <ul className="list-disc list-inside text-zinc-700">
          <li>IP address</li>
          <li>Device and browser information</li>
          <li>Usage data (pages visited, actions taken)</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
        <ul className="list-disc list-inside text-zinc-700">
          <li>Provide and improve the service</li>
          <li>Generate quizzes, lesson plans, and related outputs</li>
          <li>Communicate with you</li>
          <li>Ensure security and prevent abuse</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">3. Cookies and Analytics</h2>
        <p className="text-zinc-700">
          We may use cookies and similar technologies for core functionality,
          analytics, and ad measurement. Third-party services may process data
          under their own policies.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">4. Advertising</h2>
        <p className="text-zinc-700">
          We may use Google AdSense and similar providers. These providers may
          place or read cookies and collect device data to deliver and measure
          ads.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">5. Data Sharing</h2>
        <p className="text-zinc-700">We do not sell personal data. We may share data:</p>
        <ul className="list-disc list-inside text-zinc-700">
          <li>With service providers needed to operate QuizMintAI</li>
          <li>When required by law or legal process</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">6. AI Processing</h2>
        <p className="text-zinc-700">
          Inputs may be processed by third-party AI providers to generate
          outputs. Do not submit confidential or sensitive information.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">7. Your Rights</h2>
        <ul className="list-disc list-inside text-zinc-700">
          <li>Access your personal data</li>
          <li>Request correction or deletion where applicable</li>
          <li>Withdraw consent where applicable</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">8. Contact</h2>
        <p className="text-zinc-700">
          Contact us via{" "}
          <a className="underline" href="/contact">
            /contact
          </a>{" "}
          for privacy-related questions.
        </p>
      </section>
    </div>
  );
}
