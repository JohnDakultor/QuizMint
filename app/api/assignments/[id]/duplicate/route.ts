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

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const source = await prisma.assignment.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
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
