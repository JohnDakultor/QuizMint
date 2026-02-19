import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { generateLessonPlanPptAI } from "@/lib/lesson-plan-ppt-ai";

const PROVIDER_ISSUE_MESSAGE =
  "Server issue - we're fixing it. Please try again in a few minutes.";

function isProviderIssueError(err: unknown): boolean {
  const message = String((err as { message?: string })?.message || "");
  return (
    message.includes("AI response failed:") ||
    message.includes("Quota exceeded") ||
    message.includes('"code":402') ||
    message.includes("Provider returned error")
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { subscriptionPlan: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.subscriptionPlan !== "premium") {
      return NextResponse.json(
        { error: "Premium required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { lessonPlan, topic, subject, grade, duration } = body || {};

    if (!lessonPlan || !topic || !subject || !grade || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const deck = await generateLessonPlanPptAI({
      lessonPlan,
      topic,
      subject,
      grade,
      duration,
      isProOrPremium: true,
    });

    return NextResponse.json({ deck });
  } catch (err: any) {
    console.error("Lesson plan slides error:", err);
    if (isProviderIssueError(err)) {
      return NextResponse.json({ error: PROVIDER_ISSUE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
