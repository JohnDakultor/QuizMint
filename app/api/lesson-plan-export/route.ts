import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import {
  LessonPlanExportFormat,
  LessonPlanExportInput,
  getLessonPlanExportHash,
} from "@/lib/lesson-plan-export";

export const runtime = "nodejs";

const allowedFormats = new Set<LessonPlanExportFormat>(["docx", "pdf", "pptx"]);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.subscriptionPlan !== "premium") {
      return NextResponse.json(
        { error: "Premium required for exports" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const format = String(body?.format || "").toLowerCase() as LessonPlanExportFormat;
    if (!allowedFormats.has(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    let lessonPlan = body?.lessonPlan;
    let topic = String(body?.topic || "").trim();
    let subject = String(body?.subject || "").trim();
    let grade = String(body?.grade || "").trim();
    let days = Number(body?.days || 0);
    let minutesPerDay = Number(body?.minutesPerDay || 0);
    const lessonPlanId = body?.lessonPlanId ? String(body.lessonPlanId) : null;

    if (!lessonPlan && lessonPlanId) {
      const stored = await prisma.lessonPlan.findFirst({
        where: { id: lessonPlanId, userId: user.id },
      });
      if (!stored) {
        return NextResponse.json(
          { error: "Lesson plan not found" },
          { status: 404 }
        );
      }
      lessonPlan = stored.data;
      topic = stored.topic;
      subject = stored.subject;
      grade = stored.grade;
      days = stored.days;
      minutesPerDay = stored.minutesPerDay;
    }

    if (!lessonPlan || !topic || !subject || !grade || !days || !minutesPerDay) {
      return NextResponse.json(
        { error: "Missing export input" },
        { status: 400 }
      );
    }

    const input: LessonPlanExportInput = {
      lessonPlan,
      topic,
      subject,
      grade,
      days,
      minutesPerDay,
    };
    const inputHash = getLessonPlanExportHash(input);

    const existing = await prisma.lessonPlanExport.findUnique({
      where: {
        userId_format_inputHash: {
          userId: user.id,
          format,
          inputHash,
        },
      },
      select: { id: true, status: true, fileName: true, completedAt: true },
    });

    if (existing && existing.status === "completed") {
      return NextResponse.json({
        jobId: existing.id,
        status: existing.status,
        ready: true,
      });
    }

    if (existing && (existing.status === "queued" || existing.status === "processing")) {
      return NextResponse.json({
        jobId: existing.id,
        status: existing.status,
        ready: false,
      });
    }

    const job = await prisma.lessonPlanExport.upsert({
      where: {
        userId_format_inputHash: {
          userId: user.id,
          format,
          inputHash,
        },
      },
      update: {
        status: "queued",
        input,
        lessonPlanId,
        error: null,
        startedAt: null,
        completedAt: null,
      },
      create: {
        userId: user.id,
        lessonPlanId,
        format,
        status: "queued",
        inputHash,
        input,
      },
      select: { id: true, status: true },
    });

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      ready: false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to queue export" },
      { status: 500 }
    );
  }
}
