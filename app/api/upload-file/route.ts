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
//     const session = await getServerSession(authOptions);
//     const email = session?.user?.email;
//     if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user || user.subscriptionPlan !== "premium") return NextResponse.json({ error: "You must subscribe to upload files.", status: 403 });

//     const formData = await req.formData();
//     const file = formData.get("file") as File;
//     const prompt = (formData.get("prompt") as string) || "";
//     const difficulty = (formData.get("difficulty") as string) || "easy";
//     const adaptiveLearning = (formData.get("adaptiveLearning") as string) === "true";

//     if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

//     const ext = file.name.split(".").pop()?.toLowerCase() || "";
//     let content = "";

//     const arrayBuffer = await file.arrayBuffer();
//     const buffer = Buffer.from(arrayBuffer);

//     if (ext === "txt") content = buffer.toString("utf-8");
//     else if (ext === "docx") content = (await mammoth.extractRawText({ buffer })).value;
//     else if (ext === "xlsx") {
//       const workbook = XLSX.read(buffer, { type: "buffer" });
//       workbook.SheetNames.forEach((sheetName) => {
//         const sheet = workbook.Sheets[sheetName];
//         content += XLSX.utils.sheet_to_csv(sheet) + "\n";
//       });
//     } else return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

//     if (content.length > 3000) content = content.slice(0, 3000);

//     const quiz = await generateQuizAI(content, difficulty, adaptiveLearning, true, prompt);

//     return NextResponse.json({ message: "Quiz generated", quiz });
//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json({ error: err.message || "Failed to process file" }, { status: 500 });
//   }
// }

import { NextResponse } from "next/server";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { generateQuizAI } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-option";
import { getServerSession } from "next-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.subscriptionPlan !== "premium")
      return NextResponse.json({ error: "You must subscribe to upload files.", status: 403 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const prompt = (formData.get("prompt") as string) || "";

    if (!file) return NextResponse.json({ error: "No file uploaded", status: 400 });

    // ✅ Use user's saved difficulty & adaptiveLearning from DB
    const difficulty = user.aiDifficulty || "easy"; 
    const adaptiveLearning = user.adaptiveLearning ?? false;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let content = "";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (ext === "txt") {
      content = buffer.toString("utf-8");
    } else if (ext === "docx") {
      content = (await mammoth.extractRawText({ buffer })).value;
    } else if (ext === "xlsx") {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        content += XLSX.utils.sheet_to_csv(sheet) + "\n";
      });
    } else {
      return NextResponse.json({ error: "Unsupported file type", status: 400 });
    }

    // Truncate content to avoid AI overload
    if (content.length > 3000) content = content.slice(0, 3000);

    // Generate quiz using AI
    const quiz = await generateQuizAI(content, difficulty, adaptiveLearning, true, prompt);

    // Remove hints and explanations if adaptiveLearning is false
    const safeQuiz = {
      ...quiz,
      questions: quiz.questions.map((q: any) => ({
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: adaptiveLearning ? q.explanation ?? null : null,
        hint: adaptiveLearning ? q.hint ?? null : null,
      })),
    };

    return NextResponse.json({ message: "Quiz generated", quiz: safeQuiz });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to process file" }, { status: 500 });
  }
}
