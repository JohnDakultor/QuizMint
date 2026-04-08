import LandingClient from "../landing-page";
import Script from "next/script";
import GoogleOneTap from "@/components/ui/google-oneTap";
import Link from "next/link";

export const metadata = {
  title: "QuizMintAI | Teacher Workflow for Quizzes and Lesson Plans",
  description:
    "Plan lessons, generate quizzes, assign class work, track results, and run follow-up interventions with QuizMintAI's AI-powered teacher workflow platform.",
  keywords: [
    "AI quiz generator",
    "AI lesson plan generator",
    "teacher workflow platform",
    "assignment tracking for teachers",
    "quiz results and reteach workflow",
    "classroom assignment workflow",
    "lesson plan maker",
    "create quizzes",
    "online quiz maker",
    "generate quizzes AI",
    "free quiz generator",
    "QuizMintAI",
    "export quizzes",
  ],
  openGraph: {
    title: "QuizMintAI | Teacher Workflow for Quizzes and Lesson Plans",
    description:
      "Use QuizMintAI to generate quizzes and lesson plans, assign work to classes, track results, and launch reteach follow-up from one workflow.",
    url: "https://www.quizmintai.com",
    siteName: "QuizMintAI",
    type: "website",
  },
  alternates: {
    canonical: "https://www.quizmintai.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuizMintAI | Teacher Workflow for Quizzes and Lesson Plans",
    description:
      "Generate, assign, track, and improve classroom work with QuizMintAI. Free and premium tiers available.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "QuizMintAI",
    url: "https://www.quizmintai.com",
    logo: "https://www.quizmintai.com/icon.png",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "QuizMintAI",
    url: "https://www.quizmintai.com",
    description:
      "Teacher workflow platform for lesson planning, quiz generation, assignments, results, and follow-up interventions.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Teacher Workflow Platform for Quizzes, Lessons, and Assignments",
    url: "https://www.quizmintai.com",
    description:
      "Plan lessons, generate quizzes, assign class work, track results, and run follow-up interventions with QuizMintAI.",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://www.quizmintai.com",
        },
      ],
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "QuizMintAI",
    url: "https://www.quizmintai.com",
    description:
      "AI-powered teacher workflow platform for lesson planning, quiz generation, class assignments, student tracking, and follow-up interventions.",
    applicationCategory: "Education",
    operatingSystem: "Web",
    offers: [
      {
        "@type": "Offer",
        name: "Free Plan",
        price: "0.00",
        priceCurrency: "USD",
        url: "https://www.quizmintai.com/sign-up",
      },
      {
        "@type": "Offer",
        name: "Pro Plan",
        price: "15.00",
        priceCurrency: "USD",
        url: "https://www.quizmintai.com/sign-up",
      },
      {
        "@type": "Offer",
        name: "Premium Plan",
        price: "39.00",
        priceCurrency: "USD",
        url: "https://www.quizmintai.com/sign-up",
      },
    ],
  },
];

export default function HomePage() {
  return (
    <>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <LandingClient />

      <section className="mx-auto w-full max-w-7xl px-6 pb-20">
        <div className="rounded-3xl border border-blue-200/80 bg-linear-to-r from-blue-50 to-cyan-50 p-6 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-800">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Explore More Ways To Use QuizMintAI
          </h2>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            Browse the pages that show how QuizMintAI supports planning, assignments, results review, classroom follow-up, and everyday teaching work.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {[
              {
                title: "Teaching Workflows",
                description:
                  "See how QuizMintAI supports planning, assignments, results, intervention, and day-to-day teaching operations.",
                accent:
                  "border-blue-200/90 hover:border-blue-500 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:text-blue-300",
                heading: "text-blue-700 dark:text-blue-300",
                items: [
                  { href: "/teacher-workflow-platform", label: "Teacher Workflow Platform" },
                  { href: "/classroom-quiz-workflow", label: "Classroom Quiz Workflow" },
                  { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking for Teachers" },
                  { href: "/quiz-results-and-reteach-workflow", label: "Quiz Results and Reteach Workflow" },
                  { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace for Quizzes and Lessons" },
                  { href: "/classroom-intervention-workflow", label: "Classroom Intervention Workflow" },
                  { href: "/classroom-workflow-software", label: "Classroom Workflow Software" },
                ],
              },
              {
                title: "Generators And Guides",
                description:
                  "Start with quiz and lesson creation, then branch into subject guides, teaching tools, and the full resource library.",
                accent:
                  "border-zinc-200 hover:border-cyan-400 hover:text-cyan-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:text-cyan-300",
                heading: "text-cyan-700 dark:text-cyan-300",
                items: [
                  { href: "/quiz-generator-for-teachers", label: "Quiz Generator for Teachers" },
                  { href: "/lesson-plan-generator-for-teachers", label: "Lesson Plan Generator for Teachers" },
                  { href: "/ai-tools-for-teachers", label: "AI Tools for Teachers" },
                  { href: "/science-quiz-generator", label: "Science Quiz Generator" },
                  { href: "/math-quiz-generator", label: "Math Quiz Generator" },
                  { href: "/ai-quiz-generator", label: "AI Quiz + Lesson Plans" },
                  { href: "/resources", label: "Browse All Guides" },
                ],
              },
            ].map((group) => (
              <div
                key={group.title}
                className="rounded-2xl border border-white/70 bg-white/55 p-5 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/50"
              >
                <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${group.heading}`}>
                  {group.title}
                </p>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {group.description}
                </p>
                <div className="mt-5 grid gap-3">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-xl border bg-white px-4 py-3 text-sm font-medium text-zinc-800 transition dark:bg-zinc-900 ${group.accent}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GoogleOneTap />
    </>
  );
}
