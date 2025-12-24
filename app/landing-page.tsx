// "use client";

// import { useState, useEffect, useRef } from "react";
// import {
//   Card,
//   CardHeader,
//   CardTitle,
//   CardContent,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import {
//   Brain,
//   BookOpenCheck,
//   Zap,
//   ArrowRight,
//   Copy,
//   FileDown,
//   Sparkles,
// } from "lucide-react";
// import jsPDF from "jspdf";
// import Link from "next/link";

// /* =======================
//    CORE LOGIC — UNCHANGED
// ======================= */

// export default function Home() {
//   const [text, setText] = useState("");
//   const [quiz, setQuiz] = useState<any | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [usageLoaded, setUsageLoaded] = useState(false);
//   const [usage, setUsage] = useState({
//     count: 0,
//     remaining: 3,
//     nextFreeAt: null as string | null,
//   });
//   const [countdown, setCountdown] = useState("");
//   const quizRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     fetch("/api/public-generate-quiz")
//       .then((r) => r.ok && r.json())
//       .then((d) =>
//         setUsage({
//           count: d.count ?? 0,
//           remaining: d.remaining ?? 3,
//           nextFreeAt: d.nextFreeAt ?? null,
//         })
//       )
//       .finally(() => setUsageLoaded(true));
//   }, []);

//   const generateQuiz = async () => {
//     if (!text.trim() || usage.nextFreeAt) return;
//     setLoading(true);
//     setQuiz(null);

//     const res = await fetch("/api/public-generate-quiz", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ text }),
//     });

//     const data = await res.json();
//     if (res.ok) {
//       setQuiz(data.quiz);
//       if (data.usage) setUsage(data.usage);
//     }
//     setLoading(false);
//   };

//   const handleCopy = async () => {
//     if (!quiz) return;
//     let out = `${quiz.title}\n\n${quiz.instructions}\n\n`;
//     quiz.questions.forEach((q: any, i: number) => {
//       out += `${i + 1}. ${q.question}\n`;
//       q.options.forEach((o: string, j: number) => {
//         out += `   ${String.fromCharCode(97 + j)}) ${o}\n`;
//       });
//       out += `   Answer: ${q.answer}\n\n`;
//     });
//     await navigator.clipboard.writeText(out);
//   };

//   const handleDownloadPDF = () => {
//     if (!quiz) return;
//     const pdf = new jsPDF();
//     let y = 20;
//     pdf.text(quiz.title, 10, y);
//     y += 10;
//     quiz.questions.forEach((q: any, i: number) => {
//       pdf.text(`${i + 1}. ${q.question}`, 10, y);
//       y += 8;
//       q.options.forEach((o: string) => {
//         pdf.text(`- ${o}`, 15, y);
//         y += 6;
//       });
//       y += 4;
//     });
//     pdf.save("QuizMintAI.pdf");
//   };

//   /* =======================
//      UI STARTS HERE
// ======================= */

//   return (
//     <div className="relative overflow-hidden">

//       {/* ===== BACKGROUND LAYERS (PARALLAX FEEL) ===== */}
//       <div className="absolute inset-0 -z-10">
//         <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
//         <div className="absolute top-[20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-cyan-400/20 blur-3xl animate-pulse delay-700" />
//         <div className="absolute bottom-[-20%] left-[20%] h-[600px] w-[600px] rounded-full bg-purple-500/20 blur-3xl animate-pulse delay-1000" />
//       </div>

//       {/* ===== HERO (PARALLAX STYLE) ===== */}
//       <section className="relative min-h-screen flex items-center justify-center px-6">
//         <div className="max-w-7xl w-full grid lg:grid-cols-2 gap-12 items-center">

//           {/* LEFT TEXT */}
//           <div className="relative z-10">
//             <Badge className="mb-6">
//               <Sparkles className="h-4 w-4 mr-1 inline" />
//               AI Quiz Generator
//             </Badge>

//             <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
//               Turn content into
//               <span className="block bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
//                 instant quizzes
//               </span>
//             </h1>

//             <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mb-10">
//               Paste lessons, articles, or notes. QuizMintAI generates
//               structured quizzes instantly — clean, accurate, and ready to share.
//             </p>

//             <form
//               onSubmit={(e) => {
//                 e.preventDefault();
//                 generateQuiz();
//               }}
//               className="flex gap-3 max-w-xl"
//             >
//               <Input
//                 className="h-12 text-base"
//                 placeholder="Paste your content here…"
//                 value={text}
//                 onChange={(e) => setText(e.target.value)}
//                 disabled={loading || !!usage.nextFreeAt}
//               />
//               <Button className="h-12 px-6">
//                 {loading ? "Generating…" : "Generate"}
//                 <ArrowRight className="ml-2 h-4 w-4" />
//               </Button>
//             </form>

//             <p className="mt-4 text-sm text-zinc-500">
//               Free • No signup • {usage.count}/3 used
//             </p>
//           </div>

//           {/* RIGHT FLOATING CARDS */}
//           <div className="relative h-[500px] hidden lg:block">
//             {[
//               { y: "top-0", x: "left-0", scale: "scale-100" },
//               { y: "top-24", x: "left-24", scale: "scale-95" },
//               { y: "top-52", x: "left-12", scale: "scale-90" },
//             ].map((pos, i) => (
//               <Card
//                 key={i}
//                 className={`absolute ${pos.y} ${pos.x} ${pos.scale}
//                   w-[320px] rounded-2xl backdrop-blur bg-white/70
//                   dark:bg-zinc-900/70 shadow-xl
//                   transition-transform duration-500
//                   hover:-translate-y-3 hover:scale-105`}
//               >
//                 <CardHeader>
//                   <CardTitle className="text-base">
//                     Sample Question
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
//                   Which concept best explains photosynthesis?
//                   <ul className="mt-2 list-disc ml-4">
//                     <li>Cellular respiration</li>
//                     <li className="text-green-600">Light-dependent reactions</li>
//                     <li>Osmosis</li>
//                   </ul>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* ===== FEATURES ===== */}
//       <section className="max-w-7xl mx-auto px-6 pb-32 grid md:grid-cols-3 gap-8">
//         {[
//           {
//             icon: BookOpenCheck,
//             title: "Clean Question Design",
//             desc: "Consistent, readable, and student-friendly output.",
//           },
//           {
//             icon: Brain,
//             title: "Context-Aware AI",
//             desc: "Understands topic relevance and difficulty.",
//           },
//           {
//             icon: Zap,
//             title: "Instant Export",
//             desc: "Copy or download quizzes in seconds.",
//           },
//         ].map((f, i) => (
//           <Card
//             key={i}
//             className="group rounded-2xl border border-zinc-200/60
//               dark:border-zinc-800/60 backdrop-blur bg-white/60
//               dark:bg-zinc-900/60 transition-all duration-300
//               hover:-translate-y-2 hover:shadow-2xl"
//           >
//             <CardHeader>
//               <f.icon className="h-6 w-6 text-blue-600 mb-3 group-hover:scale-110 transition" />
//               <CardTitle>{f.title}</CardTitle>
//             </CardHeader>
//             <CardContent className="text-zinc-600 dark:text-zinc-400">
//               {f.desc}
//             </CardContent>
//           </Card>
//         ))}
//       </section>

//       {/* ===== QUIZ OUTPUT (UNCHANGED) ===== */}
//       {quiz && (
//         <section className="max-w-4xl mx-auto px-6 pb-32">
//           <Card className="rounded-2xl shadow-2xl">
//             <CardHeader className="flex justify-between">
//               <CardTitle>Generated Quiz</CardTitle>
//               <div className="flex gap-2">
//                 <Button size="sm" variant="outline" onClick={handleCopy}>
//                   <Copy className="h-4 w-4 mr-1" /> Copy
//                 </Button>
//                 <Button size="sm" onClick={handleDownloadPDF}>
//                   <FileDown className="h-4 w-4 mr-1" /> PDF
//                 </Button>
//               </div>
//             </CardHeader>

//             <CardContent ref={quizRef} className="space-y-6">
//               {quiz.questions.map((q: any, i: number) => (
//                 <div
//                   key={i}
//                   className="rounded-xl border p-5 bg-white dark:bg-zinc-900"
//                 >
//                   <p className="font-semibold mb-2">
//                     {i + 1}. {q.question}
//                   </p>
//                   <ul className="ml-5 list-disc space-y-1">
//                     {q.options.map((o: string, j: number) => (
//                       <li key={j}>{o}</li>
//                     ))}
//                   </ul>
//                   <p className="mt-3 text-sm text-green-600">
//                     Answer: {q.answer}
//                   </p>
//                 </div>
//               ))}
//             </CardContent>
//           </Card>
//         </section>
//       )}
//     </div>
//   );
// }

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
} from "lucide-react";
import jsPDF from "jspdf";

/* =======================
   CORE LOGIC — UNCHANGED
======================= */

export default function Home() {
  const [text, setText] = useState("");
  const [quiz, setQuiz] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
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
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
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
        })
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
    if (usage.count >= 3) {
      setShowModal(true); // show modal when limit reached
      return;
    }

    setLoading(true);
    setQuiz(null);

    const res = await fetch("/api/public-generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    if (res.ok) {
      setQuiz(data.quiz);
      if (data.usage) setUsage(data.usage);
      if (data.usage?.count >= 3) setShowModal(true); // also show modal if hitting limit
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!quiz) return;
    let out = `${quiz.title}\n\n`;
    quiz.questions.forEach((q: any, i: number) => {
      out += `${i + 1}. ${q.question}\n`;
      q.options.forEach((o: string) => (out += `- ${o}\n`));
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
    quiz.questions.forEach((q: any, i: number) => {
      pdf.text(`${i + 1}. ${q.question}`, 10, y);
      y += 8;
      q.options.forEach((o: string) => {
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

  const testimonials = [
    {
      name: "Sarah M.",
      role: "High School Teacher",
      text: "This saves me hours every week. My quizzes are cleaner and smarter.",
    },
    {
      name: "Ahmed R.",
      role: "University Student",
      text: "I turn lecture notes into practice exams instantly.",
    },
    {
      name: "James K.",
      role: "Corporate Trainer",
      text: "Perfect for onboarding and internal assessments.",
    },
  ];

  const [activeTestimonial, setActiveTestimonial] = useState(0);
  useEffect(() => {
    const i = setInterval(
      () => setActiveTestimonial((p) => (p + 1) % testimonials.length),
      4000
    );
    return () => clearInterval(i);
  }, []);

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
      <section className="relative min-h-screen flex items-center px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* LEFT CONTENT */}
          <div>
            <Badge className="mb-6">
              <Sparkles className="h-4 w-4 mr-1" />
              AI Quiz Generator
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Turn content into
              <span className="block bg-linear-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                instant quizzes
              </span>
            </h1>

            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mb-8">
              Paste lessons, articles, or notes. QuizMintAI instantly generates
              structured, ready-to-use quizzes.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                generateQuiz();
              }}
              className="flex gap-3 max-w-xl"
            >
              <Input
                className="h-12"
                placeholder="Paste your content here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
              />
              <Button className="h-12 px-6">
                Generate
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <p className="mt-4 text-sm text-zinc-500">
              Free • No signup • {usage.count}/3 used
            </p>

            {timeLeft && (
              <p className="mt-2 text-sm text-red-500">
                Next quiz available in: {timeLeft}
              </p>
            )}
          </div>

          {/* RIGHT FLOATING SAMPLE CARDS */}
         {/* RIGHT FLOATING SAMPLE CARDS */}
<div className="relative hidden lg:block h-[520px]">
  {[
    {
      pos: { top: "top-0", left: "left-8", scale: "scale-100" },
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
      pos: { top: "top-28", left: "left-32", scale: "scale-95" },
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
      pos: { top: "top-56", left: "left-16", scale: "scale-90" },
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
    <Card
      key={i}
      onClick={() => setActiveSample(item.data)}
      className={`absolute ${item.pos.top} ${item.pos.left} ${item.pos.scale}
        w-[340px] rounded-2xl cursor-pointer
        backdrop-blur bg-white/70 dark:bg-zinc-900/70
        shadow-xl transition-all duration-500
        hover:-translate-y-4 hover:scale-105`}
    >
      <CardHeader>
        <CardTitle className="text-sm text-zinc-800 dark:text-zinc-100">
          {item.data.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
        {item.data.question}
        <p className="mt-3 text-blue-600 font-medium">
          Click to preview →
        </p>
      </CardContent>
    </Card>
  ))}
</div>

        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-32 grid md:grid-cols-3 gap-8">
        {[
          {
            icon: BookOpenCheck,
            title: "Instant Quiz Creation",
            desc: "Generate structured quizzes from any text in seconds.",
          },
          {
            icon: Brain,
            title: "Context-Aware AI",
            desc: "Understands topic relevance and difficulty automatically.",
          },
          {
            icon: Zap,
            title: "Export & Share",
            desc: "Copy, download, or integrate quizzes instantly.",
          },
        ].map((f, i) => (
          <Card
            key={i}
            className="rounded-2xl backdrop-blur bg-white/60 dark:bg-zinc-900/60
        border border-zinc-200/60 dark:border-zinc-800/60
        transition-all duration-300
        hover:-translate-y-2 hover:shadow-2xl"
          >
            <CardHeader>
              <f.icon className="h-7 w-7 text-blue-600 mb-3" />
              <CardTitle>{f.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-zinc-600 dark:text-zinc-400">
              {f.desc}
            </CardContent>
          </Card>
        ))}
      </section>

      {/* ===== TESTIMONIAL CAROUSEL ===== */}
      <section className="max-w-5xl mx-auto px-6 pb-32 text-center">
        <Card className="rounded-2xl p-10 backdrop-blur bg-white/60 dark:bg-zinc-900/60 shadow-xl">
          <p className="text-lg mb-6">
            “{testimonials[activeTestimonial].text}”
          </p>
          <div className="font-semibold">
            {testimonials[activeTestimonial].name}
          </div>
          <div className="text-sm text-zinc-500">
            {testimonials[activeTestimonial].role}
          </div>
        </Card>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 pb-32">
        <h2 className="text-4xl font-bold text-center mb-12">Pricing</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Free",
              price: "$0/mo",
              features: [
                "3 quizzes per 3 hours",
                "Basic AI generation",
                "Export to PDF",
              ],
            },
            {
              title: "Pro",
              price: "$5/mo",
              features: [
                "Unlimited quizzes",
                "AI difficulty control",
                "Export to pdf",
                "Priority support",
              ],
            },
            {
              title: "Premium",
              price: "$15/mo",
              features: [
                "Unlimited quizzes",
                "AI difficulty & adaptive learning control",
                "Export to Documents, PDF, & PPT",
                "Priority email support",
                "Advanced analytics, performance tracking, and AI insight",
              ],
            },
          ].map((p) => (
            <a
              key={p.title}
              href="/sign-up"
              className="block rounded-2xl backdrop-blur bg-white/60 dark:bg-zinc-900/60
                   border border-zinc-200/60 dark:border-zinc-800/60
                   shadow-xl p-6 transition-transform duration-300
                   hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <CardTitle className="text-2xl font-bold">{p.title}</CardTitle>
                <div className="text-3xl font-bold">{p.price}</div>
              </div>
              <ul className="space-y-2 mb-4">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="text-blue-600 font-semibold">Sign Up →</div>
            </a>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="max-w-4xl mx-auto px-6 pb-32">
        <h2 className="text-4xl font-bold text-center mb-10">
          Frequently Asked Questions
        </h2>
        {[
          {
            q: "Is my content stored?",
            a: "No. Public generations are processed and discarded securely.",
          },
          {
            q: "Can I use this for exams?",
            a: "Yes. Pro and Enterprise plans support structured assessments.",
          },
          {
            q: "Do you support teams?",
            a: "Enterprise plans include team and API access.",
          },
        ].map((f, i) => (
          <div
            key={i}
            className="border-b py-4 cursor-pointer"
            onClick={() => setOpenFaq(openFaq === i ? null : i)}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold">{f.q}</span>
              <ChevronDown
                className={`h-5 w-5 transition ${
                  openFaq === i ? "rotate-180" : ""
                }`}
              />
            </div>
            {openFaq === i && (
              <p className="mt-3 text-zinc-600 dark:text-zinc-400">{f.a}</p>
            )}
          </div>
        ))}
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
              {quiz.questions.map((q: any, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border p-5 bg-white dark:bg-zinc-900"
                >
                  <p className="font-semibold mb-2">
                    {i + 1}. {q.question}
                  </p>
                  <ul className="ml-5 list-disc">
                    {q.options.map((o: string, j: number) => (
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
              Free quiz limit reached!
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              You've used all 3 free quizzes. Upgrade your plan to continue
              generating quizzes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/sign-up"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Sign Up
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
      <h3 className="text-xl font-bold mb-4">
        {activeSample.title}
      </h3>

      <p className="font-semibold mb-3">
        {activeSample.question}
      </p>

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
