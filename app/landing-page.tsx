"use client";
import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  BookOpenCheck,
  Zap,
  ArrowRight,
  Copy,
  FileDown,
  Sparkles,
  Check,
  ChevronDown,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import jsPDF from "jspdf";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRecaptcha } from "@/components/ui/use-recaptcha";

type PublicQuizQuestion = {
  question: string;
  options: string[];
  answer: string;
};

type PublicQuiz = {
  title: string;
  instructions?: string;
  questions: PublicQuizQuestion[];
};

type Testimonial = {
  name: string;
  role: string;
  text: string;
  avatar: string;
};

function TestimonialAvatar({
  name,
  avatar,
}: {
  name: string;
  avatar?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase();

  if (!avatar || failed) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-linear-to-br from-blue-500 to-cyan-500 text-lg font-bold text-white shadow-md">
        {initial}
      </div>
    );
  }

  return (
    <img
      src={avatar}
      alt={name}
      className="h-14 w-14 rounded-full border border-white/70 object-cover shadow-md"
      onError={() => setFailed(true)}
    />
  );
}

/* =======================
   CORE LOGIC — UNCHANGED
======================= */

export default function Home() {
  const [text, setText] = useState("");
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState({
    count: 0,
    remaining: 3,
    nextFreeAt: null as string | null,
  });
  const quizRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  const [activeSample, setActiveSample] = useState<null | {
    title: string;
    question: string;
    options: string[];
    answer: string;
  }>(null);

  const { getToken } = useRecaptcha();

  useEffect(() => {
    if (!usage.nextFreeAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const next = new Date(usage.nextFreeAt!);
      const diff = next.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [usage.nextFreeAt]);

  useEffect(() => {
    fetch("/api/public-generate-quiz")
      .then((r) => r.ok && r.json())
      .then((d) =>
        setUsage({
          count: d.count ?? 0,
          remaining: d.remaining ?? 3,
          nextFreeAt: d.nextFreeAt ?? null,
        }),
      );
  }, []);

  useEffect(() => {
    if (quiz && quizRef.current) {
      quizRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [quiz]);

  const generateQuiz = async () => {
    if (!text.trim()) return;
    setError("");

     const recaptchaToken = await getToken("public_generate_quiz");

     
    if (usage.count >= 3) {
      setShowModal(true); // show modal when limit reached
      return;
    }

    setLoading(true);
    setQuiz(null);

    const res = await fetch("/api/public-generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, recaptchaToken }),
    });

    const data = await res.json();
    if (res.ok && data.quiz) {
      setQuiz(data.quiz as PublicQuiz);
      if (data.usage) setUsage(data.usage);
      if (data.usage?.count >= 3) setShowModal(true); // also show modal if hitting limit
    } else {
      setQuiz(null);
      setError(data.error || "Failed to generate quiz.");
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!quiz) return;
    let out = `${quiz.title}\n\n`;
    quiz.questions.forEach((q, i) => {
      out += `${i + 1}. ${q.question}\n`;
      q.options.forEach((o) => (out += `- ${o}\n`));
      out += `Answer: ${q.answer}\n\n`;
    });
    await navigator.clipboard.writeText(out);
  };

  const handleDownloadPDF = () => {
    if (!quiz) return;
    const pdf = new jsPDF();
    let y = 20;
    pdf.text(quiz.title, 10, y);
    y += 10;
    quiz.questions.forEach((q, i) => {
      pdf.text(`${i + 1}. ${q.question}`, 10, y);
      y += 8;
      q.options.forEach((o) => {
        pdf.text(`- ${o}`, 15, y);
        y += 6;
      });
      y += 4;
    });
    pdf.save("QuizMintAI.pdf");
  };

  /* =======================
     UI
======================= */

  const testimonials: Testimonial[] = [
    {
      name: "Sarah M.",
      role: "High School Teacher",
      text: "This saves me hours every week. My quizzes are cleaner and smarter.",
      avatar: "https://i.pravatar.cc/160?img=47",
    },
    {
      name: "Ahmed R.",
      role: "University Student",
      text: "I turn lecture notes into practice exams instantly.",
      avatar: "https://i.pravatar.cc/160?img=12",
    },
    {
      name: "James K.",
      role: "Corporate Trainer",
      text: "Perfect for onboarding and internal assessments.",
      avatar: "https://i.pravatar.cc/160?img=59",
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
    {
      name: "Daniel T.",
      role: "Review Center Instructor",
      text: "It cuts down the time I spend rebuilding materials for every new batch of learners.",
      avatar: "https://i.pravatar.cc/160?img=54",
    },
    {
      name: "Leila S.",
      role: "Elementary Teacher",
      text: "I like that I can start with a quick draft and still keep everything organized for class later.",
      avatar: "https://i.pravatar.cc/160?img=41",
    },
  ];

  const [activeTestimonial, setActiveTestimonial] = useState(0);
  useEffect(() => {
    const i = setInterval(
      () => setActiveTestimonial((p) => (p + 1) % testimonials.length),
      4000,
    );
    return () => clearInterval(i);
  }, [testimonials.length]);

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="relative overflow-hidden">
      {/* ===== GLOBAL BACKGROUND (FULL PAGE) ===== */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[700px] w-[700px] bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-[20%] -right-32 h-[600px] w-[600px] bg-cyan-400/20 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute bottom-[-20%] left-[20%] h-[800px] w-[800px] bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center px-6 pt-20">
        <article className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-6 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                <Sparkles className="h-4 w-4 mr-1" />
                AI Teacher Workflow Platform
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            >
              <span className="sr-only">QuizMintAI - teacher workflow platform:</span>
              Run your classroom
              <span className="block bg-linear-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                from plan to follow-up
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mb-8"
            >
              Generate quizzes and lesson plans, assign them to classes, track student results, and launch reteach follow-up from one teacher workflow.
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              onSubmit={(e) => {
                e.preventDefault();
                generateQuiz();
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-xl"
            >
              <Input
                className="h-14 text-base flex-1 border-2 focus:border-blue-500 transition-all"
                placeholder="Paste a topic, lesson text, or class material to start a quiz..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
              />
              <Button
                disabled={loading || !text.trim()}
                className="h-14 px-8 bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Start With a Quiz
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </motion.form>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-3 max-w-xl text-sm text-zinc-500 dark:text-zinc-400"
            >
              Try the public quiz demo first, then sign in to move into assignments, results, follow-up, and the full teacher workflow.
            </motion.p>
            {error && (
              <div className="mt-3 text-sm text-red-500">{error}</div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-4 flex items-center gap-4 text-sm text-zinc-500"
            >
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-green-600" />
                Free
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-green-600" />
                No signup
              </span>
              <span className="font-medium text-blue-600">
                {usage.remaining}/3 public demos left
              </span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
            >
              Public demo access is separate from the signed-in free plan. Free accounts get 100 quiz points that recharge every 12 hours.
            </motion.p>

            <AnimatePresence>
              {timeLeft && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 text-sm text-red-500 flex items-center gap-2"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Next public demo available in: {timeLeft}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right - Floating Sample Cards */}
          <div className="relative hidden lg:block h-[520px]">
            {[
              {
                pos: { top: "top-0", left: "left-8" },
                delay: 0,
                data: {
                  title: "Biology Quiz",
                  question: "What is the primary purpose of photosynthesis?",
                  options: [
                    "Energy storage",
                    "Convert light to chemical energy",
                    "Cell division",
                  ],
                  answer: "Convert light to chemical energy",
                },
              },
              {
                pos: { top: "top-28", left: "left-32" },
                delay: 0.2,
                data: {
                  title: "History Quiz",
                  question: "Which event marked the start of World War II?",
                  options: [
                    "Treaty of Versailles",
                    "Invasion of Poland (1939)",
                    "Attack on Pearl Harbor",
                  ],
                  answer: "Invasion of Poland (1939)",
                },
              },
              {
                pos: { top: "top-56", left: "left-16" },
                delay: 0.4,
                data: {
                  title: "Computer Science Quiz",
                  question: "What does CPU stand for?",
                  options: [
                    "Central Processing Unit",
                    "Computer Power Utility",
                    "Core Performance Unit",
                  ],
                  answer: "Central Processing Unit",
                },
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50, rotate: -5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{
                  duration: 0.8,
                  delay: item.delay,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{
                  scale: 1.05,
                  rotate: 2,
                  transition: { duration: 0.3 },
                }}
                onClick={() => setActiveSample(item.data)}
                className={`absolute ${item.pos.top} ${item.pos.left}
                  w-[340px] rounded-2xl cursor-pointer
                  backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80
                  border border-zinc-200/50 dark:border-zinc-700/50
                  shadow-2xl hover:shadow-blue-500/20 transition-all duration-500`}
              >
                <Card className="bg-transparent border-0 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-800 dark:text-zinc-100 flex items-center justify-between">
                      {item.data.title}
                      <Sparkles className="h-4 w-4 text-blue-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                    {item.data.question}
                    <p className="mt-3 text-blue-600 font-medium flex items-center gap-1">
                      Click to preview
                      <ArrowRight className="h-4 w-4" />
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </article>
      </section>

      {/* Features Section */}
      <section
      id="features"
        className="max-w-7xl mx-auto px-6 py-32"
        aria-labelledby="features-heading"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2
            id="features-heading"
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Why Teachers Use QuizMintAI Beyond Generation
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Move from planning to assignments, results, and intervention without leaving one platform.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: BookOpenCheck,
              title: "Generate And Assign",
              desc: "Create quizzes and lesson plans, then turn them into class-linked work instead of one-off outputs.",
              gradient: "from-blue-500 to-cyan-500",
            },
            {
              icon: Brain,
              title: "Results-Aware Follow-Up",
              desc: "Use adaptive follow-up, intervention summaries, and reteach prompts based on real class results.",
              gradient: "from-purple-500 to-pink-500",
            },
            {
              icon: Zap,
              title: "Classes, Results, And Workflow",
              desc: "Manage classes, roster, reminders, results, library reuse, and workspace actions in one place.",
              gradient: "from-orange-500 to-red-500",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -8 }}
            >
              <Card
                className="h-full rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-zinc-900/60
                border border-zinc-200/60 dark:border-zinc-800/60
                shadow-xl hover:shadow-2xl transition-all duration-500
                group overflow-hidden relative"
              >
                <div
                  className={`absolute inset-0 bg-linear-to-br ${f.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                />
                <CardHeader>
                  <div
                    className={`inline-flex p-3 rounded-xl bg-linear-to-br ${f.gradient} mb-4 shadow-lg`}
                  >
                    <f.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-zinc-600 dark:text-zinc-400">
                  {f.desc}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== TESTIMONIAL CAROUSEL ===== */}
      <section
        id="testimonials"
        className="max-w-5xl mx-auto px-6 py-32"
        aria-labelledby="testimonials-heading"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2
            id="testimonials-heading"
            className="text-4xl md:text-5xl font-bold text-center mb-16"
          >
            Loved by Educators, Students & Trainers
          </h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="rounded-3xl p-10 backdrop-blur-xl bg-white/60 dark:bg-zinc-900/60 shadow-2xl border-2 border-zinc-200/50 dark:border-zinc-700/50">
                <div className="text-4xl text-blue-500 mb-6">"</div>
                <p className="text-xl mb-8 leading-relaxed">
                  {testimonials[activeTestimonial].text}
                </p>
                <div className="flex items-center gap-4">
                  <TestimonialAvatar
                    name={testimonials[activeTestimonial].name}
                    avatar={testimonials[activeTestimonial].avatar}
                  />
                  <div>
                    <div className="font-semibold text-lg">
                      {testimonials[activeTestimonial].name}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {testimonials[activeTestimonial].role}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeTestimonial
                    ? "w-8 bg-blue-600"
                    : "w-2 bg-zinc-300 dark:bg-zinc-700"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </section>

      <section
        className="max-w-7xl mx-auto px-6 py-20"
        aria-labelledby="use-cases-heading"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2
            id="use-cases-heading"
            className="text-3xl md:text-4xl font-bold text-center mb-4"
          >
            Explore QuizMintAI By Workflow, Subject, and Use Case
          </h2>
          <p className="text-center text-zinc-600 dark:text-zinc-400 mb-10">
            Start with the workflow pages for the full teaching flow, then open subject and generator pages for more specific classroom needs.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="rounded-2xl border border-blue-200/70 bg-white/70 p-6 backdrop-blur-xl dark:border-zinc-700/60 dark:bg-zinc-900/70">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xl">Teaching Workflow Pages</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-0 pb-0 sm:grid-cols-2">
              {[
                { href: "/classroom-quiz-workflow", label: "Classroom Quiz Workflow" },
                { href: "/assignment-tracking-for-teachers", label: "Assignment Tracking" },
                { href: "/quiz-results-and-reteach-workflow", label: "Results and Reteach" },
                { href: "/teacher-workspace-for-quizzes-and-lessons", label: "Teacher Workspace" },
                { href: "/classroom-intervention-workflow", label: "Intervention Workflow" },
                { href: "/student-roster-and-reminders", label: "Roster and Reminders" },
              ].map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="rounded-xl border border-blue-200/80 bg-white px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-blue-500 hover:text-blue-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:text-blue-300"
                >
                  {page.label}
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-cyan-200/70 bg-white/70 p-6 backdrop-blur-xl dark:border-zinc-700/60 dark:bg-zinc-900/70">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xl">Generator And Subject Pages</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-0 pb-0 sm:grid-cols-2">
              {[
                { href: "/quiz-generator-for-teachers", label: "Quiz Generator for Teachers" },
                { href: "/lesson-plan-generator-for-teachers", label: "Lesson Plan Generator" },
                { href: "/science-quiz-generator", label: "Science Quiz Generator" },
                { href: "/math-quiz-generator", label: "Math Quiz Generator" },
                { href: "/history-quiz-generator", label: "History Quiz Generator" },
                { href: "/resources", label: "All Resource Guides" },
              ].map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="rounded-xl border border-zinc-200/70 bg-white px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-cyan-400 hover:text-cyan-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:text-cyan-300"
                >
                  {page.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Pricing
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 text-center mb-16">
            Choose the plan that fits your classroom workflow
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Free",
              price: "$0",
              period: "/forever",
              features: [
                "100 quiz points every 12 hours",
                "Public demo access without signup",
                "Limited saved assets",
                "Basic history",
                "No advanced analytics",
                "No premium export formats",
                "No adaptive workflow intelligence",
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
                "Normal support",
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
                "Premium intervention insights and follow-up review",
                "Priority queue handling for heavy generation jobs",
                "Richer history and reusable teaching assets",
              ],
              popular: false,
            },
          ].map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -8 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-linear-to-r from-blue-600 to-cyan-600 text-white border-0 shadow-lg">
                    Most Popular
                  </Badge>
                </div>
              )}
              <Card
                className={`h-full rounded-2xl backdrop-blur-xl
                  ${
                    plan.popular
                      ? "bg-linear-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/50 shadow-2xl shadow-blue-500/20"
                      : "bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60"
                  }
                  transition-all duration-500 hover:shadow-2xl`}
              >
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-4">{plan.title}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-zinc-500">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/sign-up" className="w-full">
                    <Button
                      className={`w-full h-12 ${
                        plan.popular
                          ? "bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg"
                          : ""
                      }`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="max-w-4xl mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "Is my content stored or shared?",
                a: "No. All content is processed securely and discarded immediately after generation. We take privacy seriously.",
              },
              {
                q: "Can I use this for formal exams?",
                a: "Yes! Pro and Premium plans support structured assessments with customizable difficulty levels and question types.",
              },
              {
                q: "How does the free plan work?",
                a: "Public visitors can try a few no-signup demo generations on the landing page. Signed-in free accounts get 100 quiz points that recharge every 12 hours, with prompt quizzes using 25 points each.",
              },
              {
                q: "Can I export quizzes?",
                a: "Absolutely! All plans include copy-to-clipboard and PDF export. Premium plans offer additional export formats.",
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Card
                  className="backdrop-blur-xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60
                    cursor-pointer transition-all duration-300 hover:shadow-lg"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-semibold">
                        {faq.q}
                      </CardTitle>
                      <motion.div
                        animate={{ rotate: openFaq === i ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="h-5 w-5 text-zinc-500" />
                      </motion.div>
                    </div>
                  </CardHeader>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CardContent className="text-zinc-600 dark:text-zinc-400">
                          {faq.a}
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ===== QUIZ OUTPUT (UNCHANGED) ===== */}
      {quiz && (
        <section ref={quizRef} className="max-w-4xl mx-auto px-6 pb-32">
          <Card className="rounded-2xl shadow-2xl">
            <CardHeader className="flex justify-between">
              <CardTitle>Generated Quiz</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
                <Button size="sm" onClick={handleDownloadPDF}>
                  <FileDown className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {quiz.questions.map((q, i) => (
                <div
                  key={i}
                  className="rounded-xl border p-5 bg-white dark:bg-zinc-900"
                >
                  <p className="font-semibold mb-2">
                    {i + 1}. {q.question}
                  </p>
                  <ul className="ml-5 list-disc">
                    {q.options.map((o, j) => (
                      <li key={j}>{o}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-green-600">
                    Answer: {q.answer}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ===== MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
            <h2 className="text-2xl font-bold mb-4">
              Public demo limit reached
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              You have used the public no-signup quiz demos for now. Create a free account to get 100 quiz points that recharge every 12 hours, or upgrade for more workflow access.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/sign-up"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Create Free Account
              </a>
              <a
                href="#pricing"
                className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 dark:hover:bg-zinc-800 transition"
              >
                View Pricing
              </a>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* SAMPLE QUIZ MODAL */}
      {activeSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative">
            <h3 className="text-xl font-bold mb-4">{activeSample.title}</h3>

            <p className="font-semibold mb-3">{activeSample.question}</p>

            <ul className="ml-5 list-disc space-y-1 text-zinc-600 dark:text-zinc-400">
              {activeSample.options.map((opt, i) => (
                <li
                  key={i}
                  className={
                    opt === activeSample.answer
                      ? "text-green-600 font-medium"
                      : ""
                  }
                >
                  {opt}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setActiveSample(null)}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Close
              </button>
              <a
                href="/sign-up"
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                Generate Your Own →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
