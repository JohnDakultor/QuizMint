import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildOwnedOrWritableWhere,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const source = await prisma.assignment.findFirst({
    where: {
      id,
      ...buildOwnedOrWritableWhere(user),
    },
    select: {
      id: true,
      organizationId: true,
      classId: true,
      quizId: true,
      lessonPlanId: true,
      title: true,
      instructions: true,
    },
  });

  if (!source) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const duplicate = await prisma.assignment.create({
    data: {
      userId: user.id,
      organizationId: source.organizationId,
      classId: source.classId,
      quizId: source.quizId,
      lessonPlanId: source.lessonPlanId,
      title: `${source.title} Copy`,
      instructions: source.instructions,
      status: "draft",
      availableFrom: null,
      dueAt: null,
      closedAt: null,
      shareToken: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      class: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ assignment: duplicate }, { status: 201 });
}
