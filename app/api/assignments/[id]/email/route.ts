import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Resend } from "resend";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { apiError, createRequestId, logApiError } from "@/lib/api-error";
import { trackGenerationEvent } from "@/lib/generation-events";

const ROSTER_EMAIL_COOLDOWN_MINUTES = 15;
const REMINDER_EMAIL_COOLDOWN_HOURS = 8;
const DAILY_EMAIL_ACTION_LIMIT = 30;
const DAILY_EMAIL_RECIPIENT_LIMIT = 1000;

function formatDateTime(value: Date | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function extractAssignmentId(
  metadata: unknown,
): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).assignmentId;
  return typeof value === "string" ? value : null;
}

function extractRecipientCount(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return 0;
  const value = (metadata as Record<string, unknown>).recipientCount;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = createRequestId();
  let userId: string | null = null;
  let assignmentId: string | null = null;
  let mode: "missing_only" | "all" = "all";
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return apiError(401, "Unauthorized", requestId);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return apiError(404, "User not found", requestId);
    userId = user.id;

    const { id } = await context.params;
    assignmentId = id;
    const body = await req.json().catch(() => ({}));
    mode = body?.mode === "missing_only" ? "missing_only" : "all";

    const assignment = await prisma.assignment.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        title: true,
        instructions: true,
        dueAt: true,
        availableFrom: true,
        shareToken: true,
        quizId: true,
        quiz: {
          select: {
            id: true,
            title: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            students: {
              where: {
                studentEmail: {
                  not: null,
                },
              },
              select: {
                id: true,
                studentName: true,
                studentEmail: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
        attempts: {
          select: {
            studentEmail: true,
          },
        },
      },
    });

    if (!assignment || !assignment.quizId || !assignment.quiz) {
      return apiError(404, "Quiz assignment not found", requestId);
    }

    const submittedEmails = new Set(
      assignment.attempts
        .map((attempt) => String(attempt.studentEmail || "").trim().toLowerCase())
        .filter(Boolean),
    );

    const recipients = assignment.class.students
      .map((student) => ({
        id: student.id,
        studentName: student.studentName,
        studentEmail: String(student.studentEmail || "").trim().toLowerCase(),
      }))
      .filter((student) => student.studentEmail)
      .filter((student) => (mode === "missing_only" ? !submittedEmails.has(student.studentEmail) : true));

    if (recipients.length === 0) {
      return apiError(
        400,
        mode === "missing_only"
          ? "There are no missing roster students with email addresses to remind."
          : "Add roster emails first so the quiz link can be sent to students.",
        requestId,
      );
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const successfulEmailEvents = await prisma.generationEvent.findMany({
      where: {
        userId: user.id,
        status: "success",
        createdAt: {
          gte: startOfDay,
        },
        eventType: {
          in: ["assignment_roster_emailed", "assignment_missing_students_reminded"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        eventType: true,
        createdAt: true,
        metadata: true,
      },
    });

    const todaysActionCount = successfulEmailEvents.length;
    const todaysRecipientCount = successfulEmailEvents.reduce(
      (sum, event) => sum + extractRecipientCount(event.metadata),
      0,
    );

    if (todaysActionCount >= DAILY_EMAIL_ACTION_LIMIT) {
      return apiError(
        429,
        "Daily assignment email limit reached. Try again tomorrow.",
        requestId,
      );
    }

    if (todaysRecipientCount + recipients.length > DAILY_EMAIL_RECIPIENT_LIMIT) {
      return apiError(
        429,
        "Daily recipient limit reached for assignment emails. Try again tomorrow.",
        requestId,
      );
    }

    const matchingAssignmentEvents = successfulEmailEvents.filter(
      (event) => extractAssignmentId(event.metadata) === assignment.id,
    );
    const latestSameModeEvent = matchingAssignmentEvents.find((event) =>
      mode === "missing_only"
        ? event.eventType === "assignment_missing_students_reminded"
        : event.eventType === "assignment_roster_emailed",
    );

    if (latestSameModeEvent) {
      const cooldownMs =
        mode === "missing_only"
          ? REMINDER_EMAIL_COOLDOWN_HOURS * 60 * 60 * 1000
          : ROSTER_EMAIL_COOLDOWN_MINUTES * 60 * 1000;
      const nextAllowedAt = latestSameModeEvent.createdAt.getTime() + cooldownMs;

      if (Date.now() < nextAllowedAt) {
        const nextLabel = formatDateTime(new Date(nextAllowedAt));
        return apiError(
          429,
          mode === "missing_only"
            ? `A reminder was already sent recently for this assignment. You can send the next reminder after ${nextLabel}.`
            : `This assignment link was already emailed recently. You can resend it after ${nextLabel}.`,
          requestId,
        );
      }
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return apiError(500, "RESEND_API_KEY is not configured", requestId);
    }

    const shareToken = assignment.shareToken || randomUUID();
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        shareToken,
        status:
          assignment.availableFrom && assignment.availableFrom.getTime() > Date.now()
            ? "scheduled"
            : "open",
      },
    });

    const shareUrl = `${req.nextUrl.origin}/assignment/${encodeURIComponent(shareToken)}`;
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || "QuizMintAI <no-reply@quizmintai.com>";
    const dueLabel = formatDateTime(assignment.dueAt);
    const availableLabel = formatDateTime(assignment.availableFrom);
    const isReminder = mode === "missing_only";

    await resend.emails.send({
      from,
      to: recipients.map((student) => student.studentEmail),
      subject: isReminder
        ? `Reminder: ${assignment.class.name} - ${assignment.title}`
        : `${assignment.class.name}: ${assignment.title}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;padding:24px;background:#f8fafc;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <div style="padding:20px 24px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;">
              <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">${
                isReminder ? "Assignment Reminder" : "Quiz Assignment"
              }</div>
              <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;">${assignment.title}</h1>
            </div>
            <div style="padding:24px;">
              <p style="margin:0 0 12px;">${
                isReminder
                  ? `This is a reminder to complete your quiz for <strong>${assignment.class.name}</strong>.`
                  : `You have a new quiz for <strong>${assignment.class.name}</strong>.`
              }</p>
              <p style="margin:0 0 12px;"><strong>Quiz:</strong> ${assignment.quiz.title}</p>
              ${
                availableLabel
                  ? `<p style="margin:0 0 12px;"><strong>Available from:</strong> ${availableLabel}</p>`
                  : ""
              }
              ${
                dueLabel
                  ? `<p style="margin:0 0 12px;"><strong>Due:</strong> ${dueLabel}</p>`
                  : ""
              }
              ${
                assignment.instructions
                  ? `<p style="margin:0 0 16px;"><strong>Instructions:</strong><br />${assignment.instructions.replace(/\n/g, "<br />")}</p>`
                  : ""
              }
              <a href="${shareUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
                ${isReminder ? "Complete Quiz" : "Open Quiz"}
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:#64748b;">If the button does not work, use this link:<br /><a href="${shareUrl}" style="color:#2563eb;">${shareUrl}</a></p>
            </div>
          </div>
        </div>
      `,
      text: `${isReminder ? "Reminder:" : "You have a new quiz for"} ${assignment.class.name}.\n\nQuiz: ${assignment.quiz.title}\n${
        availableLabel ? `Available from: ${availableLabel}\n` : ""
      }${dueLabel ? `Due: ${dueLabel}\n` : ""}${
        assignment.instructions ? `Instructions: ${assignment.instructions}\n\n` : "\n"
      }${isReminder ? "Complete quiz" : "Open quiz"}: ${shareUrl}`,
    });

    await trackGenerationEvent({
      userId: user.id,
      eventType: isReminder ? "assignment_missing_students_reminded" : "assignment_roster_emailed",
      feature: "assignment_share_email",
      status: "success",
      metadata: {
        assignmentId: assignment.id,
        quizId: assignment.quiz.id,
        classId: assignment.class.id,
        className: assignment.class.name,
        recipientCount: recipients.length,
        mode,
        shareUrl,
        requestId,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        emailedCount: recipients.length,
        mode,
        shareUrl,
        requestId,
      },
      {
        headers: {
          "x-request-id": requestId,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    await trackGenerationEvent({
      userId,
      eventType: mode === "missing_only" ? "assignment_missing_students_reminded" : "assignment_roster_emailed",
      feature: "assignment_share_email",
      status: "failed",
      metadata: {
        assignmentId,
        mode,
        requestId,
        error: err instanceof Error ? err.message : "Failed to email assignment link",
      },
    });
    logApiError(requestId, "assignment-email-roster", err);
    return apiError(500, "Failed to email assignment link", requestId);
  }
}
