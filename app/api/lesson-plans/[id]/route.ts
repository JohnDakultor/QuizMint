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

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const lessonPlan = await prisma.lessonPlan.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
      topic: true,
      subject: true,
    },
  });

  if (!lessonPlan) {
    return NextResponse.json({ error: "Lesson plan not found" }, { status: 404 });
  }

  await prisma.lessonPlan.delete({
    where: { id: lessonPlan.id },
  });

  return NextResponse.json({
    ok: true,
    lessonPlan,
  });
}
