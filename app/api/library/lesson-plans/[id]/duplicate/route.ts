import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const source = await prisma.lessonPlan.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      title: true,
      topic: true,
      subject: true,
      grade: true,
      duration: true,
      days: true,
      minutesPerDay: true,
      data: true,
    },
  });

  if (!source) {
    return NextResponse.json({ error: "Lesson plan not found" }, { status: 404 });
  }

  const duplicate = await prisma.lessonPlan.create({
    data: {
      userId: user.id,
      title: `${source.title} Copy`,
      topic: source.topic,
      subject: source.subject,
      grade: source.grade,
      duration: source.duration,
      days: source.days,
      minutesPerDay: source.minutesPerDay,
      data:
        source.data === null
          ? Prisma.JsonNull
          : (source.data as Prisma.InputJsonValue),
    },
    select: {
      id: true,
      title: true,
    },
  });

  return NextResponse.json({ lessonPlan: duplicate }, { status: 201 });
}
