import type { Metadata } from "next";
import ContactForm from "@/components/public/contact-form";
import {
  Building2,
  GraduationCap,
  LifeBuoy,
  MessageSquareText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Contact QuizMintAI | Organization Plans, Support, and Onboarding",
  description:
    "Contact QuizMintAI about organization plans, school and training-center onboarding, teacher workflow support, product questions, and billing inquiries.",
  alternates: {
    canonical: "https://www.quizmintai.com/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="w-full bg-slate-50 px-6 py-16 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-700 dark:text-teal-300">
              Contact QuizMintAI
            </p>
            <h1 className="mt-3 max-w-2xl text-5xl font-bold leading-tight text-slate-950 dark:text-zinc-50">
              Talk with us about your teacher workflow.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-zinc-300">
              Reach out for organization pricing, school or training-center
              onboarding, workflow questions, billing help, or product support.
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-zinc-400">
              Prefer email? Contact us at{" "}
              <a
                href="mailto:support@quizmintai.com"
                className="font-medium text-teal-800 hover:underline dark:text-teal-300"
              >
                support@quizmintai.com
              </a>
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: Building2,
                  title: "Organization plans",
                  body: "For schools, departments, tutoring teams, and training centers.",
                },
                {
                  icon: GraduationCap,
                  title: "Teacher onboarding",
                  body: "Get help rolling out quizzes, lesson plans, assignments, and results review.",
                },
                {
                  icon: LifeBuoy,
                  title: "Support and billing",
                  body: "Ask about accounts, subscriptions, exports, or workspace access.",
                },
                {
                  icon: MessageSquareText,
                  title: "Product questions",
                  body: "Tell us what workflow you are trying to support.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-semibold text-slate-950 dark:text-zinc-50">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <ContactForm />
          </div>
        </section>

        <section className="mt-14 rounded-lg bg-slate-950 p-6 text-white md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold uppercase text-teal-300">
                Best for
              </p>
              <p className="mt-2 text-lg font-semibold">
                Schools, training centers, tutoring teams, and active teachers.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-teal-300">
                We can discuss
              </p>
              <p className="mt-2 text-lg font-semibold">
                Seats, billing, onboarding, exports, workflow setup, and support.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase text-teal-300">
                Helpful context
              </p>
              <p className="mt-2 text-lg font-semibold">
                Team size, subjects, grade levels, and the workflow you want to improve.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
