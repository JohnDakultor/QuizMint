"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import jsPDF from "jspdf";
import { ArrowRight, Badge, Copy, FileDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";


export default function Dashboard() {
  const [text, setText] = useState("");
  const [quiz, setQuiz] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextFreeAt, setNextFreeAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const quizRef = useRef<HTMLDivElement>(null);
  

  // Fetch user usage and last quiz info on mount
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch("/api/user"); // should return { quizUsage, lastQuizAt }
        if (!res.ok) return;
        const data = await res.json();

        
        // if (data.lastQuizAt) setNextFreeAt(new Date(new Date(data.lastQuizAt).getTime() + 3 * 60 * 60 * 1000));
        setNextFreeAt(new Date(data.nextFreeAt));
      } catch (err) {
        console.error("Failed to fetch user usage", err);
      }
    };
    fetchUsage();
  }, []);

  // Countdown timer logic
  // Countdown timer logic
  useEffect(() => {
    if (!nextFreeAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      let diffMs = nextFreeAt.getTime() - now.getTime();

      if (diffMs <= 0) {
        setCountdown("");
        setNextFreeAt(null);
        clearInterval(interval);
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      // Build string
      let countdownStr = "";
      if (hours > 0) countdownStr += `${hours} hour${hours > 1 ? "s" : ""} `;
      if (minutes > 0 || hours === 0)
        countdownStr += `${minutes} minute${minutes !== 1 ? "s" : ""}`;

      setCountdown(countdownStr);
    }, 1000);

    return () => clearInterval(interval);
  }, [nextFreeAt]);

  const generateQuiz = async () => {
    setError("");
    if (!text.trim()) return;

    setLoading(true);
    setQuiz(null);

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        // show backend error ALWAYS
        setError(data.error || "Something went wrong.");

        // If backend tells us next available time → update countdown
        if (data.nextFreeAt) {
          setNextFreeAt(new Date(data.nextFreeAt));
        }

        return;
      }

      setQuiz(data.quiz);
      

      // Update next free quiz timestamp
      if (data.lastQuizAt)
        setNextFreeAt(
          new Date(new Date(data.lastQuizAt).getTime() + 3 * 60 * 60 * 1000)
        );
    } catch (err) {
      console.error(err);
      setError("Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!quiz) return;

    let textToCopy = `${quiz.title}\n\n${quiz.instructions}\n\n`;
    quiz.questions.forEach((q: any, i: number) => {
      textToCopy += `${i + 1}. ${q.question}\n`;
      q.options.forEach((opt: string, j: number) => {
        textToCopy += `   ${String.fromCharCode(97 + j)}) ${opt}\n`;
      });
      textToCopy += `   ✅ Answer: ${q.answer}\n\n`;
    });

    await navigator.clipboard.writeText(textToCopy);
    alert("Copied formatted quiz to clipboard!");
  };

  const handleDownloadPDF = () => {
    if (!quiz) return;

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 40;
    const lineHeight = 18;
    let y = margin;

    const addLine = (
      text: string,
      indent = 0,
      fontStyle: "normal" | "bold" | "italic" = "normal"
    ) => {
      pdf.setFont("helvetica", fontStyle);
      const lines = pdf.splitTextToSize(
        text ?? "",
        pageWidth - margin * 2 - indent
      );
      lines.forEach((line: string) => {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin + indent, y);
        y += lineHeight;
      });
    };

    addLine(quiz.title ?? "", 0, "bold");
    y += 5;
    addLine(quiz.instructions ?? "", 0, "italic");
    y += 10;

    quiz.questions.forEach((q: any, i: number) => {
      addLine(`${i + 1}. ${q.question ?? ""}`, 0, "bold");
      q.options.forEach((opt: string, j: number) => {
        addLine(`   ${String.fromCharCode(97 + j)}) ${opt ?? ""}`, 0);
      });
      addLine(`   Answer: ${q.answer ?? ""}`, 0, "italic");
      y += 10;
    });

    pdf.save("QuizMint Quiz.pdf");
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl px-6">
      <section className="flex flex-col items-center text-center mt-16 max-w-3xl">
        <Badge className="mb-3  text-blue-800 dark:bg-blue-900 dark:text-blue-100">
          AI-Powered Quiz Generator
        </Badge>
        <h1 className="text-5xl font-bold leading-tight mb-4">
          Ask any document, lesson, or article in seconds
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
          Paste any document, lesson, or article — and let QuizMint’s AI create
          smart, engaging quizzes in seconds.
        </p>

        {/* Input + Button */}
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            generateQuiz();
          }}
        >
          <Input
            placeholder="Paste your text or URL..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            // disabled={loading || (nextFreeAt !== null)}
          />
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700"
            // disabled={loading || (nextFreeAt !== null)}
          >
            {loading ? "Generating..." : "Generate"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        {nextFreeAt && countdown && (
          <Alert variant="destructive" className="mt-4 w-full max-w-md">
            <AlertDescription>
              You must wait for the next free quiz. Time remaining: {countdown}
            </AlertDescription>
          </Alert>
        )}

        {quiz && (
          <Card className="mt-8 w-full max-w-2xl border-zinc-200 dark:border-zinc-800">
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold">
                🧩 Generated Quiz
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
                <Button size="sm" onClick={handleDownloadPDF}>
                  <FileDown className="w-4 h-4 mr-1" /> PDF
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="max-h-96 overflow-y-auto border p-5 rounded-lg bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 shadow-sm">
                <div
                  ref={quizRef}
                  className="space-y-4 text-left text-base text-zinc-800 dark:text-zinc-200 leading-relaxed"
                >
                  {quiz.questions.map((q: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm"
                    >
                      <p className="font-semibold mb-2">
                        {i + 1}. {q.question}
                      </p>
                      <ul className="space-y-1 ml-4 list-disc">
                        {q.options.map((opt: string, j: number) => (
                          <li key={j}>{opt}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                        ✅ Correct answer: <strong>{q.answer}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

       
      </section>
    </div>
  );
}

