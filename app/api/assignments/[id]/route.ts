import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildOwnedOrMemberWhere,
  buildOwnedOrWritableWhere,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";

function toOptionalDate(value: unknown) {
  if (value === undefined) return undefined;
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const assignment = await prisma.assignment.findFirst({
    where: { id, ...buildOwnedOrMemberWhere(user) },
    select: {
      id: true,
      title: true,
      instructions: true,
      status: true,
      availableFrom: true,
      dueAt: true,
      closedAt: true,
      createdAt: true,
      updatedAt: true,
      class: {
        select: {
          id: true,
          name: true,
          subject: true,
          gradeLevel: true,
          section: true,
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
      attempts: {
        orderBy: { submittedAt: "desc" },
        take: 20,
        select: {
          id: true,
          studentName: true,
          studentEmail: true,
          scorePercent: true,
          correctAnswers: true,
          totalQuestions: true,
          submittedAt: true,
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  return NextResponse.json({ assignment });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.assignment.findFirst({
    where: { id, ...buildOwnedOrWritableWhere(user) },
    select: { id: true, organizationId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        classId?: string;
        title?: string;
        instructions?: string;
        status?: string;
        availableFrom?: string | null;
        dueAt?: string | null;
        closedAt?: string | null;
      }
    | null;

  const nextTitle = body?.title === undefined ? undefined : String(body.title || "").trim();
  const nextClassId = body?.classId === undefined ? undefined : String(body.classId || "").trim();
  if (nextTitle !== undefined && !nextTitle) {
    return NextResponse.json({ error: "Assignment title is required" }, { status: 400 });
  }
  if (nextClassId !== undefined && !nextClassId) {
    return NextResponse.json({ error: "Class is required" }, { status: 400 });
  }

  if (nextClassId) {
    const classRecord = await prisma.class.findFirst({
      where: {
        id: nextClassId,
        archived: false,
        ...buildOwnedOrWritableWhere(user),
      },
      select: {
        id: true,
        organizationId: true,
      },
    });
    if (!classRecord) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    if (existing.organizationId && classRecord.organizationId !== existing.organizationId) {
      return NextResponse.json({ error: "Class belongs to a different organization" }, { status: 400 });
    }
  }

  const nextAvailableFrom = toOptionalDate(body?.availableFrom);
  const nextDueAt = toOptionalDate(body?.dueAt);
  const nextClosedAt = toOptionalDate(body?.closedAt);
  const requestedStatus =
    body?.status === undefined ? undefined : String(body.status || "").trim() || "draft";
  const computedStatus =
    requestedStatus === undefined
      ? undefined
      : requestedStatus === "closed"
      ? "closed"
      : nextClosedAt
      ? "closed"
      : nextAvailableFrom && nextAvailableFrom.getTime() > Date.now()
      ? "scheduled"
      : requestedStatus === "draft"
      ? "draft"
      : "open";

  const assignment = await prisma.assignment.update({
    where: { id: existing.id },
    data: {
      classId: nextClassId,
      title: nextTitle,
      instructions:
        body?.instructions === undefined ? undefined : String(body.instructions || "").trim() || null,
      status: computedStatus,
      availableFrom: nextAvailableFrom,
      dueAt: nextDueAt,
      closedAt:
        requestedStatus === undefined
          ? nextClosedAt
          : requestedStatus === "closed"
          ? nextClosedAt || new Date()
          : requestedStatus === "open" || requestedStatus === "scheduled" || requestedStatus === "draft"
          ? null
          : nextClosedAt,
      shareToken:
        requestedStatus === "closed" || nextClassId !== undefined || nextDueAt !== undefined
          ? undefined
          : undefined,
    },
    select: {
      id: true,
      title: true,
      status: true,
      availableFrom: true,
      dueAt: true,
      closedAt: true,
      updatedAt: true,
      class: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ assignment });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.assignment.findFirst({
    where: { id, ...buildOwnedOrWritableWhere(user) },
    select: {
      id: true,
      title: true,
      class: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  await prisma.assignment.delete({
    where: { id: existing.id },
  });

  return NextResponse.json({
    ok: true,
    assignment: {
      id: existing.id,
      title: existing.title,
      class: existing.class,
    },
  });
}
