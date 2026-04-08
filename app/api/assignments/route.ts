import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true },
  });
}

function toNullableDate(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignments = await prisma.assignment.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 25,
    select: {
      id: true,
      title: true,
      instructions: true,
      status: true,
      availableFrom: true,
      dueAt: true,
      closedAt: true,
      createdAt: true,
      class: {
        select: {
          id: true,
          name: true,
          subject: true,
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
      lessonPlan: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
    },
  });

  return NextResponse.json({ assignments });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        classId?: string;
        quizId?: number;
        lessonPlanId?: string;
        title?: string;
        instructions?: string;
        availableFrom?: string;
        dueAt?: string;
      }
    | null;

  const classId = String(body?.classId || "").trim();
  const title = String(body?.title || "").trim();
  const quizId = body?.quizId === undefined ? null : Number(body.quizId);
  const lessonPlanId = String(body?.lessonPlanId || "").trim() || null;

  if (!classId) {
    return NextResponse.json({ error: "Class is required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Assignment title is required" }, { status: 400 });
  }
  if (!quizId && !lessonPlanId) {
    return NextResponse.json(
      { error: "Link a quiz or lesson plan before creating an assignment" },
      { status: 400 },
    );
  }

  const classRecord = await prisma.class.findFirst({
    where: { id: classId, userId: user.id, archived: false },
    select: { id: true, name: true },
  });
  if (!classRecord) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (quizId) {
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, userId: user.id },
      select: { id: true },
    });
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
  }

  if (lessonPlanId) {
    const lessonPlan = await prisma.lessonPlan.findFirst({
      where: { id: lessonPlanId, userId: user.id },
      select: { id: true },
    });
    if (!lessonPlan) {
      return NextResponse.json({ error: "Lesson plan not found" }, { status: 404 });
    }
  }

  const availableFrom = toNullableDate(body?.availableFrom);
  const dueAt = toNullableDate(body?.dueAt);

  const assignment = await prisma.assignment.create({
    data: {
      userId: user.id,
      classId,
      quizId,
      lessonPlanId,
      title,
      instructions: String(body?.instructions || "").trim() || null,
      availableFrom,
      dueAt,
      status: dueAt ? "scheduled" : "draft",
    },
    select: {
      id: true,
      title: true,
      instructions: true,
      status: true,
      availableFrom: true,
      dueAt: true,
      closedAt: true,
      createdAt: true,
      class: {
        select: {
          id: true,
          name: true,
          subject: true,
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
      lessonPlan: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
    },
  });

  return NextResponse.json({ assignment }, { status: 201 });
}
