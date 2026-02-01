// import { NextResponse } from "next/server";
// import mammoth from "mammoth";
// import * as XLSX from "xlsx";
// import { generateQuizAI } from "@/lib/ai";
// import { prisma } from "@/lib/prisma";
// import { authOptions } from "@/lib/auth-option";
// import { getServerSession } from "next-auth";

// export const runtime = "nodejs";

// export async function POST(req: Request) {
//   try {
//     // 1️⃣ Authenticate user
//     const session = await getServerSession(authOptions);
//     const email = session?.user?.email;
//     if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user || user.subscriptionPlan !== "premium") {
//       return NextResponse.json(
//         { error: "You must subscribe to upload files." },
//         { status: 403 }
//       );
//     }

//     // 2️⃣ Get file and prompt from formData
//     const formData = await req.formData();
//     const file = formData.get("file") as File;
//     const prompt = (formData.get("prompt") as string) || "";

//     if (!file) return NextResponse.json({ error: "No file uploaded", status: 400 });

//     const difficulty = user.aiDifficulty || "easy";
//     const adaptiveLearning = user.adaptiveLearning ?? false;

//     const ext = file.name.split(".").pop()?.toLowerCase() || "";
//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     let content = "";
//     if (ext === "txt") {
//       content = buffer.toString("utf-8");
//     } else if (ext === "docx") {
//       content = (await mammoth.extractRawText({ buffer })).value;
//     } else if (ext === "xlsx") {
//       const workbook = XLSX.read(buffer, { type: "buffer" });
//       workbook.SheetNames.forEach((sheetName) => {
//         const sheet = workbook.Sheets[sheetName];
//         content += XLSX.utils.sheet_to_csv(sheet) + "\n";
//       });
//     } else {
//       return NextResponse.json({ error: "Unsupported file type", status: 400 });
//     }

//     if (content.length > 3000) content = content.slice(0, 3000);

//     // 3️⃣ Generate AI quiz
//     const quiz = await generateQuizAI(content, difficulty, adaptiveLearning, true, prompt);

//     // 4️⃣ Sanitize for front-end
//     const safeQuiz = {
//       title: quiz.title,
//       instructions: quiz.instructions,
//       questions: quiz.questions.map((q: any) => ({
//         question: q.question,
//         options: q.options,
//         answer: q.answer,
//         explanation: adaptiveLearning ? q.explanation ?? null : null,
//         hint: adaptiveLearning ? q.hint ?? null : null,
//       })),
//     };

//     return NextResponse.json({ message: "Quiz generated", quiz: safeQuiz });
//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json({ error: err.message || "Failed to process file" }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import fs from "fs/promises";
import os from "os";
import path from "path";
import pptxTextParser from "pptx-text-parser";
import { generateQuizAI } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-option";
import { getServerSession } from "next-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // --- AUTH ---
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.subscriptionPlan !== "premium")
      return NextResponse.json(
        { error: "You must subscribe to upload files." },
        { status: 403 },
      );

    // --- FILE & PROMPT ---
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const prompt = (formData.get("prompt") as string) || "";

    const difficulty = user.aiDifficulty || "easy";
    const adaptiveLearning = user.adaptiveLearning ?? false;

    let content = "";

    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const arrayBuffer = await file.arrayBuffer();

      if (ext === "txt") {
        content = new TextDecoder().decode(arrayBuffer);
      } else if (ext === "docx") {
        content = (
          await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) })
        ).value;
      } else if (ext === "xlsx") {
        const workbook = XLSX.read(Buffer.from(arrayBuffer), {
          type: "buffer",
        });
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          content += XLSX.utils.sheet_to_csv(sheet) + "\n";
        });
      } else if (ext === "pptx" || ext === "ppt") {
        try {
          const tempFilePath = path.join(
            os.tmpdir(),
            `${Date.now()}-${file.name}`,
          );
          await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));

          content = await pptxTextParser(tempFilePath, "text");

          console.log("=== EXTRACTED PPTX TEXT START ===");
          console.log(content);
          console.log("=== EXTRACTED PPTX TEXT END ===");

          await fs.unlink(tempFilePath);

          // --- CHECK FOR MEANINGFUL CONTENT ---
          const meaningfulText = content
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("---"))
  .join("\n");

console.log("Meaningful text length:", meaningfulText.length);

if (!meaningfulText) {
  // <-- Return proper 400 so frontend sees error
  return NextResponse.json(
    {
      error: "InsufficientContent",
      message:
        "No meaningful content found in the uploaded file. Please provide a file with actual text.",
    },
    { status: 400 } // <-- status 400
  );
}

content = meaningfulText;  // override to pass to AI
        } catch (pptErr: any) {
          console.error("PPT parsing error:", pptErr);
          content = "";
        }
      } else {
        return NextResponse.json({
          error: "Unsupported file type",
          status: 400,
        });
      }
    }

    // --- COMBINE FILE CONTENT + PROMPT ---
    const finalInput = [prompt, content].filter(Boolean).join("\n\n");

    // --- TRUNCATE LONG TEXT ---
    const truncatedInput =
      finalInput.length > 3000 ? finalInput.slice(0, 3000) : finalInput;

    // --- DEBUG LOGGING ---
    console.log("Prompt:", prompt);
    console.log("File content length:", content.length);
    console.log("Truncated input length:", truncatedInput.length);

    // --- GENERATE QUIZ ---
    let quiz = await generateQuizAI(
      truncatedInput,
      difficulty,
      adaptiveLearning,
      true,
      prompt,
    );

    // --- DEFENSIVE CHECK ---
    if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
  return NextResponse.json(
    {
      error: "InsufficientContent",
      message:
        "No quiz questions generated. Reason: Provided content is insufficient for question generation.",
    },
    { status: 400 }
  );
}

    const safeQuiz = {
      ...quiz,
      questions: quiz.questions.map((q: any) => ({
        question: q.question ?? "",
        options: Array.isArray(q.options) ? q.options : [],
        answer: q.answer ?? "",
        explanation: adaptiveLearning ? (q.explanation ?? null) : null,
        hint: adaptiveLearning ? (q.hint ?? null) : null,
      })),
    };

    const savedQuiz = await prisma.quiz.create({
  data: {
    title: safeQuiz.title,
    instructions: safeQuiz.instructions,
    userId: user.id, // from your authenticated session
    questions: {
      create: safeQuiz.questions.map((q: any) => ({
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        hint: q.hint,
      })),
    },
  },
  include: {
    questions: true, // return saved questions as well
  },
});

    return NextResponse.json({ message: "Quiz generated", quiz: savedQuiz });
  } catch (err: any) {
    console.error("Upload file error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process file" },
      { status: 500 },
    );
  }
}
