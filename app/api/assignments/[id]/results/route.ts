import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildAdaptiveAssignmentSummary,
  buildAssignmentInterventionEffectiveness,
  buildInterventionReview,
  buildPerformanceTrend,
  buildStudentsAtRisk,
  buildWeakQuestionTrends,
} from "@/lib/results-intervention";
import {
  getInterventionSummarySnapshot,
  setInterventionSummarySnapshot,
} from "@/lib/intervention-summary-snapshot";
import {
  buildOwnedOrMemberWhere,
  getCurrentUserAccessContext,
} from "@/lib/organization-access";
import { hasPremiumFeaturePlan } from "@/lib/organization-subscription";

type AttemptDetail = {
  questionId?: number;
  question?: string;
  questionType?: string;
  selected?: string;
  correctAnswer?: string;
  correct?: boolean;
};

function normalizeEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function parseInterventionEventMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const metadata = value as Record<string, unknown>;
  if (metadata.adaptiveLaunch !== true) return null;
  return {
    interventionSourceType:
      typeof metadata.interventionSourceType === "string" ? metadata.interventionSourceType : null,
    interventionSourceId:
      typeof metadata.interventionSourceId === "string" ? metadata.interventionSourceId : null,
    interventionClassId:
      typeof metadata.interventionClassId === "string" ? metadata.interventionClassId : null,
    interventionClassName:
      typeof metadata.interventionClassName === "string" ? metadata.interventionClassName : null,
    interventionAssignmentTitle:
      typeof metadata.interventionAssignmentTitle === "string"
        ? metadata.interventionAssignmentTitle
        : null,
    interventionMode:
      typeof metadata.interventionMode === "string" ? metadata.interventionMode : null,
    promptTopic: typeof metadata.promptTopic === "string" ? metadata.promptTopic : null,
  };
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserAccessContext();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const premiumInterventionAccess = hasPremiumFeaturePlan(user.subscriptionPlan);

  const { id } = await context.params;
  const cachedPayload = getInterventionSummarySnapshot({
    kind: "assignment_results",
    userId: user.id,
    entityId: id,
  });
  if (cachedPayload) {
    return NextResponse.json(cachedPayload, {
      headers: {
        "Cache-Control": "no-store",
        "x-intervention-summary-cache": "hit",
      },
    });
  }
  const assignment = await prisma.assignment.findFirst({
    where: {
      id,
      ...buildOwnedOrMemberWhere(user),
    },
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
          students: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              studentName: true,
              studentEmail: true,
              studentNumber: true,
            },
          },
        },
      },
      quiz: {
        select: {
          id: true,
          title: true,
          questions: {
            select: {
              id: true,
              question: true,
            },
          },
        },
      },
      lessonPlan: {
        select: {
          id: true,
          title: true,
          topic: true,
          subject: true,
          grade: true,
          days: true,
          minutesPerDay: true,
        },
      },
      attempts: {
        orderBy: { submittedAt: "desc" },
        select: {
          id: true,
          studentName: true,
          studentEmail: true,
          scorePercent: true,
          correctAnswers: true,
          totalQuestions: true,
          submittedAt: true,
          result: true,
        },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const historyEvents = await prisma.generationEvent.findMany({
    where: {
      userId: user.id,
      eventType: {
        in: [
          "assignment_shared",
          "assignment_roster_emailed",
          "assignment_missing_students_reminded",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      eventType: true,
      feature: true,
      status: true,
      createdAt: true,
      metadata: true,
    },
  });
  const interventionEvents = premiumInterventionAccess
    ? await prisma.generationEvent.findMany({
        where: {
          userId: user.id,
          eventType: {
            in: ["quiz_generated", "lesson_generated"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: {
          eventType: true,
          feature: true,
          status: true,
          createdAt: true,
          metadata: true,
        },
      })
    : [];

  const rosterStudents = assignment.class.students;
  const attempts = assignment.attempts.map((attempt) => {
    const details = Array.isArray(attempt.result) ? (attempt.result as AttemptDetail[]) : [];
    return {
      ...attempt,
      details,
    };
  });

  const rosteredEmails = new Set(
    rosterStudents.map((student) => normalizeEmail(student.studentEmail)).filter(Boolean),
  );
  const submittedEmails = new Set(
    attempts.map((attempt) => normalizeEmail(attempt.studentEmail)).filter(Boolean),
  );
  const submittedNames = new Set(
    attempts.map((attempt) => normalizeName(attempt.studentName)).filter(Boolean),
  );

  const missingStudents = rosterStudents.filter((student) => {
    const email = normalizeEmail(student.studentEmail);
    if (email) return !submittedEmails.has(email);
    const name = normalizeName(student.studentName);
    return name ? !submittedNames.has(name) : true;
  });

  const averageScore = attempts.length
    ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.scorePercent, 0) / attempts.length)
    : 0;
  const completionRate =
    rosterStudents.length > 0 ? Math.round((attempts.length / rosterStudents.length) * 100) : 0;

  const questionStats = new Map<
    number,
    { questionId: number; question: string; attempts: number; correct: number }
  >();

  for (const quizQuestion of assignment.quiz?.questions || []) {
    questionStats.set(quizQuestion.id, {
      questionId: quizQuestion.id,
      question: quizQuestion.question,
      attempts: 0,
      correct: 0,
    });
  }

  for (const attempt of attempts) {
    for (const detail of attempt.details) {
      if (typeof detail.questionId !== "number") continue;
      const current = questionStats.get(detail.questionId) || {
        questionId: detail.questionId,
        question: String(detail.question || `Question ${detail.questionId}`),
        attempts: 0,
        correct: 0,
      };
      current.attempts += 1;
      if (detail.correct) current.correct += 1;
      questionStats.set(detail.questionId, current);
    }
  }

  const hardestQuestions = Array.from(questionStats.values())
    .filter((item) => item.attempts > 0)
    .map((item) => ({
      ...item,
      successRate: Math.round((item.correct / item.attempts) * 100),
    }))
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, 5);

  const classAssignments = premiumInterventionAccess
    ? await prisma.assignment.findMany({
        where: {
          classId: assignment.class.id,
          userId: user.id,
          attempts: {
            some: {},
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          dueAt: true,
          updatedAt: true,
          createdAt: true,
          attempts: {
            select: {
              studentName: true,
              studentEmail: true,
              scorePercent: true,
              submittedAt: true,
              result: true,
            },
          },
        },
      })
    : [];
  const atRiskStudents = premiumInterventionAccess
    ? buildStudentsAtRisk(
        classAssignments.map((item) => ({
          id: item.id,
          title: item.title,
          dueAt: item.dueAt,
          updatedAt: item.updatedAt,
          studentCount: rosterStudents.length,
          attempts: item.attempts,
        })),
      )
    : [];
  const recurringWeaknesses = premiumInterventionAccess
    ? buildWeakQuestionTrends(
        classAssignments.map((item) => ({
          id: item.id,
          title: item.title,
          attempts: item.attempts,
        })),
      )
    : [];
  const performanceTrend = premiumInterventionAccess
    ? buildPerformanceTrend(
        classAssignments.map((item) => ({
          id: item.id,
          title: item.title,
          dueAt: item.dueAt,
          updatedAt: item.updatedAt,
          studentCount: rosterStudents.length,
          attempts: item.attempts,
        })),
      )
    : [];
  const adaptiveSummary = premiumInterventionAccess
    ? buildAdaptiveAssignmentSummary({
        assignmentTitle: assignment.title,
        averageScore,
        missingCount: missingStudents.length,
        hardestQuestions,
        atRiskStudents,
      })
    : null;

  const history = historyEvents
    .map((event) => {
      const metadata =
        event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
          ? (event.metadata as Record<string, unknown>)
          : null;
      const assignmentId =
        metadata && typeof metadata.assignmentId === "string" ? metadata.assignmentId : null;
      if (assignmentId !== assignment.id) return null;
      return {
        eventType: event.eventType,
        feature: event.feature,
        status: event.status,
        createdAt: event.createdAt,
        recipientCount:
          metadata && typeof metadata.recipientCount === "number" ? metadata.recipientCount : null,
        mode: metadata && typeof metadata.mode === "string" ? metadata.mode : null,
        requestId: metadata && typeof metadata.requestId === "string" ? metadata.requestId : null,
        shareUrl: metadata && typeof metadata.shareUrl === "string" ? metadata.shareUrl : null,
        error: metadata && typeof metadata.error === "string" ? metadata.error : null,
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event));
  const interventionHistory = premiumInterventionAccess
    ? interventionEvents
    .map((event) => {
      const metadata = parseInterventionEventMetadata(event.metadata);
      if (!metadata) return null;
      if (
        metadata.interventionSourceType !== "assignment" ||
        metadata.interventionSourceId !== assignment.id
      ) {
        return null;
      }
      return {
        eventType: event.eventType,
        feature: event.feature,
        status: event.status,
        createdAt: event.createdAt,
        mode: metadata.interventionMode,
        className: metadata.interventionClassName,
        assignmentTitle: metadata.interventionAssignmentTitle,
        promptTopic: metadata.promptTopic,
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event))
    : [];
  const interventionEffectiveness = premiumInterventionAccess
    ? buildAssignmentInterventionEffectiveness({
        sourceAssignment: {
          id: assignment.id,
          title: assignment.title,
          class: assignment.class
            ? {
                id: assignment.class.id,
                name: assignment.class.name,
              }
            : null,
          dueAt: assignment.dueAt,
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
          studentCount: rosterStudents.length,
          attempts: assignment.attempts,
        },
        hardestQuestions,
        interventionHistory,
        followUpAssignments: classAssignments.map((item) => ({
          id: item.id,
          title: item.title,
          dueAt: item.dueAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          studentCount: rosterStudents.length,
          attempts: item.attempts,
        })),
      })
    : null;
  const interventionReview =
    premiumInterventionAccess && interventionEffectiveness && adaptiveSummary
      ? buildInterventionReview({
          effectiveness: interventionEffectiveness,
          supportLevel: adaptiveSummary.supportLevel,
          recommendation: adaptiveSummary.recommendation,
        })
      : null;

  const payload = {
    premiumInterventionAccess,
    assignment: {
      id: assignment.id,
      title: assignment.title,
      instructions: assignment.instructions,
      status: assignment.status,
      availableFrom: assignment.availableFrom,
      dueAt: assignment.dueAt,
      closedAt: assignment.closedAt,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      class: assignment.class,
      quiz: assignment.quiz
        ? {
            id: assignment.quiz.id,
            title: assignment.quiz.title,
            questionCount: assignment.quiz.questions.length,
          }
        : null,
      lessonPlan: assignment.lessonPlan
        ? {
            id: assignment.lessonPlan.id,
            title: assignment.lessonPlan.title,
            topic: assignment.lessonPlan.topic,
            subject: assignment.lessonPlan.subject,
            grade: assignment.lessonPlan.grade,
            days: assignment.lessonPlan.days,
            minutesPerDay: assignment.lessonPlan.minutesPerDay,
          }
        : null,
    },
    metrics: {
      studentCount: rosterStudents.length,
      submissionCount: attempts.length,
      missingCount: missingStudents.length,
      averageScore,
      completionRate,
      rosterEmailCount: rosteredEmails.size,
    },
    missingStudents,
    hardestQuestions,
    atRiskStudents,
    recurringWeaknesses,
    performanceTrend,
    adaptiveSummary,
    interventionHistory,
    interventionEffectiveness,
    interventionReview,
    history,
    attempts: attempts.map((attempt) => ({
      id: attempt.id,
      studentName: attempt.studentName,
      studentEmail: attempt.studentEmail,
      scorePercent: attempt.scorePercent,
      correctAnswers: attempt.correctAnswers,
      totalQuestions: attempt.totalQuestions,
      submittedAt: attempt.submittedAt,
      details: attempt.details,
    })),
  };

  setInterventionSummarySnapshot({
    kind: "assignment_results",
    userId: user.id,
    entityId: id,
    payload,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "x-intervention-summary-cache": "miss",
    },
  });
}
