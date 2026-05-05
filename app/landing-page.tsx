"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  Layers3,
  Lightbulb,
  LineChart,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Testimonial = {
  name: string;
  role: string;
  text: string;
  avatar: string;
};

function TestimonialAvatar({
  name,
}: {
  name: string;
  avatar?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white bg-teal-700 text-base font-bold text-white shadow-sm">
      {initial}
    </div>
  );
}

export default function Home() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [activeSample, setActiveSample] = useState<null | {
    title: string;
    question: string;
    options: string[];
    answer: string;
  }>(null);

  const testimonials: Testimonial[] = [
    {
      name: "Sarah M.",
      role: "High School Teacher",
      text: "This saves me hours every week. My quizzes are cleaner and smarter.",
      avatar: "https://i.pravatar.cc/160?img=47",
    },
    {
      name: "Maria L.",
      role: "Middle School Science Teacher",
      text: "I can build a quiz, assign it, and plan the next lesson without losing momentum.",
      avatar: "https://i.pravatar.cc/160?img=32",
    },
    {
      name: "Omar H.",
      role: "Private Tutor",
      text: "The follow-up quizzes make it easier to target exactly what each student still struggles with.",
      avatar: "https://i.pravatar.cc/160?img=15",
    },
    {
      name: "Nina P.",
      role: "Curriculum Coordinator",
      text: "The lesson-plan workflow helps our team prepare faster and stay more consistent across sections.",
      avatar: "https://i.pravatar.cc/160?img=5",
    },
  ];

  useEffect(() => {
    const i = setInterval(
      () => setActiveTestimonial((p) => (p + 1) % testimonials.length),
      4200,
    );
    return () => clearInterval(i);
  }, [testimonials.length]);

  const stats = [
    { value: "100", label: "free quiz points every 12 hours" },
    { value: "4", label: "workflow stages in one teacher workspace" },
    { value: "PDF", label: "teacher-ready export options inside the app" },
  ];

  const workflow = [
    {
      icon: FileText,
      title: "Bring the material",
      body: "Paste a topic, upload class content in the app, or start from a lesson idea that needs structure.",
    },
    {
      icon: ClipboardList,
      title: "Generate the work",
      body: "Create quizzes, lesson plans, slides, activities, and reusable classroom assets from one prompt.",
    },
    {
      icon: Users,
      title: "Assign and track",
      body: "Move from draft to class-linked assignments, student attempts, roster context, and result review.",
    },
    {
      icon: RefreshCw,
      title: "Follow up smarter",
      body: "Use results to plan reteach, intervention, and adaptive practice instead of starting from scratch.",
    },
  ];

  const featureRows = [
    {
      eyebrow: "Planning",
      title: "Turn a lesson idea into teachable material",
      body: "Create structured lesson plans, class activities, assessment checks, and editable outputs that match the topic you are actually teaching.",
      icon: BookOpenCheck,
      points: ["Daily lesson flow", "Export-ready material", "Reusable library"],
      tint: "bg-teal-50 text-teal-800 border-teal-200",
    },
    {
      eyebrow: "Assessment",
      title: "Generate quizzes that stay connected to class work",
      body: "Build checks for understanding, practice quizzes, formal assessments, and answer keys, then keep the work organized for classroom use.",
      icon: Target,
      points: ["Prompt-based quizzes", "Answer keys", "Question variety"],
      tint: "bg-amber-50 text-amber-800 border-amber-200",
    },
    {
      eyebrow: "Follow-up",
      title: "Use results to guide what happens next",
      body: "Review performance, spot gaps, and create follow-up activities or interventions with the same workflow that generated the original task.",
      icon: LineChart,
      points: ["Results review", "Reteach planning", "Intervention summaries"],
      tint: "bg-rose-50 text-rose-800 border-rose-200",
    },
  ];

  const sampleQuizzes = [
    {
      title: "Biology Exit Ticket",
      question: "What is the primary purpose of photosynthesis?",
      options: [
        "Store energy in roots",
        "Convert light into chemical energy",
        "Move oxygen into animal cells",
      ],
      answer: "Convert light into chemical energy",
    },
    {
      title: "History Check",
      question: "Which event marked the start of World War II in Europe?",
      options: [
        "Treaty of Versailles",
        "Invasion of Poland in 1939",
        "Attack on Pearl Harbor",
      ],
      answer: "Invasion of Poland in 1939",
    },
    {
      title: "Computer Science Warmup",
      question: "What does CPU stand for?",
      options: [
        "Central Processing Unit",
        "Computer Power Utility",
        "Core Performance Unit",
      ],
      answer: "Central Processing Unit",
    },
  ];

  const faqItems = [
    {
      q: "Is QuizMintAI only a quiz generator?",
      a: "No. QuizMintAI is built for signed-in teacher workflows across quizzes, lesson plans, assignments, class results, exports, and follow-up planning.",
    },
    {
      q: "How does the free plan work?",
      a: "Free accounts get 100 quiz points that recharge every 12 hours, so teachers can start creating inside the workspace without a public generation endpoint.",
    },
    {
      q: "Can I use it for real classroom assessment?",
      a: "Yes. You can generate drafts, review and edit them, export outputs, and use signed-in workflow features for class-linked assignments and results.",
    },
    {
      q: "Does it help after students submit work?",
      a: "Yes. QuizMintAI is built around the full teaching loop: create, assign, review results, and plan reteach or intervention from what students actually missed.",
    },
  ];

  return (
    <div className="w-full overflow-hidden bg-slate-50 text-slate-950 dark:bg-zinc-950 dark:text-zinc-50">
      <section className="relative w-full border-b border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid min-h-[calc(100vh-96px)] w-full max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200">
              <Sparkles className="mr-1 h-4 w-4" />
              AI teacher workflow platform
            </Badge>

            <h1 className="max-w-4xl text-5xl font-bold leading-[1.02] tracking-normal text-slate-950 md:text-7xl dark:text-white">
              Generate classroom work, then run the follow-up.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-zinc-300">
              QuizMintAI helps teachers create quizzes and lesson plans, assign
              work, review results, and plan reteach from one practical
              workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                className="h-12 bg-teal-700 px-6 text-white hover:bg-teal-800"
                asChild
              >
                <Link href="/sign-up">
                  Start Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button className="h-12 px-6" variant="outline" asChild>
                <Link href="/teacher-workflow-platform">See Workflow</Link>
              </Button>
            </div>
            <p className="mt-4 max-w-xl text-sm text-slate-500 dark:text-zinc-400">
              Public generation has moved behind account access so teachers can
              save, assign, export, and review work in the same place.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 shadow-2xl dark:border-zinc-800">
              <div className="rounded-md bg-white p-4 dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-zinc-800">
                  <div>
                    <p className="text-xs font-semibold uppercase text-teal-700 dark:text-teal-300">
                      Teacher Workspace
                    </p>
                    <h2 className="mt-1 text-xl font-bold">Grade 8 Biology</h2>
                  </div>
                  <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                    Live workflow
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Assigned", value: "28", icon: Users },
                    { label: "Avg score", value: "82%", icon: BarChart3 },
                    { label: "Needs reteach", value: "6", icon: Target },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <item.icon className="h-4 w-4 text-teal-700 dark:text-teal-300" />
                      <p className="mt-3 text-2xl font-bold">{item.value}</p>
                      <p className="text-xs text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3">
                  {workflow.map((step, index) => (
                    <div
                      key={step.title}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{step.title}</p>
                        <p className="line-clamp-1 text-xs text-slate-500 dark:text-zinc-400">
                          {step.body}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">
                        0{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-3 px-6 pb-10 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-3xl font-bold text-slate-950 dark:text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-20">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-700 dark:text-teal-300">
              Problems and solution
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-bold md:text-5xl">
              Teaching work should not end at generation.
            </h2>
          </div>
          <Link
            href="/sign-up"
            className="inline-flex items-center font-semibold text-teal-800 hover:text-teal-950 dark:text-teal-300"
          >
            Start free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold uppercase text-slate-500">
              Your problem
            </p>
            <h3 className="mt-3 text-2xl font-bold">
              Separate tools create separate messes.
            </h3>
            <div className="mt-6 grid gap-3">
              {[
                "Quiz drafts in one tab, lesson plans in another.",
                "Assignments tracked outside the material that created them.",
                "Results reviewed too late to shape tomorrow's lesson.",
                "Follow-up work rebuilt manually for every class.",
              ].map((item) => (
                <p
                  key={item}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-teal-200 bg-teal-950 p-6 text-white shadow-xl">
            <p className="text-sm font-semibold uppercase text-teal-200">
              QuizMintAI solution
            </p>
            <h3 className="mt-3 text-2xl font-bold">
              One workflow for the whole teaching loop.
            </h3>
            <div className="mt-6 grid gap-3">
              {[
                "Generate quizzes, lesson plans, and classroom assets.",
                "Assign work to classes and keep outputs reusable.",
                "Review student performance where the work lives.",
                "Create reteach and intervention plans from results.",
              ].map((item) => (
                <p
                  key={item}
                  className="flex items-start gap-3 rounded-md border border-white/10 bg-white/10 p-3 text-sm text-teal-50"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="w-full bg-white py-20 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-teal-700 dark:text-teal-300">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-bold md:text-5xl">
              From class material to next-step instruction.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {workflow.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-teal-800 shadow-sm dark:bg-zinc-950 dark:text-teal-300">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-300">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase text-teal-700 dark:text-teal-300">
            Platform features
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-bold md:text-5xl">
            The classroom operating layer for busy teachers.
          </h2>
        </div>
        <div className="grid gap-6">
          {featureRows.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[0.85fr_1.15fr] lg:items-center dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div>
                <Badge className={`${feature.tint} mb-4`}>
                  {feature.eyebrow}
                </Badge>
                <h3 className="text-3xl font-bold">{feature.title}</h3>
                <p className="mt-4 leading-7 text-slate-600 dark:text-zinc-400">
                  {feature.body}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-zinc-800">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-teal-800 shadow-sm dark:bg-zinc-900 dark:text-teal-300">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Workflow output</p>
                    <p className="text-xs text-slate-500">
                      Ready for classroom review
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {feature.points.map((point) => (
                    <div
                      key={point}
                      className="rounded-md border border-slate-200 bg-white p-4 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <CheckCircle2 className="mb-3 h-5 w-5 text-teal-700 dark:text-teal-300" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section
        id="testimonials"
        className="w-full bg-slate-900 py-20 text-white dark:bg-black"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-teal-300">
                Teacher proof
              </p>
              <h2 className="mt-3 text-4xl font-bold md:text-5xl">
                Built for the parts of teaching that happen after the prompt.
              </h2>
            </div>
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTestimonial}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-lg border border-white/10 bg-white/10 p-6"
                >
                  <p className="text-xl leading-8">
                    "{testimonials[activeTestimonial].text}"
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <TestimonialAvatar
                      name={testimonials[activeTestimonial].name}
                      avatar={testimonials[activeTestimonial].avatar}
                    />
                    <div>
                      <p className="font-semibold">
                        {testimonials[activeTestimonial].name}
                      </p>
                      <p className="text-sm text-zinc-300">
                        {testimonials[activeTestimonial].role}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="mt-6 flex gap-2">
                {testimonials.map((item, i) => (
                  <button
                    key={item.name}
                    type="button"
                    aria-label={`Show testimonial ${i + 1}`}
                    onClick={() => setActiveTestimonial(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === activeTestimonial
                        ? "w-10 bg-teal-300"
                        : "w-2 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-700 dark:text-teal-300">
              Writing examples
            </p>
            <h2 className="mt-3 text-4xl font-bold md:text-5xl">
              Quick classroom checks, ready to edit.
            </h2>
          </div>
          <Link
            href="/quiz-generator-for-teachers"
            className="inline-flex items-center font-semibold text-teal-800 hover:text-teal-950 dark:text-teal-300"
          >
            Open quiz generator
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {sampleQuizzes.map((sample) => (
            <button
              key={sample.title}
              type="button"
              onClick={() => setActiveSample(sample)}
              className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-5 flex items-center justify-between">
                <Badge className="border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                  {sample.title}
                </Badge>
                <ArrowRight className="h-4 w-4 text-teal-700 dark:text-teal-300" />
              </div>
              <p className="font-semibold leading-6">{sample.question}</p>
              <p className="mt-4 text-sm text-slate-500">
                Click to preview answer options
              </p>
            </button>
          ))}
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-6 py-20"
        aria-labelledby="use-cases-heading"
      >
        <h2
          id="use-cases-heading"
          className="text-center text-4xl font-bold md:text-5xl"
        >
          Explore QuizMintAI by workflow and subject.
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-center text-slate-600 dark:text-zinc-400">
          Start with the workflow pages for the full teaching flow, then open
          subject and generator pages for specific classroom needs.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {[
            {
              title: "Teaching Workflow Pages",
              icon: Layers3,
              links: [
                { href: "/classroom-quiz-workflow", label: "Classroom Quiz Workflow" },
                { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking" },
                { href: "/quiz-results-and-reteach-workflow", label: "Results and Reteach" },
                { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace" },
                { href: "/classroom-intervention-workflow", label: "Intervention Workflow" },
                { href: "/student-roster-and-reminders", label: "Roster and Reminders" },
              ],
            },
            {
              title: "Generator And Subject Pages",
              icon: GraduationCap,
              links: [
                { href: "/quiz-generator-for-teachers", label: "Quiz Generator for Teachers" },
                { href: "/lesson-plan-generator-for-teachers", label: "Lesson Plan Generator" },
                { href: "/science-quiz-generator", label: "Science Quiz Generator" },
                { href: "/math-quiz-generator", label: "Math Quiz Generator" },
                { href: "/history-quiz-generator", label: "History Quiz Generator" },
                { href: "/resources", label: "All Resource Guides" },
              ],
            },
          ].map((group) => (
            <div
              key={group.title}
              className="rounded-lg border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200">
                  <group.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold">{group.title}</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.links.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-teal-400 hover:bg-white hover:text-teal-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:text-teal-300"
                  >
                    {page.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="w-full bg-white py-20 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase text-teal-700 dark:text-teal-300">
              Pricing
            </p>
            <h2 className="mt-3 text-4xl font-bold md:text-5xl">
              Start free, upgrade when the workflow matters.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-zinc-400">
              Choose the plan that fits your classroom workflow.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Free",
                price: "$0",
                period: "/forever",
                features: [
                  "100 quiz points every 12 hours",
                  "Create quizzes in the signed-in workspace",
                  "Limited saved assets",
                  "Basic history",
                  "Teacher-ready PDF export",
                ],
                popular: false,
              },
              {
                title: "Teacher Pro",
                price: "$15",
                period: "/month",
                features: [
                  "Full quiz generation",
                  "Full lesson-plan generation",
                  "Saved library",
                  "Classes and assignments",
                  "Standard teacher workflow",
                  "Basic reuse and duplication",
                ],
                popular: true,
              },
              {
                title: "Teacher Premium",
                price: "$39",
                period: "/month",
                features: [
                  "Advanced analytics",
                  "PDF, CSV, PPTX, and premium exports",
                  "Adaptive follow-up recommendations",
                  "Premium intervention insights",
                  "Priority queue handling",
                  "Richer reusable teaching assets",
                ],
                popular: false,
              },
              {
                title: "Organization",
                price: "Custom",
                period: "",
                features: [
                  "Shared school or team workspace",
                  "Multiple teacher accounts",
                  "Organization owner and admin controls",
                  "Central billing and access management",
                  "Team-wide workflow visibility",
                  "Priority onboarding and support",
                ],
                popular: false,
              },
            ].map((plan) => (
              <div key={plan.title} className="relative">
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                    <Badge className="border-0 bg-teal-700 text-white">
                      Most popular
                    </Badge>
                  </div>
                )}
                <Card
                  className={`h-full rounded-lg ${
                    plan.popular
                      ? "border-2 border-teal-700 bg-teal-50 shadow-xl dark:bg-teal-950/30"
                      : "border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.title}</CardTitle>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-5xl font-bold">{plan.price}</span>
                      {plan.period && (
                        <span className="text-slate-500">{plan.period}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="mb-8 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300" />
                          <span className="text-sm text-slate-600 dark:text-zinc-400">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={
                        plan.popular
                          ? "h-12 w-full bg-teal-700 text-white hover:bg-teal-800"
                          : "h-12 w-full"
                      }
                      variant={plan.popular ? "default" : "outline"}
                      asChild
                    >
                      <Link href={plan.title === "Organization" ? "/contact" : "/sign-up"}>
                        {plan.title === "Organization" ? "Contact Us" : "Get Started"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center text-4xl font-bold md:text-5xl">
          Have questions?
        </h2>
        <div className="mt-10 space-y-3">
          {faqItems.map((faq, i) => (
            <Card
              key={faq.q}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white transition hover:border-teal-300 dark:border-zinc-800 dark:bg-zinc-900"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">{faq.q}</CardTitle>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  </motion.div>
                </div>
              </CardHeader>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="pt-0 text-slate-600 dark:text-zinc-400">
                      {faq.a}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-lg bg-slate-950 p-8 text-center text-white md:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-teal-400 text-slate-950">
            <Lightbulb className="h-6 w-6" />
          </div>
          <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-bold md:text-5xl">
            Start in the workspace. Keep the whole class workflow moving.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-300">
            Create a free account to use points, save work, build lesson plans,
            assign class activities, and review student progress.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button className="h-12 bg-teal-400 px-6 text-slate-950 hover:bg-teal-300" asChild>
              <Link href="/sign-up">
                Get Started for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              className="h-12 border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
              variant="outline"
              asChild
            >
              <Link href="/teacher-workflow-platform">See Workflow</Link>
            </Button>
          </div>
        </div>
      </section>

      {activeSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="relative w-full max-w-lg rounded-lg bg-white p-8 shadow-2xl dark:bg-zinc-900">
            <Badge className="mb-4 border-teal-200 bg-teal-50 text-teal-800">
              {activeSample.title}
            </Badge>
            <p className="text-lg font-semibold">{activeSample.question}</p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-600 dark:text-zinc-400">
              {activeSample.options.map((opt) => (
                <li
                  key={opt}
                  className={
                    opt === activeSample.answer
                      ? "font-medium text-teal-700 dark:text-teal-300"
                      : ""
                  }
                >
                  {opt}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setActiveSample(null)}>
                Close
              </Button>
              <Button className="bg-teal-700 hover:bg-teal-800" asChild>
                <Link href="/sign-up">
                  Generate Your Own
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
