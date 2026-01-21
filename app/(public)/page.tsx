// "use client";

// import { useState, useEffect, useRef } from "react";
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
// } from "lucide-react";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import jsPDF from "jspdf";
// import Link from "next/link";


// export default function Home() {
//   const [text, setText] = useState("");
//   const [quiz, setQuiz] = useState<any | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [usageLoaded, setUsageLoaded] = useState(false);
//   const [usage, setUsage] = useState<{
//     count: number;
//     remaining: number;
//     nextFreeAt: string | null;
//   }>({ count: 0, remaining: 3, nextFreeAt: null });
//   const [countdown, setCountdown] = useState("");
//   const quizRef = useRef<HTMLDivElement>(null);

//   const [showAdsModal, setShowAdsModal] = useState(false);
//   const [adsShown, setAdsShown] = useState(false);

//   useEffect(() => {
//     if (showAdsModal) {
//       try {
//         // @ts-ignore
//         (adsbygoogle = window.adsbygoogle || []).push({});
//       } catch (e) {
//         console.error("Adsense error:", e);
//       }
//     }
//   }, [showAdsModal]);

//   // Fetch backend-driven public usage on mount
//   useEffect(() => {
//     let mounted = true;
//     const fetchUsage = async () => {
//       try {
//         const res = await fetch("/api/public-generate-quiz");
//         if (!res.ok) return;
//         const data = await res.json();
//         if (!mounted) return;
//         setUsage({
//           count: data.count ?? 0,
//           remaining: data.remaining ?? 3,
//           nextFreeAt: data.nextFreeAt ?? null,
//         });
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setUsageLoaded(true); // now we know usage is loaded
//       }
//     };
//     fetchUsage();
//     return () => {
//       mounted = false;
//     };
//   }, []);
//   // Countdown timer (hours + minutes) driven by usage.nextFreeAt
//   useEffect(() => {
//     if (!usage.nextFreeAt) {
//       setCountdown("");
//       return;
//     }

//     const update = () => {
//       const now = new Date();
//       const target = new Date(usage.nextFreeAt as string);
//       let diffMs = target.getTime() - now.getTime();

//       if (diffMs <= 0) {
//         setCountdown("");
//         // refresh usage from server so remaining resets
//         fetch("/api/public-generate-quiz")
//           .then((r) => r.ok && r.json())
//           .then((d) => {
//             if (d)
//               setUsage({
//                 count: d.count ?? 0,
//                 remaining: d.remaining ?? 3,
//                 nextFreeAt: d.nextFreeAt ?? null,
//               });
//           })
//           .catch(() => {});
//         return;
//       }

//       const totalSeconds = Math.floor(diffMs / 1000);
//       const hours = Math.floor(totalSeconds / 3600);
//       const minutes = Math.floor((totalSeconds % 3600) / 60);
//       // optional seconds if you want more granularity:
//       // const seconds = totalSeconds % 60;

//       let out = "";
//       if (hours > 0) {
//         out = `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${
//           minutes !== 1 ? "s" : ""
//         }`;
//       } else {
//         out = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
//       }
//       setCountdown(out);
//     };

//     update();
//     const id = setInterval(update, 1000);
//     return () => clearInterval(id);
//   }, [usage.nextFreeAt]);

//   // Generate quiz (public)
//   const generateQuiz = async () => {
//     setError("");
//     if (!text.trim()) return;

//     // Prevent if backend says they must wait
//     if (usage.nextFreeAt) {
//       setError(
//         `You can generate your next free quiz in ${
//           countdown || "a few moments"
//         }.`
//       );
//       return;
//     }

//     if (usage.remaining <= 0) {
//       setError(
//         "You’ve reached your free limit of 3 quizzes. Please upgrade to continue!"
//       );
//       return;
//     }

//     setLoading(true);
//     setQuiz(null);

//     try {
//       const res = await fetch("/api/public-generate-quiz", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ text }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         setError(data.error || "Something went wrong.");
//         if (data.nextFreeAt) {
//           setUsage((u) => ({
//             ...u,
//             nextFreeAt: data.nextFreeAt,
//             remaining: 0,
//           }));
//         }
//         return;
//       }

//       // Success: set quiz
//       setQuiz(data.quiz ?? null);

//       // Update usage safely using your snippet
//       if (data.usage) {
//         setUsage({
//           count: data.usage.count,
//           remaining: data.usage.remaining,
//           nextFreeAt: data.usage.nextFreeAt ?? null,
//         });

//         if (data.usage.count === 3 && !adsShown) {
//           setAdsShown(true);
//           setShowAdsModal(true);
//         }
//       } else if (data.count !== undefined || data.nextFreeAt) {
//         // fallback for legacy shape
//         setUsage({
//           count: data.count ?? usage.count,
//           remaining: Math.max(0, (usage.remaining ?? 3) - 1),
//           nextFreeAt: data.nextFreeAt ?? null,
//         });
//       } else {
//         // fallback: decrement locally
//         setUsage((u) => ({ ...u, remaining: Math.max(0, u.remaining - 1) }));
//       }
//     } catch (err) {
//       console.error(err);
//       setError("Failed to generate quiz. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // copy out nicely formatted quiz
//   const handleCopy = async () => {
//     if (!quiz) return;
//     let textToCopy = `${quiz.title}\n\n${quiz.instructions}\n\n`;
//     quiz?.questions?.forEach((q: any, i: number) => {
//       textToCopy += `${i + 1}. ${q.question}\n`;
//       q.options.forEach((opt: string, j: number) => {
//         textToCopy += `   ${String.fromCharCode(97 + j)}) ${opt}\n`;
//       });
//       textToCopy += `   ✅ Answer: ${q.answer}\n\n`;
//     });
//     await navigator.clipboard.writeText(textToCopy);
//     alert("Copied formatted quiz to clipboard!");
//   };

//   // PDF - improved layout
//   const handleDownloadPDF = () => {
//     if (!quiz) return;
//     const pdf = new jsPDF({ unit: "pt", format: "a4" });
//     const pageWidth = pdf.internal.pageSize.getWidth();
//     const margin = 40;
//     let y = margin;
//     const lineHeight = 16;

//     const addText = (
//       txt: string,
//       options?: { bold?: boolean; italic?: boolean; indent?: number }
//     ) => {
//       const indent = options?.indent ?? 0;
//       const style = options?.bold
//         ? "bold"
//         : options?.italic
//         ? "italic"
//         : "normal";
//       pdf.setFont("helvetica", style as any);
//       const lines = pdf.splitTextToSize(txt, pageWidth - margin * 2 - indent);
//       for (const line of lines) {
//         if (y + lineHeight > pdf.internal.pageSize.getHeight() - margin) {
//           pdf.addPage();
//           y = margin;
//         }
//         pdf.text(line, margin + indent, y);
//         y += lineHeight;
//       }
//     };

//     addText(quiz.title || "Quiz", { bold: true });
//     y += 6;
//     addText(quiz.instructions || "", { italic: true });
//     y += 8;

//     quiz.questions.forEach((q: any, i: number) => {
//       addText(`${i + 1}. ${q.question}`, { bold: true });
//       q.options.forEach((opt: string, j: number) => {
//         addText(`${String.fromCharCode(97 + j)}) ${opt}`, { indent: 18 });
//       });
//       addText(`Answer: ${q.answer}`, { italic: true, indent: 18 });
//       y += 6;
//     });

//     pdf.save("QuizMintAI-Quiz.pdf");
//   };

//   return (
//     <div className="flex flex-col items-center w-full max-w-6xl px-6">
//       {/* HERO */}
//       <section
//         id="hero"
//         className="flex flex-col items-center text-center mt-16 max-w-3xl"
//       >
//         <Badge className="mb-3 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
//           AI-Powered Quiz Generator
//         </Badge>
//         <h1 className="text-5xl font-bold leading-tight mb-4">
//           Turn Any Text into a Quiz Instantly ⚡
//         </h1>
//         <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
//           Paste any document, lesson, or article — and let QuizMintAI’s AI create
//           smart, engaging quizzes in seconds.
//         </p>

//         {/* Input + Button */}
//         <form
//           className="flex w-full max-w-md gap-2"
//           onSubmit={(e) => {
//             e.preventDefault();
//             generateQuiz();
//           }}
//         >
//           <Input
//             placeholder="Paste your text or URL..."
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             disabled={
//               !usageLoaded ||
//               loading ||
//               usage.remaining <= 0 ||
//               !!usage.nextFreeAt
//             }
//           />

//           <Button
//             type="submit"
//             className="bg-blue-600 hover:bg-blue-700"
//             disabled={
//               !usageLoaded ||
//               loading ||
//               usage.remaining <= 0 ||
//               !!usage.nextFreeAt
//             }
//           >
//             {loading
//               ? "Generating..."
//               : usage.nextFreeAt
//               ? `Wait (${countdown})`
//               : "Generate"}
//             <ArrowRight className="ml-2 h-4 w-4" />
//           </Button>
//         </form>

//         {usage.nextFreeAt && countdown && (
//           <Alert variant="destructive" className="mt-4 w-full max-w-md">
//             <AlertDescription>
//               You can generate your next free quiz in {countdown}.
//               <div className="flex items-center gap-3">
//                 <h3 className=" font-semibold">See our pricing plans:</h3>
//                 <a
//                   href="#pricing"
//                   className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
//                 >
//                   See pricing →
//                 </a>
//               </div>
//             </AlertDescription>
//           </Alert>
//         )}

//         {/* Generated quiz card */}
//         {quiz && (
//           <Card className="mt-8 w-full max-w-2xl border-zinc-200 dark:border-zinc-800">
//             <CardHeader className="flex justify-between items-center">
//               <CardTitle className="text-xl font-semibold">
//                 🧩 Generated Quiz
//               </CardTitle>
//               <div className="flex gap-2">
//                 <Button size="sm" variant="outline" onClick={handleCopy}>
//                   <Copy className="w-4 h-4 mr-1" /> Copy
//                 </Button>
//                 <Button size="sm" onClick={handleDownloadPDF}>
//                   <FileDown className="w-4 h-4 mr-1" /> PDF
//                 </Button>
//               </div>
//             </CardHeader>

//             <CardContent>
//               <div className="max-h-96 overflow-y-auto border p-5 rounded-lg bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 shadow-sm">
//                 <div
//                   ref={quizRef}
//                   className="space-y-4 text-left text-base text-zinc-800 dark:text-zinc-200 leading-relaxed"
//                 >
//                   <div className="space-y-6">
//                     <h3 className="text-xl font-bold text-blue-600">
//                       {quiz.title}
//                     </h3>
//                     <p className="text-zinc-600 dark:text-zinc-300 italic">
//                       {quiz.instructions}
//                     </p>

//                     <div className="space-y-5">
//                       {quiz?.questions?.map((q: any, i: number) => (
//                         <div
//                           key={i}
//                           className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm"
//                         >
//                           <p className="font-semibold mb-2">
//                             {i + 1}. {q.question}
//                           </p>
//                           <ul className="space-y-1 ml-4 list-disc">
//                             {q.options.map((opt: string, j: number) => (
//                               <li key={j}>{opt}</li>
//                             ))}
//                           </ul>
//                           <p className="mt-2 text-sm text-green-600 dark:text-green-400">
//                             ✅ Correct answer: <strong>{q.answer}</strong>
//                           </p>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         <p className="text-sm text-zinc-500 mt-3">
//           Free quizzes used: {usage.count}/3{" "}
//           {usage.nextFreeAt && (
//             <span className="text-blue-600"> (Next in {countdown})</span>
//           )}
//         </p>
//       </section>

//       {/* FEATURES */}
//       <section className="grid sm:grid-cols-3 gap-6 mt-24 w-full">
//         <Card>
//           <CardHeader>
//             <BookOpenCheck className="h-8 w-8 text-blue-500 mb-2" />
//             <CardTitle>Instant Quiz Creation</CardTitle>
//           </CardHeader>
//           <CardContent>
//             Generate multiple-choice, true/false, or short-answer quizzes from
//             any content in seconds.
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <Zap className="h-8 w-8 text-yellow-500 mb-2" />
//             <CardTitle>Smart AI Engine</CardTitle>
//           </CardHeader>
//           <CardContent>
//             Detects context, difficulty, and key points for balanced questions.
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <Brain className="h-8 w-8 text-green-500 mb-2" />
//             <CardTitle>Export & Integrate</CardTitle>
//           </CardHeader>
//           <CardContent>
//             Export to Google Forms, PDF, or embed quizzes in your LMS.
//           </CardContent>
//         </Card>
//       </section>

//       {/* CTA */}
//       <section className="flex flex-col items-center text-center mt-24 max-w-2xl">
//         <h2 className="text-3xl font-semibold mb-4">
//           Try It Free — No Login Needed
//         </h2>
//         <p className="text-zinc-600 dark:text-zinc-400 mb-6">
//           Create up to 3 quizzes for free. Upgrade anytime for unlimited access.
//         </p>
//         <Button
//           onClick={() =>
//             document
//               .getElementById("hero")
//               ?.scrollIntoView({ behavior: "smooth" })
//           }
//           className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 rounded-full"
//         >
//           Get Started Free
//         </Button>
//       </section>

//       {/* PRICING */}
//       <section
//         id="pricing"
//         className="mt-24 w-full max-w-5xl mx-auto text-center"
//       >
//         <h2 className="text-3xl font-bold mb-8">Individual Plans</h2>
//         <div className="grid sm:grid-cols-3 gap-6 items-stretch">
//           {/* Free Plan */}
//           <Card className="h-full flex flex-col border border-zinc-200 dark:border-zinc-800">
//             <CardHeader>
//               <CardTitle className="text-center">Free</CardTitle>
//             </CardHeader>
//             <CardContent className="flex flex-col justify-between h-full text-center">
//               <div>
//                 <p className="text-3xl font-bold">$0/mo</p>
//                 <ul className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 space-y-2 list-disc list-inside">
//                   <li>3 quizzes per 3 hours</li>
//                   <li>Basic AI generation</li>
//                   <li>Export to PDF</li>
//                 </ul>
//               </div>
//               <Button
//                 onClick={() =>
//                   document
//                     .getElementById("hero")
//                     ?.scrollIntoView({ behavior: "smooth" })
//                 }
//                 variant="outline"
//                 className="mt-4 w-full"
//               >
//                 Try Now
//               </Button>
//             </CardContent>
//           </Card>

//           {/* Pro Plan (featured) */}
//           <Card className="h-full flex flex-col border-2 border-blue-500 shadow-2xl transform scale-105 z-10 bg-blue-50 dark:bg-blue-900">
//             <CardHeader>
//               <CardTitle className="text-center text-blue-800 dark:text-blue-100">
//                 Pro
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="flex flex-col justify-between h-full text-center">
//               <div>
//                 <p className="text-3xl font-bold">$5.00/mo</p>
//                 <ul className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 space-y-2 list-disc list-inside">
//                   <li>Unlimited quizzes</li>
//                   <li>AI difficulty control</li>
//                   <li>Google Forms export</li>
//                   <li>Priority support</li>
//                 </ul>
//               </div>
//               <Link href="/sign-up">
//                 <Button className="bg-blue-600 hover:bg-blue-700 mt-4 w-full text-white">
//                   Upgrade
//                 </Button>
//               </Link>
//             </CardContent>
//           </Card>

//           {/* Premium Plan */}
//           <Card className="h-full flex flex-col border-yellow-500 shadow-lg shadow-yellow-200 dark:shadow-yellow-900/30">
//             <CardHeader>
//               <CardTitle className="text-center">Premium</CardTitle>
//             </CardHeader>
//             <CardContent className="flex flex-col justify-between h-full text-center">
//               <div>
//                 <p className="text-3xl font-bold">$15.00/mo</p>
//                 <ul className="text-sm text-zinc-600 dark:text-zinc-400 mt-3 space-y-2 list-disc list-inside">
//                   <li>Unlimited quizzes</li>
//                   <li>AI difficulty & adaptive learning control</li>
//                   <li>Export to Google Forms, PDF, & CSV</li>
//                   <li>Priority email support</li>
//                   <li>Advanced analytics & performance tracking</li>
//                 </ul>
//               </div>
//               <Link href="/sign-up">
//                 <Button className="bg-yellow-500 hover:bg-yellow-600 mt-4 w-full">
//                   Upgrade to Premium
//                 </Button>
//               </Link>
//             </CardContent>
//           </Card>

//           {showAdsModal && (
//             <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
//               <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md p-4 sm:p-6">
//                 {/* CLOSE BUTTON */}
//                 <button
//                   onClick={() => setShowAdsModal(false)}
//                   className="absolute right-3 top-3 text-zinc-400 hover:text-red-500"
//                   aria-label="Close"
//                 >
//                   ✕
//                 </button>

//                 <h2 className="text-lg font-semibold text-center mb-2">
//                   Enjoying QuizMintAI?
//                 </h2>

//                 <p className="text-sm text-zinc-600 dark:text-zinc-300 text-center mb-4">
//                   You’ve used all 3 free quizzes. Support us by viewing this ad
//                   or upgrade for unlimited access.
//                 </p>

//                 {/* GOOGLE ADS */}
//                 <div className="border rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 p-2 mb-4">
//                   <ins
//                     className="adsbygoogle"
//                     style={{ display: "block" }}
//                     data-ad-client="ca-pub-8981480808378326"
//                     data-ad-slot="9481380484"
//                     data-ad-format="auto"
//                     data-full-width-responsive="true"
//                   />
//                 </div>

//                 <div className="flex flex-col gap-2">
//                   <Button
//                     className="w-full bg-blue-600 hover:bg-blue-700"
//                     onClick={() => setShowAdsModal(false)}
//                   >
//                     Continue
//                   </Button>

//                   <Link href="#pricing">
//                     <Button variant="outline" className="w-full">
//                       View Pricing
//                     </Button>
//                   </Link>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </section>
//     </div>
//   );
// }



import LandingClient from "../landing-page";
import Script from "next/script";
import GoogleOneTap from "@/components/ui/google-oneTap";

export const metadata = {
  title: "AI Quiz Generator | QuizMintAI",
  description:
    "Turn any text, article, or lesson into a quiz instantly with QuizMintAI. Free and premium plans available. Generate, copy, or download quizzes in seconds.",
  keywords: [
    "AI quiz generator",
    "create quizzes",
    "online quiz maker",
    "generate quizzes AI",
    "free quiz generator",
    "QuizMintAI",
    "export quizzes",
  ],
  openGraph: {
    title: "AI Quiz Generator | QuizMintAI",
    description:
      "Turn any text into a quiz instantly with QuizMintAI. Free tier and premium plans available.",
    url: "https://www.quizmintai.com",
    siteName: "QuizMintAI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Quiz Generator | QuizMintAI",
    description:
      "Generate quizzes from any text instantly. Free and premium tiers available.",
  },
  robots: {
    index: true,
    follow: true,
  },
};


const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "QuizMintAI",
  url: "https://www.quizmintai.com",
  description:
    "AI-powered quiz generator to instantly create quizzes from any text.",
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
      price: "5.00",
      priceCurrency: "USD",
      url: "https://www.quizmintai.com/sign-up",
    },
    {
      "@type": "Offer",
      name: "Premium Plan",
      price: "15.00",
      priceCurrency: "USD",
      url: "https://www.quizmintai.com/sign-up",
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <LandingClient />
      {/* <GoogleOneTap /> */}
    </>
  );
}
