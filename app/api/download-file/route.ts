import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PptxGenJS from "pptxgenjs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { quiz, format } = body;

    if (!quiz) return NextResponse.json({ error: "Quiz data is required" }, { status: 400 });

    // ------------------- Premium check for Word/PPT -------------------
    if (format === "word" || format === "ppt") {
      if (user.subscriptionPlan !== "premium")
        return NextResponse.json(
          { error: "You must subscribe to download Word/PPT files." },
          { status: 403 }
        );
    }

    // ------------------- Word (.docx) -------------------
    if (format === "word") {
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [new TextRun({ text: quiz.title, bold: true })],
              }),
              new Paragraph({
                children: [new TextRun({ text: quiz.instructions, italics: true })],
              }),
              ...quiz.questions.map((q: any, i: number) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: `${i + 1}. ${q.question}\n`, bold: true }),
                    ...q.options.map(
                      (opt: string, j: number) =>
                        new TextRun({ text: `   ${String.fromCharCode(97 + j)}) ${opt}\n` })
                    ),
                    new TextRun({ text: `   Answer: ${q.answer}\n\n`, italics: true }),
                  ],
                })
              ),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename=quiz.docx`,
        },
      });
    }

    // ------------------- PPT (.pptx) -------------------
    if (format === "ppt") {
      const pptx = new PptxGenJS();
      pptx.title = quiz.title;

      pptx.addSlide().addText(quiz.title, { x: 1, y: 1, fontSize: 24, bold: true });
      pptx.addSlide().addText(quiz.instructions, { x: 1, y: 2, fontSize: 16, italic: true });

      quiz.questions.forEach((q: any, i: number) => {
        const slide = pptx.addSlide();
        slide.addText(`${i + 1}. ${q.question}`, { x: 0.5, y: 0.5, fontSize: 18, bold: true });
        slide.addText(
          q.options.map((opt: string, j: number) => `${String.fromCharCode(97 + j)}) ${opt}`).join("\n"),
          { x: 0.5, y: 1.5, fontSize: 14 }
        );
        slide.addText(`Answer: ${q.answer}`, { x: 0.5, y: 3, fontSize: 14, color: "00AA00" });
      });

      // Make sure output is an ArrayBuffer
      const arrayBuffer = await pptx.write({ outputType: "arraybuffer" }) as ArrayBuffer;
      return new Response(new Uint8Array(arrayBuffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename=quiz.pptx`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}