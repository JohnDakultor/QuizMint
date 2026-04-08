import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { randomUUID } from "crypto";
import { inferQuizQuestionType } from "@/lib/quiz-question-types";
import {
  buildQuizArtifactsFromPersistedQuiz,
  getQuizArtifactsFromGenerationMetadata,
} from "@/lib/quiz-artifacts";

type RouteParams = {
  params: Promise<{ token: string }>;
};

function hashSeed(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededShuffle<T>(arr: T[], seedInput: string) {
  const out = [...arr];
  let seed = hashSeed(seedInput) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const requestId = createRequestId();
  try {
    const { token } = await params;
    if (!token) return apiError(400, "Missing token", requestId);

    const assignment = await prisma.assignment.findFirst({
      where: { shareToken: token },
      include: {
        quiz: {
          include: {
            questions: true,
            shareSettings: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            gradeLevel: true,
            section: true,
          },
        },
      },
    });

    if (!assignment || !assignment.quiz) {
      return apiError(404, "Assignment not found", requestId);
    }
    if (assignment.status === "closed" || assignment.closedAt) {
      return apiError(410, "Assignment is closed by the teacher", requestId);
    }
    if (assignment.availableFrom && new Date(assignment.availableFrom).getTime() > Date.now()) {
      return apiError(403, "Assignment is not available yet", requestId);
    }
    if (assignment.dueAt && new Date(assignment.dueAt).getTime() < Date.now()) {
      return apiError(410, "Assignment due date has passed", requestId);
    }
    if (assignment.quiz.shareSettings && assignment.quiz.shareSettings.isOpen === false) {
      return apiError(410, "Quiz is closed by the teacher", requestId);
    }

    const cookieName = `assignment_take_${assignment.id}`;
    const existingTakeSessionId = _req.cookies.get(cookieName)?.value ?? "";
    const takeSessionId = existingTakeSessionId || randomUUID();

    if (existingTakeSessionId) {
      const existingTake = await prisma.studentQuizTake.findUnique({
        where: {
          quizId_takeSessionId: {
            quizId: assignment.quiz.id,
            takeSessionId: existingTakeSessionId,
          },
        },
        select: { id: true },
      });
      if (existingTake) {
        return apiError(
          410,
          "This assignment session expired or was already completed. Reopen the shared link to start again.",
          requestId,
        );
      }
    }

    const eventRows = await prisma.$queryRaw<Array<{ metadata: unknown; createdAt: Date }>>`
      SELECT "metadata", "createdAt"
      FROM "GenerationEvent"
      WHERE "eventType" = 'quiz_generated'
        AND "status" = 'success'
        AND ("feature" = 'quiz' OR "feature" = 'quiz_file_upload')
        AND ("metadata"->>'quizId') = ${String(assignment.quiz.id)}
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    const eventMeta =
      eventRows[0]?.metadata &&
      typeof eventRows[0].metadata === "object" &&
      !Array.isArray(eventRows[0].metadata)
        ? (eventRows[0].metadata as Record<string, unknown>)
        : null;
    const quizArtifacts =
      getQuizArtifactsFromGenerationMetadata(eventMeta) ||
      buildQuizArtifactsFromPersistedQuiz(assignment.quiz);

    const difficultyRaw =
      typeof eventMeta?.difficulty === "string"
        ? eventMeta.difficulty
        : typeof eventMeta?.effectiveDifficulty === "string"
        ? eventMeta.effectiveDifficulty
        : "medium";
    const difficulty =
      difficultyRaw === "easy" || difficultyRaw === "medium" || difficultyRaw === "hard"
        ? difficultyRaw
        : "medium";

    const questions = quizArtifacts.questions.map((q) => ({
      ...q,
      options: Array.isArray(q.options)
        ? seededShuffle(q.options, `${takeSessionId}:${q.id}:opts`)
        : [],
    }));

    const response = NextResponse.json(
      {
        ok: true,
        assignment: {
          id: assignment.id,
          title: assignment.title,
          instructions: assignment.instructions,
          availableFrom: assignment.availableFrom,
          dueAt: assignment.dueAt,
          class: assignment.class,
        },
        quiz: {
          id: assignment.quiz.id,
          title: assignment.quiz.title,
          instructions: assignment.quiz.instructions,
          createdAt: assignment.quiz.createdAt,
          difficulty,
          questions: questions.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            structure: q.structure,
            questionType:
              q.questionType || q.structure?.type || inferQuizQuestionType(q.question, q.options),
          })),
        },
        availability: {
          dueAt: assignment.dueAt,
          availableFrom: assignment.availableFrom,
        },
        requestId,
      },
      {
        headers: {
          "x-request-id": requestId,
          "Cache-Control": "no-store",
        },
      },
    );

    if (!existingTakeSessionId || takeSessionId !== existingTakeSessionId) {
      response.cookies.set(cookieName, takeSessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    return response;
  } catch (err) {
    logApiError(requestId, "assignment-share-get", err);
    return apiError(500, "Failed to load shared assignment", requestId);
  }
}
