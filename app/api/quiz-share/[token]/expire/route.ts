import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { verifyQuizShareToken } from "@/lib/quiz-share";

type RouteParams = {
  params: Promise<{ token: string }>;
};

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

    const cookieName = `quiz_take_${verified.quizId}`;
    const takeSessionId = req.cookies.get(cookieName)?.value ?? "";
    const assessmentCookieName = `quiz_assessment_${verified.quizId}`;
    if (!takeSessionId) {
      const response = NextResponse.json(
        { ok: true, requestId },
        {
          headers: {
            "x-request-id": requestId,
            "Cache-Control": "no-store",
          },
        }
      );
      response.cookies.set(assessmentCookieName, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0),
      });
      return response;
    }

    await prisma.studentQuizTake.upsert({
      where: {
        quizId_takeSessionId: {
          quizId: verified.quizId,
          takeSessionId,
        },
      },
      update: {},
      create: {
        quizId: verified.quizId,
        takeSessionId,
      },
    });

    const response = NextResponse.json(
      { ok: true, requestId },
      {
        headers: {
          "x-request-id": requestId,
          "Cache-Control": "no-store",
        },
      }
    );
    response.cookies.set(assessmentCookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });
    return response;
  } catch (err) {
    logApiError(requestId, "quiz-share-expire", err);
    return apiError(500, "Failed to expire quiz session", requestId);
  }
}
