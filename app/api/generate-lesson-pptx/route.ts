import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { generateLessonPlanPptx } from "@/lib/generate-lesson-plan-pptx";
import type { PptDeck } from "@/lib/lesson-plan-ppt-ai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { subscriptionPlan: true },
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    if (user.subscriptionPlan !== "premium") {
      return new Response("Premium required", { status: 403 });
    }

    const body = await req.json();
    const deck = body?.deck as PptDeck | undefined;

    if (!deck || !deck.slides || !Array.isArray(deck.slides)) {
      return new Response("Invalid deck", { status: 400 });
    }

    const pptxBuffer = await generateLessonPlanPptx(deck);
    return new Response(new Uint8Array(pptxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${(deck.title || "Lesson_Plan")
          .replace(/\s+/g, "_")
          .slice(0, 50)}.pptx"`,
      },
    });
  } catch (err: any) {
    console.error("Generate PPTX error:", err);
    return new Response(`Failed to generate PPTX: ${err.message}`, {
      status: 500,
    });
  }
}
