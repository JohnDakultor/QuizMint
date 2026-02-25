import Link from "next/link";
import type { Metadata } from "next";

type FaqItem = {
  question: string;
  answer: string;
};

type LandingTemplateProps = {
  title: string;
  subtitle: string;
  featureTitle: string;
  features: string[];
  useCasesTitle: string;
  useCases: string[];
  faq: FaqItem[];
  ctaText: string;
  ctaHref?: string;
  relatedLinks?: { href: string; label: string }[];
};

export function createLandingMetadata(params: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = `https://quizmintai.com${params.path}`;
  return {
    title: params.title,
    description: params.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: params.title,
      description: params.description,
      url,
      type: "website",
    },
  };
}

export default function LandingTemplate({
  title,
  subtitle,
  featureTitle,
  features,
  useCasesTitle,
  useCases,
  faq,
  ctaText,
  ctaHref = "/sign-up",
  relatedLinks = [
    { href: "/resources", label: "All Guides (10)" },
    { href: "/ai-quiz-generator", label: "AI Quiz + Lesson Plans" },
    { href: "/quiz-generator-for-teachers", label: "Quiz Generator for Teachers" },
    { href: "/interactive-quiz-maker-for-students", label: "Interactive Quiz Maker for Students" },
  ],
}: LandingTemplateProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <section className="mb-12 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-8 text-center">
        <h1 className="mb-3 text-3xl font-bold text-zinc-900 md:text-4xl">{title}</h1>
        <p className="mx-auto max-w-3xl text-base text-zinc-700 md:text-lg">{subtitle}</p>
      </section>

      <section className="mb-10 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-2xl font-semibold text-zinc-900">{featureTitle}</h2>
        <ul className="list-disc space-y-2 pl-6 text-zinc-700">
          {features.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-10 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-2xl font-semibold text-zinc-900">{useCasesTitle}</h2>
        <ul className="list-disc space-y-2 pl-6 text-zinc-700">
          {useCases.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-10 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-2xl font-semibold text-zinc-900">FAQ</h2>
        <div className="space-y-4">
          {faq.map((item) => (
            <div key={item.question}>
              <h3 className="font-semibold text-zinc-900">{item.question}</h3>
              <p className="text-zinc-700">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-2xl font-semibold text-zinc-900">Related Pages</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {relatedLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-blue-400 hover:text-blue-700"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-cyan-50 to-sky-50 p-8 text-center">
        <h2 className="mb-4 text-2xl font-semibold text-zinc-900">Ready to build faster?</h2>
        <Link
          href={ctaHref}
          className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          {ctaText}
        </Link>
      </section>
    </main>
  );
}
