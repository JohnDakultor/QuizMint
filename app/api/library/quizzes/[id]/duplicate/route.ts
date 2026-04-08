import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

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
  const quizId = Number(id);
  if (!Number.isFinite(quizId)) {
    return NextResponse.json({ error: "Invalid quiz id" }, { status: 400 });
  }

  const source = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      userId: user.id,
    },
    select: {
      title: true,
      instructions: true,
      questions: {
        orderBy: { id: "asc" },
        select: {
          question: true,
          options: true,
          answer: true,
          explanation: true,
          hint: true,
        },
      },
    },
  });

  if (!source) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const duplicate = await prisma.quiz.create({
    data: {
      userId: user.id,
      title: `${source.title} Copy`,
      instructions: source.instructions,
      questions: {
        create: source.questions.map((question) => ({
          question: question.question,
          options: question.options,
          answer: question.answer,
          explanation: question.explanation,
          hint: question.hint,
        })),
      },
    },
    select: {
      id: true,
      title: true,
    },
  });

  return NextResponse.json({ quiz: duplicate }, { status: 201 });
}
