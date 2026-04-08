import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Teacher Workflow, Assignment, and Lesson Planning Guides | QuizMintAI",
  description:
    "Explore QuizMintAI guides for teacher workflow, assignment tracking, quiz results, intervention follow-up, quiz generation, and lesson planning.",
  alternates: {
    canonical: "https://www.quizmintai.com/resources",
  },
  openGraph: {
    title: "Teacher Workflow, Quiz, and Lesson Plan Guides | QuizMintAI",
    description:
      "Access QuizMintAI workflow, subject, and audience guides in one place.",
    url: "https://www.quizmintai.com/resources",
    type: "website",
  },
};

const guideGroups = [
  {
    title: "By Audience",
    description:
      "Browse pages tailored to private schools, tutors, and training centers.",
    pages: [
      { href: "/ai-tools-for-private-school-teachers", title: "AI Tools for Private School Teachers" },
      { href: "/ai-tools-for-tutors", title: "AI Tools for Tutors" },
      { href: "/teacher-workflow-for-training-centers", title: "Teacher Workflow for Training Centers" },
    ],
  },
  {
    title: "By Region",
    description:
      "Browse region-specific pages for teachers and education teams.",
    pages: [
      { href: "/teacher-workflow-software-saudi-arabia", title: "Teacher Workflow Software in Saudi Arabia" },
      { href: "/ai-tools-for-teachers-middle-east", title: "AI Tools for Teachers in the Middle East" },
    ],
  },
  {
    title: "Core Product Pages",
    description:
      "Start here for the broadest overview of QuizMintAI as a teaching and classroom workflow product.",
    pages: [
      { href: "/teacher-workflow-platform", title: "Teacher Workflow Platform" },
      { href: "/ai-tools-for-teachers", title: "AI Tools for Teachers" },
      { href: "/classroom-workflow-software", title: "Classroom Workflow Software" },
    ],
  },
  {
    title: "Teaching Workflow Guides",
    description:
      "Start here if you want the clearest picture of how QuizMintAI supports planning, assignments, results, and follow-up.",
    pages: [
      { href: "/classroom-quiz-workflow", title: "Classroom Quiz Workflow" },
      { href: "/assignment-tracking-for-teachers", title: "Assignment Tracking for Teachers" },
      { href: "/student-roster-and-reminders", title: "Student Roster and Reminders" },
      { href: "/quiz-results-and-reteach-workflow", title: "Quiz Results and Reteach Workflow" },
      { href: "/teacher-workspace-for-quizzes-and-lessons", title: "Teacher Workspace for Quizzes and Lessons" },
      { href: "/classroom-intervention-workflow", title: "Classroom Intervention Workflow" },
    ],
  },
  {
    title: "Subject Quiz Guides",
    description:
      "Use these pages for subject-specific quiz and classroom topics.",
    pages: [
      { href: "/science-quiz-generator", title: "Science Quiz Generator" },
      { href: "/math-quiz-generator", title: "Math Quiz Generator" },
      { href: "/history-quiz-generator", title: "History Quiz Generator" },
      { href: "/english-quiz-generator", title: "English Quiz Generator" },
      { href: "/biology-quiz-generator", title: "Biology Quiz Generator" },
      { href: "/chemistry-quiz-generator", title: "Chemistry Quiz Generator" },
      { href: "/physics-quiz-generator", title: "Physics Quiz Generator" },
      { href: "/exam-prep-quiz-generator", title: "Exam Prep Quiz Generator" },
    ],
  },
  {
    title: "More Guides",
    description:
      "These pages cover broader teacher, student, and product-focused use cases.",
    pages: [
      {
        href: "/lesson-plan-generator-for-teachers",
        title: "Lesson Plan Generator for Teachers",
      },
      {
        href: "/interactive-quiz-maker-for-students",
        title: "Interactive Quiz Maker for Students",
      },
      { href: "/quiz-generator-for-teachers", title: "Quiz Generator for Teachers" },
      { href: "/quiz-generator-for-students", title: "Quiz Generator for Students" },
      { href: "/ai-quiz-generator", title: "AI Teacher Workflow Platform" },
    ],
  },
];

export default function ResourcesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12">
      <section className="mb-10 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-100 p-8 text-center">
        <h1 className="mb-3 text-3xl font-bold text-zinc-900 md:text-4xl">
          QuizMintAI Teacher Workflow And Generator Guides
        </h1>
        <p className="mx-auto max-w-3xl text-zinc-700">
          Use this hub to explore planning, quiz generation, assignments, results review, follow-up work, and reusable teaching assets in one place.
        </p>
      </section>

      <section className="mb-10 grid gap-4 lg:grid-cols-4">
        {[
          {
            title: "Start With The Full Workflow",
            body: "Open the pages that show how QuizMintAI supports planning, assignments, results, and classroom follow-up.",
            href: "/teacher-workflow-platform",
            label: "Open Teacher Workflow",
          },
          {
            title: "Open Quiz And Lesson Tools",
            body: "Use the generator pages when you want to create quizzes or lesson plans for a specific classroom need.",
            href: "/ai-tools-for-teachers",
            label: "Open Teaching Tools",
          },
          {
            title: "Explore Classroom Software",
            body: "See how QuizMintAI can support teaching operations beyond a single generated quiz or lesson plan.",
            href: "/classroom-workflow-software",
            label: "Open Classroom Software",
          },
          {
            title: "Browse By Audience",
            body: "Find pages tailored to private schools, tutors, training centers, and regional teaching contexts.",
            href: "/ai-tools-for-private-school-teachers",
            label: "Open Audience Guides",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              Explore
            </p>
            <h2 className="mt-3 text-xl font-semibold text-zinc-900">{card.title}</h2>
            <p className="mt-2 text-sm text-zinc-600">{card.body}</p>
            <p className="mt-4 text-sm font-medium text-blue-700">{card.label}</p>
          </Link>
        ))}
      </section>

      <div className="space-y-10">
        {guideGroups.map((group) => (
          <section key={group.title} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">{group.title}</h2>
              <p className="mt-2 max-w-3xl text-sm text-zinc-600">{group.description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.pages.map((page, index) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-zinc-900 group-hover:text-blue-700 dark:text-zinc-100 dark:group-hover:text-blue-300">
                    {page.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    Open guide
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
