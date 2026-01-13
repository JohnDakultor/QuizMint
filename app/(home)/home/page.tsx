// "use client";

// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// import jsPDF from "jspdf";
// import { ArrowRight, Badge, Copy, FileDown, X } from "lucide-react";
// import { useState, useRef, useEffect, SetStateAction } from "react";
// import FileUpload from "@/components/ui/file-upload";

// import { motion, AnimatePresence } from "framer-motion";

// export default function Dashboard() {
//   const [prompt, setPrompt] = useState(""); // User quiz prompt
//   const [quiz, setQuiz] = useState<any | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [user, setUser] = useState<any>(null);
//   const [showSubscribeModal, setShowSubscribeModal] = useState(false);
//   const quizRef = useRef<HTMLDivElement>(null);

//   const [uploadedFile, setUploadedFile] = useState<File | null>(null);

//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const res = await fetch("/api/user");
//         if (!res.ok) return;
//         const data = await res.json();
//         setUser(data.user);
//       } catch (err) {
//         console.error(err);
//       }
//     };
//     fetchUser();
//   }, []);

//   const handleDownloadWord = async () => {
//     if (!quiz) return;

//     if (!user || user.subscriptionPlan !== "premium") {
//       setShowSubscribeModal(true);
//       return;
//     }

//     try {
//       const res = await fetch("/api/download-file", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ quiz, format: "word" }),
//       });

//       if (!res.ok) {
//         const data = await res.json();
//         alert(data.error || "Failed to download Word file");
//         return;
//       }

//       const blob = await res.blob();
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = "QuizMint.docx";
//       document.body.appendChild(a);
//       a.click();
//       a.remove();
//       URL.revokeObjectURL(url);
//     } catch (err) {
//       console.error(err);
//       alert("Error downloading Word file");
//     }
//   };

//   const handleDownloadPPT = async () => {
//     if (!quiz) return;

//     if (!user || user.subscriptionPlan !== "premium") {
//       setShowSubscribeModal(true);
//       return;
//     }

//     try {
//       const res = await fetch("/api/download-file", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ quiz, format: "ppt" }),
//       });

//       if (!res.ok) {
//         const data = await res.json();
//         alert(data.error || "Failed to download PPT file");
//         return;
//       }

//       const blob = await res.blob();
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = "QUizMint.pptx";
//       document.body.appendChild(a);
//       a.click();
//       a.remove();
//       URL.revokeObjectURL(url);
//     } catch (err) {
//       console.error(err);
//       alert("Error downloading PPT file");
//     }
//   };

//   const handleFileUpload = async (file: File) => {
//     if (!user) return setShowSubscribeModal(true);
//     if (user.subscriptionPlan !== "premium") return setShowSubscribeModal(true);

//     setLoading(true);
//     try {
//       const formData = new FormData();
//       formData.append("file", file);
//       formData.append("prompt", prompt);
//       formData.append("difficulty", "easy");
//       formData.append("adaptiveLearning", "true");

//       const res = await fetch("/api/upload-file", {
//         method: "POST",
//         body: formData,
//       });
//       const data = await res.json();
//       if (data.quiz) setQuiz(data.quiz);
//       else setError(data.error);
//     } catch (err) {
//       setError("Failed to generate quiz");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const generateQuizFromPrompt = async () => {
//     if (!prompt.trim() && !uploadedFile) return;
//     setLoading(true);
//     setQuiz(null);
//     setError("");

//     try {
//       const difficulty = user?.aiDifficulty || "easy";
//       const adaptiveLearning = user?.adaptiveLearning ?? false; // read from DB

//       if (uploadedFile) {
//         const formData = new FormData();
//         formData.append("file", uploadedFile);
//         formData.append("prompt", prompt);

//         // send DB-controlled values
//         formData.append("difficulty", difficulty);
//         formData.append(
//           "adaptiveLearning",
//           adaptiveLearning ? "true" : "false"
//         );

//         const res = await fetch("/api/upload-file", {
//           method: "POST",
//           body: formData,
//         });
//         const data = await res.json();
//         if (!res.ok)
//           setError(data.error || "Failed to generate quiz from file");
//         else {
//           setQuiz(data.quiz);
//           setUploadedFile(null);
//         }
//       } else {
//         const res = await fetch("/api/generate-quiz", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             text: prompt,
//             difficulty,
//             adaptiveLearning,
//           }),
//         });
//         const data = await res.json();
//         if (!res.ok)
//           setError(data.error || "Failed to generate quiz from prompt");
//         else setQuiz(data.quiz);
//       }
//     } catch (err) {
//       setError("Failed to generate quiz");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCopy = async () => {
//     if (!quiz) return;
//     let textToCopy = `${quiz.title}\n\n${quiz.instructions}\n\n`;
//     quiz.questions.forEach((q: any, i: number) => {
//       textToCopy += `${i + 1}. ${q.question}\n`;
//       q.options.forEach((opt: string, j: number) => {
//         textToCopy += `   ${String.fromCharCode(97 + j)}) ${opt}\n`;
//       });
//       textToCopy += `   ✅ Answer: ${q.answer}\n\n`;
//     });
//     await navigator.clipboard.writeText(textToCopy);
//     alert("Copied formatted quiz to clipboard!");
//   };

//   const handleDownloadPDF = () => {
//     if (!quiz) return;

//     const pdf = new jsPDF({ unit: "pt", format: "a4" });
//     const pageWidth = pdf.internal.pageSize.width;
//     const pageHeight = pdf.internal.pageSize.height;
//     const margin = 40;
//     const lineHeight = 18;
//     let y = margin;

//     const addLine = (
//       text: string,
//       indent = 0,
//       fontStyle: "normal" | "bold" | "italic" = "normal"
//     ) => {
//       pdf.setFont("helvetica", fontStyle);
//       const lines = pdf.splitTextToSize(
//         text ?? "",
//         pageWidth - margin * 2 - indent
//       );
//       lines.forEach((line: string) => {
//         if (y + lineHeight > pageHeight - margin) {
//           pdf.addPage();
//           y = margin;
//         }
//         pdf.text(line, margin + indent, y);
//         y += lineHeight;
//       });
//     };

//     addLine(quiz.title ?? "", 0, "bold");
//     y += 5;
//     addLine(quiz.instructions ?? "", 0, "italic");
//     y += 10;

//     quiz.questions.forEach((q: any, i: number) => {
//       addLine(`${i + 1}. ${q.question ?? ""}`, 0, "bold");
//       q.options.forEach((opt: string, j: number) =>
//         addLine(`   ${String.fromCharCode(97 + j)}) ${opt ?? ""}`, 0)
//       );
//       addLine(`   Answer: ${q.answer ?? ""}`, 0, "italic");
//       y += 10;
//     });

//     pdf.save("QuizMint Quiz.pdf");
//   };

//   return (
//     <div className="flex flex-col items-center w-full max-w-6xl px-6">
//       <section className="flex flex-col items-center text-center mt-16 max-w-3xl">
//         <Badge className="mb-3 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
//           AI-Powered Quiz Generator
//         </Badge>
//         <h1 className="text-5xl font-bold leading-tight mb-4">
//           Ask any document or lesson in seconds
//         </h1>
//         <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
//           Write instructions or upload a document — QuizMint’s AI will generate
//           a quiz.
//         </p>

//         <textarea
//           placeholder="Write your quiz instructions or prompt here..."
//           value={prompt}
//           onChange={(e) => setPrompt(e.target.value)}
//           className="w-full max-w-md mb-2 rounded border border-zinc-300 p-2 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
//         />

//         <div className="flex gap-2 mb-4">
//           <Button
//             className="bg-blue-600 hover:bg-blue-700"
//             onClick={generateQuizFromPrompt}
//             disabled={loading}
//           >
//             {loading ? "Generating..." : "Generate from Prompt"}
//             <ArrowRight className="ml-2 h-4 w-4" />
//           </Button>
//           <FileUpload
//             onFileSelect={(file) => {
//               if (!user || user.subscriptionPlan !== "premium") {
//                 setShowSubscribeModal(true);
//                 return;
//               }
//               setUploadedFile(file); // just store the file
//             }}
//           />
//         </div>

//         {error && (
//           <Alert variant="destructive" className="w-full max-w-md">
//             <AlertDescription>{error}</AlertDescription>
//           </Alert>
//         )}

//         <AnimatePresence>
//           {quiz && (
//             <motion.div
//               key="quiz-card"
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: 20 }}
//               transition={{ duration: 0.3 }}
//               className="w-full max-w-2xl"
//             >
//               <Card className="mb-10 w-full max-w-2xl border-zinc-200 dark:border-zinc-800">
//                 <CardHeader className="relative pb-4">
//                   {/* X BUTTON (TOP RIGHT ALWAYS) */}
//                   <button
//                     onClick={() => setQuiz(null)}
//                     className="absolute right-2 top-2 text-gray-500 hover:text-red-500"
//                   >
//                     <X className="w-5 h-5" />
//                   </button>

//                   {/* TITLE */}
//                   <CardTitle className="text-xl font-semibold mb-3">
//                     🧩 Generated Quiz
//                   </CardTitle>

//                   {/* ACTION BUTTONS */}
//                   <div className="flex flex-wrap gap-2 w-full">
//                     <Button size="sm" variant="outline" onClick={handleCopy}>
//                       <Copy className="w-4 h-4 mr-1" /> Copy
//                     </Button>

//                     <Button size="sm" onClick={handleDownloadPDF}>
//                       <FileDown className="w-4 h-4 mr-1" /> PDF
//                     </Button>

//                     <Button size="sm" onClick={handleDownloadWord}>
//                       <FileDown className="w-4 h-4 mr-1" /> Word
//                     </Button>

//                     <Button size="sm" onClick={handleDownloadPPT}>
//                       <FileDown className="w-4 h-4 mr-1" /> PPT
//                     </Button>
//                   </div>
//                 </CardHeader>

//                 <CardContent>
//                   <div className="max-h-96 overflow-y-auto border p-5 rounded-lg bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 shadow-sm">
//                     <div
//                       ref={quizRef}
//                       className="space-y-4 text-left text-base text-zinc-800 dark:text-zinc-200 leading-relaxed"
//                     >
//                       {quiz.questions.map((q: any, i: number) => (
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
//                           {q.hint && (
//                             <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
//                               💡 Hint: {q.hint}
//                             </p>
//                           )}
//                           {q.explanation && (
//                             <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
//                               📝 Explanation: {q.explanation}
//                             </p>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </section>

//       {showSubscribeModal && (
//         <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
//           <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-lg w-80 text-center">
//             <h2 className="text-xl font-bold mb-3">Subscription Required</h2>
//             <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
//               Uploading files is available only for premium members.
//             </p>
//             <Button
//               className="w-full bg-blue-600 hover:bg-blue-700"
//               onClick={() => (window.location.href = "/subscription")}
//             >
//               Subscribe Now
//             </Button>
//             <Button
//               variant="outline"
//               className="w-full mt-2"
//               onClick={() => setShowSubscribeModal(false)}
//             >
//               Cancel
//             </Button>
//           </div>
//         </div>
//       )}

//       {uploadedFile && (
//         <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
//           <span>✅ File uploaded: {uploadedFile.name}</span>
//           <Button
//             size="sm"
//             variant="outline"
//             onClick={() => setUploadedFile(null)}
//           >
//             Remove
//           </Button>
//         </div>
//       )}
//     </div>
//   );
// }



"use client";

import { useState, useRef, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Copy, FileDown, X } from "lucide-react";
import FileUpload from "@/components/ui/file-upload";
import { motion } from "framer-motion";
import jsPDF from "jspdf";

export default function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [quiz, setQuiz] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const quizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user");
        if (!res.ok) return;
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    setPrompt((prev) => prev + text);
  };

  const handleCopy = async () => {
    if (!quiz) return;
    let textToCopy = `${quiz.title}\n\n${quiz.instructions}\n\n`;
    quiz.questions.forEach((q: any, i: number) => {
      textToCopy += `${i + 1}. ${q.question}\n`;
      q.options.forEach((opt: string, j: number) => {
        textToCopy += `   ${String.fromCharCode(97 + j)}) ${opt}\n`;
      });
      textToCopy += `    Answer: ${q.answer}\n\n`;
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

    const addLine = (text: string, indent = 0, fontStyle: "normal" | "bold" | "italic" = "normal") => {
      pdf.setFont("helvetica", fontStyle);
      const lines = pdf.splitTextToSize(text ?? "", pageWidth - margin * 2 - indent);
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
      q.options.forEach((opt: string, j: number) =>
        addLine(`   ${String.fromCharCode(97 + j)}) ${opt ?? ""}`, 0)
      );
      addLine(`   Answer: ${q.answer ?? ""}`, 0, "italic");
      y += 10;
    });

    pdf.save("QuizMint Quiz.pdf");
  };

  const handleDownloadWord = async () => {
    if (!quiz) return;
    if (!user || user.subscriptionPlan !== "premium") return setShowSubscribeModal(true);

    try {
      const res = await fetch("/api/download-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz, format: "word" }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to download Word file");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "QuizMint.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error downloading Word file");
    }
  };

  const handleDownloadPPT = async () => {
    if (!quiz) return;
    if (!user || user.subscriptionPlan !== "premium") return setShowSubscribeModal(true);

    try {
      const res = await fetch("/api/download-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz, format: "ppt" }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to download PPT file");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "QuizMint.pptx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error downloading PPT file");
    }
  };

  const generateQuizFromPrompt = async () => {
    if (!prompt.trim() && !uploadedFile) return;
    setLoading(true);
    setQuiz(null);
    setError("");

    try {
      const difficulty = user?.aiDifficulty || "easy";
      const adaptiveLearning = user?.adaptiveLearning ?? false;

      if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("prompt", prompt);
        formData.append("difficulty", difficulty);
        formData.append("adaptiveLearning", adaptiveLearning ? "true" : "false");

        const res = await fetch("/api/upload-file", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) setError(data.error || "Failed to generate quiz from file");
        else {
          setQuiz(data.quiz);
          setUploadedFile(null);
        }
      } else {
        const res = await fetch("/api/generate-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: prompt, difficulty, adaptiveLearning }),
        });
        const data = await res.json();
        if (!res.ok) setError(data.error || "Failed to generate quiz from prompt");
        else setQuiz(data.quiz);
      }
    } catch (err) {
      setError("Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full px-6 min-h-screen">
      <section className="flex flex-col lg:flex-row gap-8 justify-center w-full max-w-7xl">

        {/* ================= INPUT CARD ================= */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-md w-full lg:w-[480px] h-[550px]">
          <CardHeader>
            <CardTitle className="text-xl font-semibold"> Create Quiz Input</CardTitle>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Paste text, write instructions, or upload a document.
            </p>
          </CardHeader>

          <CardContent className="space-y-4 flex flex-col h-full">
            <div className="relative flex-1">
              <textarea
                placeholder="Paste lesson content, syllabus, or instructions here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="h-full w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={handlePaste}>
                  Paste
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPrompt("")}>
                  Clear
                </Button>
              </div>
            </div>

            <FileUpload
              onFileSelect={(file) => {
                if (!user || user.subscriptionPlan !== "premium") {
                  setShowSubscribeModal(true);
                  return;
                }
                setUploadedFile(file);
              }}
            />

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
              onClick={generateQuizFromPrompt}
              disabled={loading}
            >
              {loading ? "Generating Quiz..." : "Generate Quiz"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {uploadedFile && (
              <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                <span> {uploadedFile.name}</span>
                <Button size="sm" variant="outline" onClick={() => setUploadedFile(null)}>
                  Remove
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ================= OUTPUT CARD (ALWAYS VISIBLE) ================= */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-md w-full lg:w-[520px] h-[550px] flex flex-col">
          <CardHeader className="relative">
            <CardTitle className="text-xl font-semibold"> Generated Quiz</CardTitle>

            {quiz && (
              <button
                onClick={() => setQuiz(null)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-red-500"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                PDF
              </Button>
              <Button size="sm" onClick={handleDownloadWord}>
                Word
              </Button>
              <Button size="sm" onClick={handleDownloadPPT}>
                PPT
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 max-h-[450px] overflow-y-auto space-y-4 pr-2">
            {quiz ? (
              quiz.questions.map((q: any, i: number) => (
                <div key={i} className="p-4 rounded-lg border bg-white dark:bg-zinc-900">
                  <p className="font-semibold mb-2">{i + 1}. {q.question}</p>
                  <ul className="ml-4 list-disc space-y-1">
                    {q.options.map((opt: string, j: number) => <li key={j}>{opt}</li>)}
                  </ul>
                  <p className="mt-2 text-sm text-green-600"> Answer: <strong>{q.answer}</strong></p>
                  {q.explanation && <p className="mt-1 text-sm text-zinc-500">📝 {q.explanation}</p>}
                </div>
              ))
            ) : (
              <p className="text-zinc-400 text-center mt-20">Your generated quiz will appear here</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ================= SUBSCRIBE MODAL ================= */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-lg w-80 text-center">
            <h2 className="text-xl font-bold mb-3">Subscription Required</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
              Uploading files is available only for premium members.
            </p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => (window.location.href = "/subscription")}
            >
              Subscribe Now
            </Button>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setShowSubscribeModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
