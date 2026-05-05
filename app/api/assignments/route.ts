import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildOwnedOrMemberWhere,
  buildOwnedOrWritableWhere,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";

function toNullableDate(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignments = await prisma.assignment.findMany({
    where: buildOwnedOrMemberWhere(user),
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
  const user = await getCurrentUserAccessContext();
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
    where: { id: classId, archived: false, ...buildOwnedOrWritableWhere(user) },
    select: { id: true, name: true, organizationId: true },
  });
  if (!classRecord) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  if (quizId) {
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, ...buildOwnedOrMemberWhere(user) },
      select: { id: true, organizationId: true },
    });
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    if (classRecord.organizationId && quiz.organizationId && quiz.organizationId !== classRecord.organizationId) {
      return NextResponse.json({ error: "Quiz belongs to a different organization" }, { status: 400 });
    }
  }

  if (lessonPlanId) {
    const lessonPlan = await prisma.lessonPlan.findFirst({
      where: { id: lessonPlanId, ...buildOwnedOrMemberWhere(user) },
      select: { id: true, organizationId: true },
    });
    if (!lessonPlan) {
      return NextResponse.json({ error: "Lesson plan not found" }, { status: 404 });
    }
    if (
      classRecord.organizationId &&
      lessonPlan.organizationId &&
      lessonPlan.organizationId !== classRecord.organizationId
    ) {
      return NextResponse.json(
        { error: "Lesson plan belongs to a different organization" },
        { status: 400 },
      );
    }
  }

  const availableFrom = toNullableDate(body?.availableFrom);
  const dueAt = toNullableDate(body?.dueAt);

  const assignment = await prisma.assignment.create({
    data: {
      userId: user.id,
      organizationId: classRecord.organizationId,
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
