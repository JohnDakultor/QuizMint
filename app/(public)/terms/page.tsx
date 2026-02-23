import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | QuizMintAI",
  description:
    "Terms of Service for using QuizMintAI, including acceptable use, AI content limitations, and account responsibilities.",
  alternates: {
    canonical: "https://quizmintai.com/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="text-zinc-700">Last updated: February 2026</p>

      <p className="text-zinc-700">
        By accessing or using QuizMintAI, you agree to these Terms. If you do
        not agree, do not use the service.
      </p>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">1. Use of the Service</h2>
        <p className="text-zinc-700">
          You must be at least 13 years old to use QuizMintAI and use the
          service only for lawful purposes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">2. Accounts</h2>
        <p className="text-zinc-700">
          You are responsible for your account credentials and for activity on
          your account.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">3. AI-Generated Content</h2>
        <p className="text-zinc-700">
          AI outputs may be inaccurate. You are responsible for reviewing and
          validating generated content before educational or professional use.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">4. Intellectual Property</h2>
        <p className="text-zinc-700">
          QuizMintAI branding and software are owned by us. You retain ownership
          of your uploaded content and grant us a limited license to process it
          to provide the service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">5. Payments and Plans</h2>
        <p className="text-zinc-700">
          Paid features are described in-app. Fees are non-refundable unless
          required by applicable law.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">6. Prohibited Activities</h2>
        <ul className="list-disc list-inside text-zinc-700">
          <li>Abusing, exploiting, or reverse engineering the service</li>
          <li>Uploading malicious, illegal, or harmful content</li>
          <li>Interfering with platform security or availability</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">7. Termination</h2>
        <p className="text-zinc-700">
          We may suspend or terminate access for violations of these Terms or
          misuse of the service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">8. Disclaimer and Liability</h2>
        <p className="text-zinc-700">
          The service is provided "AS IS" and "AS AVAILABLE" without warranties.
          To the maximum extent allowed by law, QuizMintAI is not liable for
          indirect or consequential damages.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold">9. Changes</h2>
        <p className="text-zinc-700">
          We may update these Terms from time to time. Continued use of the
          service means you accept the updated Terms.
        </p>
      </section>
    </div>
  );
}
