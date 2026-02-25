import type { Metadata } from "next";
import ContactForm from "@/components/public/contact-form";

export const metadata: Metadata = {
  title: "Contact QuizMintAI | Support and Business Inquiries",
  description:
    "Contact QuizMintAI for support, product feedback, policy requests, and business inquiries.",
  alternates: {
    canonical: "https://www.quizmintai.com/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            Contact Us
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Have a question, feedback, or support issue? We&apos;re here to help.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You can also email us at support@quizmintai.com
          </p>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
