import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { verifyQuizShareToken } from "@/lib/quiz-share";
import { trackGenerationEvent } from "@/lib/generation-events";
import { randomUUID } from "crypto";
import { Prisma } from "@/lib/generated/prisma/client";
import { inferQuizQuestionType } from "@/lib/quiz-question-types";
import {
  decodeStoredAnswer,
  gradeMatchingFromStructure,
  gradeWorksheetFromStructure,
} from "@/lib/quiz-structured";

type RouteParams = {
  params: Promise<{ token: string }>;
};

function normalizeForCompare(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[.,!?;:()]/g, "")
    .replace(/\s+/g, " ");
}

function answersMatch(selected: string, expected: string) {
  return normalizeForCompare(selected) === normalizeForCompare(expected);
}

function shortAnswerMatches(selected: string, expected: string) {
  const a = normalizeForCompare(selected);
  const b = normalizeForCompare(expected);
  if (!a || !b) return false;
  if (a === b) return true;

  // Accept close phrasing for opinion/explanation style items.
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) {
    return true;
  }

  const stopwords = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "to",
    "of",
    "and",
    "or",
    "in",
    "on",
    "for",
    "with",
    "by",
    "from",
    "that",
    "this",
    "it",
    "as",
    "at",
  ]);
  const toKeyTokens = (text: string) =>
    text
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length > 2 && !stopwords.has(t));

  const selectedTokens = toKeyTokens(a);
  const expectedTokens = toKeyTokens(b);
  if (selectedTokens.length === 0 || expectedTokens.length === 0) return false;

  const selectedSet = new Set(selectedTokens);
  const expectedSet = new Set(expectedTokens);
  let overlap = 0;
  expectedSet.forEach((token) => {
    if (selectedSet.has(token)) overlap += 1;
  });

  const expectedCoverage = overlap / expectedSet.size;
  const selectedCoverage = overlap / selectedSet.size;
  return expectedCoverage >= 0.6 || selectedCoverage >= 0.6;
}

function parsePairs(value: string) {
  return String(value || "")
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s*(?:->|:|-|=)\s*/);
      if (parts.length < 2) return null;
      const left = normalizeForCompare(parts[0]);
      const right = normalizeForCompare(parts.slice(1).join(" "));
      if (!left || !right) return null;
      return `${left}=>${right}`;
    })
    .filter((x): x is string => Boolean(x));
}

function matchingAnswersMatch(selected: string, expected: string) {
  const selectedPairs = parsePairs(selected);
  const expectedPairs = parsePairs(expected);
  if (!selectedPairs.length || !expectedPairs.length) return shortAnswerMatches(selected, expected);
  const selectedSet = new Set(selectedPairs);
  const expectedSet = new Set(expectedPairs);
  let overlap = 0;
  expectedSet.forEach((pair) => {
    if (selectedSet.has(pair)) overlap += 1;
  });
  return overlap / expectedSet.size >= 0.6;
}

function worksheetMatches(selected: string, expected: string) {
  const a = normalizeForCompare(selected).replace(/\s+/g, "");
  const b = normalizeForCompare(expected).replace(/\s+/g, "");
  if (!a || !b) return false;
  if (a === b) return true;
  const an = Number(a);
  const bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) {
    return Math.abs(an - bn) <= 0.001;
  }
  return shortAnswerMatches(selected, expected);
}

function gradeTimelineOrder(selectedRaw: string, timelineItems: string[]) {
  if (!Array.isArray(timelineItems) || timelineItems.length < 3) return false;
  const normalizedExpected = timelineItems.map((item) => normalizeForCompare(item));
  if (normalizedExpected.some((item) => !item)) return false;

  try {
    const parsed = JSON.parse(String(selectedRaw || ""));
    const order = Array.isArray(parsed?.order) ? parsed.order : [];
    const normalizedSelected = order.map((item) => normalizeForCompare(String(item || "")));
    if (normalizedSelected.length !== normalizedExpected.length) return false;
    return normalizedSelected.every((item, idx) => item === normalizedExpected[idx]);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const requestId = createRequestId();
  try {
    const { token } = await params;
    if (!token) return apiError(400, "Missing token", requestId);

    const verified = verifyQuizShareToken(token);
    if (!verified.ok) {
      if (verified.reason === "expired") {
        return apiError(410, "Share link expired", requestId);
      }
      return apiError(400, "Invalid share link", requestId);
    }

    const body = await req.json();
    const answersInput =
      body?.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
        ? (body.answers as Record<string, string>)
        : null;
    if (!answersInput) return apiError(400, "Invalid answers payload", requestId);
    const studentName =
      typeof body?.studentName === "string" ? body.studentName.trim().slice(0, 120) : "";
    const studentEmail =
      typeof body?.studentEmail === "string"
        ? body.studentEmail.trim().toLowerCase().slice(0, 200)
        : "";
    if (!studentName) {
      return apiError(400, "Student name is required", requestId);
    }
    if (!studentEmail) {
      return apiError(400, "Student email is required", requestId);
    }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail);
    if (!emailValid) {
      return apiError(400, "Please enter a valid email address", requestId);
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: verified.quizId },
      include: {
        questions: true,
        shareSettings: true,
      },
    });
    if (!quiz) return apiError(404, "Quiz not found", requestId);
    if (quiz.shareSettings && quiz.shareSettings.isOpen === false) {
      return apiError(410, "Quiz is closed by the teacher", requestId);
    }
    if (
      quiz.shareSettings?.expiresAt &&
      new Date(quiz.shareSettings.expiresAt).getTime() < Date.now()
    ) {
      return apiError(410, "Quiz timer has ended", requestId);
    }
    const existingRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM "StudentQuizAttempt"
      WHERE "quizId" = ${quiz.id}
        AND "studentEmail" = ${studentEmail}
    `;
    if ((existingRows[0]?.count ?? 0) > 0) {
      return apiError(
        409,
        "This email has already submitted this quiz. Ask your teacher if a retake is needed.",
        requestId
      );
    }

    const cookieName = `quiz_take_${quiz.id}`;
    let takeSessionId = req.cookies.get(cookieName)?.value ?? randomUUID();

    try {
      await prisma.studentQuizTake.create({
        data: {
          quizId: quiz.id,
          takeSessionId,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return apiError(
          410,
          "This quiz session expired or was already completed. Reopen the shared link to start again.",
          requestId
        );
      } else {
        throw err;
      }
    }

    const details = quiz.questions.map((q) => {
      const raw = answersInput[String(q.id)];
      const selected = typeof raw === "string" ? raw : "";
      const decoded = decodeStoredAnswer(q.answer);
      const questionType = decoded.structure?.type ?? inferQuizQuestionType(q.question, q.options);
      const expectedAnswer = decoded.answer;
      let correct = false;
      if (questionType === "short_answer" || questionType === "essay_rubric") {
        correct = shortAnswerMatches(selected, expectedAnswer);
      } else if (questionType === "matching") {
        correct =
          decoded.structure?.type === "matching"
            ? gradeMatchingFromStructure(selected, decoded.structure)
            : matchingAnswersMatch(selected, expectedAnswer);
      } else if (
        decoded.structure?.type === "gamified" &&
        decoded.structure.mode === "timeline" &&
        Array.isArray(decoded.structure.timelineItems)
      ) {
        correct = gradeTimelineOrder(selected, decoded.structure.timelineItems);
      } else if (questionType === "worksheet") {
        correct =
          decoded.structure?.type === "worksheet"
            ? gradeWorksheetFromStructure(selected, decoded.structure, worksheetMatches)
            : worksheetMatches(selected, expectedAnswer);
      } else {
        correct = answersMatch(selected, expectedAnswer);
      }
      return {
        questionId: q.id,
        question: q.question,
        questionType,
        selected,
        correctAnswer: expectedAnswer,
        correct,
      };
    });

    const total = details.length;
    const correct = details.filter((d) => d.correct).length;
    const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent") || null;

    await prisma.$executeRaw`
      INSERT INTO "StudentQuizAttempt" (
        "id",
        "quizId",
        "studentName",
        "studentEmail",
        "scorePercent",
        "correctAnswers",
        "totalQuestions",
        "result",
        "ip",
        "userAgent",
        "submittedAt",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${quiz.id},
        ${studentName},
        ${studentEmail},
        ${scorePercent},
        ${correct},
        ${total},
        ${JSON.stringify(details)}::jsonb,
        ${ip},
        ${userAgent},
        NOW(),
        NOW()
      )
    `;

    await trackGenerationEvent({
      userId: null,
      eventType: "quiz_submitted",
      feature: "quiz_share",
      status: "success",
      plan: null,
      latencyMs: undefined,
      costUsd: 0,
      metadata: {
        quizId: quiz.id,
        studentName,
        studentEmail,
        totalQuestions: total,
        correctAnswers: correct,
        scorePercent,
      },
    });

    const response = NextResponse.json(
      {
        ok: true,
        result: {
          total,
          correct,
          scorePercent,
          details,
        },
        requestId,
      },
      {
        headers: {
          "x-request-id": requestId,
          "Cache-Control": "no-store",
        },
      }
    );
    response.cookies.set(cookieName, randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch (err) {
    logApiError(requestId, "quiz-share-submit", err);
    return apiError(500, "Failed to submit quiz", requestId);
  }
}
