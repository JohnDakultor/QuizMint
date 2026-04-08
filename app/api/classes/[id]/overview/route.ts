import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import {
  buildAdaptiveClassSummary,
  buildClassInterventionEffectiveness,
  buildInterventionSummary,
  buildInterventionReview,
  buildPerformanceTrend,
  buildStudentsAtRisk,
  buildWeakQuestionTrends,
} from "@/lib/results-intervention";
import {
  getInterventionSummarySnapshot,
  setInterventionSummarySnapshot,
} from "@/lib/intervention-summary-snapshot";

function parseInterventionEventMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const metadata = value as Record<string, unknown>;
  if (metadata.adaptiveLaunch !== true) return null;
  return {
    interventionClassId:
      typeof metadata.interventionClassId === "string" ? metadata.interventionClassId : null,
    interventionAssignmentTitle:
      typeof metadata.interventionAssignmentTitle === "string"
        ? metadata.interventionAssignmentTitle
        : null,
    interventionMode:
      typeof metadata.interventionMode === "string" ? metadata.interventionMode : null,
    promptTopic: typeof metadata.promptTopic === "string" ? metadata.promptTopic : null,
  };
}

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, subscriptionPlan: true },
  });
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const premiumInterventionAccess = (user.subscriptionPlan || "free") === "premium";

  const { id } = await context.params;
  const cachedPayload = getInterventionSummarySnapshot({
    kind: "class_overview",
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
  const classRecord = await prisma.class.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
      subject: true,
      gradeLevel: true,
      section: true,
      students: {
        select: {
          id: true,
        },
      },
      assignments: {
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          id: true,
          title: true,
          status: true,
          dueAt: true,
          createdAt: true,
          updatedAt: true,
          attempts: {
            select: {
              id: true,
              studentName: true,
              studentEmail: true,
              scorePercent: true,
              submittedAt: true,
              result: true,
            },
          },
        },
      },
    },
  });

  if (!classRecord) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }
  const interventionEvents = premiumInterventionAccess
    ? await prisma.generationEvent.findMany({
        where: {
          userId: user.id,
          eventType: {
            in: ["quiz_generated", "lesson_generated"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 80,
        select: {
          eventType: true,
          feature: true,
          status: true,
          createdAt: true,
          metadata: true,
        },
      })
    : [];

  const studentCount = classRecord.students.length;
  const assignments = classRecord.assignments.map((assignment) => {
    const submissionCount = assignment.attempts.length;
    const averageScore = submissionCount
      ? Math.round(
          assignment.attempts.reduce((sum, attempt) => sum + attempt.scorePercent, 0) /
            submissionCount,
        )
      : 0;
    return {
      id: assignment.id,
      title: assignment.title,
      status: assignment.status,
      dueAt: assignment.dueAt,
      submissionCount,
      averageScore,
      missingCount: Math.max(studentCount - submissionCount, 0),
    };
  });

  const activeAssignments = assignments.filter((assignment) =>
    ["draft", "scheduled", "open"].includes(assignment.status),
  );
  const recentResults = assignments.filter((assignment) => assignment.submissionCount > 0).slice(0, 5);
  const scoredAssignments = assignments.filter((assignment) => assignment.submissionCount > 0);
  const averageScore = scoredAssignments.length
    ? Math.round(
        scoredAssignments.reduce((sum, assignment) => sum + assignment.averageScore, 0) /
          scoredAssignments.length,
      )
    : 0;
  const totalMissingSubmissions = activeAssignments.reduce(
    (sum, assignment) => sum + assignment.missingCount,
    0,
  );
  const dueSoonAssignments = activeAssignments
    .filter((assignment) => assignment.dueAt)
    .sort((a, b) => {
      const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })
    .slice(0, 4);
  const studentsAtRisk = premiumInterventionAccess
    ? buildStudentsAtRisk(
        classRecord.assignments.map((assignment) => ({
          id: assignment.id,
          title: assignment.title,
          dueAt: assignment.dueAt,
          updatedAt: assignment.updatedAt,
          studentCount,
          attempts: assignment.attempts,
        })),
      )
    : [];
  const weakQuestionTrends = premiumInterventionAccess
    ? buildWeakQuestionTrends(
        classRecord.assignments.map((assignment) => ({
          id: assignment.id,
          title: assignment.title,
          attempts: assignment.attempts,
        })),
      )
    : [];
  const performanceTrend = premiumInterventionAccess
    ? buildPerformanceTrend(
        classRecord.assignments.map((assignment) => ({
          id: assignment.id,
          title: assignment.title,
          dueAt: assignment.dueAt,
          updatedAt: assignment.updatedAt,
          studentCount,
          attempts: assignment.attempts,
        })),
      )
    : [];
  const interventionSummary = premiumInterventionAccess
    ? buildInterventionSummary({
        weakQuestionTrends,
        studentsAtRisk,
        alertGroupsByClass: [],
      })
    : null;
  const adaptiveSummary = premiumInterventionAccess
    ? buildAdaptiveClassSummary({
        className: classRecord.name,
        averageScore,
        totalMissingSubmissions,
        dueSoonCount: dueSoonAssignments.length,
        weakQuestionTrends,
        studentsAtRisk,
      })
    : null;
  const interventionHistory = premiumInterventionAccess
    ? interventionEvents
    .map((event) => {
      const metadata = parseInterventionEventMetadata(event.metadata);
      if (!metadata) return null;
      if (metadata.interventionClassId !== classRecord.id) return null;
      return {
        eventType: event.eventType,
        feature: event.feature,
        status: event.status,
        createdAt: event.createdAt,
        mode: metadata.interventionMode,
        assignmentTitle: metadata.interventionAssignmentTitle,
        promptTopic: metadata.promptTopic,
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event))
    .slice(0, 10)
    : [];
  const interventionEffectiveness =
    premiumInterventionAccess
      ? buildClassInterventionEffectiveness({
          className: classRecord.name,
          studentCount,
          assignments: classRecord.assignments.map((assignment) => ({
            id: assignment.id,
            title: assignment.title,
            class: {
              id: classRecord.id,
              name: classRecord.name,
            },
            dueAt: assignment.dueAt,
            createdAt: assignment.createdAt,
            updatedAt: assignment.updatedAt,
            studentCount,
            attempts: assignment.attempts,
          })),
          interventionHistory,
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
    class: {
      id: classRecord.id,
      name: classRecord.name,
      subject: classRecord.subject,
      gradeLevel: classRecord.gradeLevel,
      section: classRecord.section,
      studentCount,
    },
    summary: {
      studentCount,
      activeAssignmentCount: activeAssignments.length,
      averageScore,
      totalMissingSubmissions,
      dueSoonCount: dueSoonAssignments.length,
    },
    activeAssignments,
    dueSoonAssignments,
    recentResults,
    weakQuestionTrends,
    studentsAtRisk,
    performanceTrend,
    interventionSummary,
    adaptiveSummary,
    interventionHistory,
    interventionEffectiveness,
    interventionReview,
  };

  setInterventionSummarySnapshot({
    kind: "class_overview",
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
