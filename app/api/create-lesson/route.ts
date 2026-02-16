import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { generateLessonAI } from "@/lib/lesson-generation-ai";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const lessonPlan = body.lessonPlan;
    if (!lessonPlan) return NextResponse.json({ error: "Lesson plan missing" }, { status: 400 });

    const lessonContent = await generateLessonAI(lessonPlan, user.subscriptionPlan || "free");

    // Optionally save the lesson in DB
    // await prisma.lesson.create({
    //   data: {
    //     userId: user.id,
    //     title: lessonPlan.title,
    //     content: lessonContent,
    //   },
    // });

    return NextResponse.json({ lessonContent });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
