import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { getFreeQuizPointsSnapshot } from "@/lib/free-tier-points";
import { createQuizShareToken } from "@/lib/quiz-share";
import {
  getDashboardSummarySnapshot,
  setDashboardSummarySnapshot,
} from "@/lib/dashboard-summary-snapshot";
import {
  buildAlertGroupsByClass,
  buildAdaptiveWorkspaceSummary,
  buildInterventionSummary,
  buildWorkspaceInterventionReview,
  buildPerformanceTrend,
  buildStudentsAtRisk,
  buildWeakQuestionTrends,
} from "@/lib/results-intervention";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      subscriptionPlan: true,
      quizUsage: true,
      lastQuizAt: true,
      freeQuizPoints: true,
      freeQuizPointsMax: true,
      freeQuizPointsRechargeAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const cachedSummary = getDashboardSummarySnapshot({
    userId: user.id,
    origin: req.nextUrl.origin,
  });
  if (cachedSummary) {
    return NextResponse.json(cachedSummary, {
      headers: {
        "Cache-Control": "no-store",
        "x-dashboard-summary-cache": "hit",
      },
    });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const now = new Date();

  const [
    quizCount,
    lessonPlanCount,
    classCount,
    activeAssignmentCount,
    todayQuizCount,
    todayLessonPlanCount,
    recentQuizzes,
    recentPlans,
    activeAssignments,
    recentAssignmentResults,
    activeClasses,
    latestAssignment,
    latestClass,
    draftAssignments,
    overdueAssignmentRows,
    recentSubmissionRows,
    recentWorkflowEvents,
  ] = await Promise.all([
    prisma.quiz.count({ where: { userId: user.id } }),
    prisma.lessonPlan.count({ where: { userId: user.id } }),
    prisma.class.count({ where: { userId: user.id, archived: false } }),
    prisma.assignment.count({
      where: {
        userId: user.id,
        status: { in: ["draft", "scheduled", "open"] },
      },
    }),
    prisma.quiz.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfDay },
      },
    }),
    prisma.lessonPlan.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfDay },
      },
    }),
    prisma.quiz.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        createdAt: true,
        shareSettings: {
          select: {
            isOpen: true,
            expiresAt: true,
          },
        },
      },
    }),
    prisma.lessonPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, subject: true, createdAt: true },
    }),
    prisma.assignment.findMany({
      where: {
        userId: user.id,
        status: { in: ["draft", "scheduled", "open"] },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        availableFrom: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            name: true,
            students: {
              select: {
                id: true,
              },
            },
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    }),
    prisma.assignment.findMany({
      where: {
        userId: user.id,
        attempts: {
          some: {},
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 12,
      select: {
        id: true,
        title: true,
        dueAt: true,
        updatedAt: true,
        class: {
          select: {
            id: true,
            name: true,
            students: {
              select: {
                id: true,
              },
            },
          },
        },
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
    }),
    prisma.class.findMany({
      where: {
        userId: user.id,
        archived: false,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        name: true,
        subject: true,
        gradeLevel: true,
        section: true,
        _count: {
          select: {
            students: true,
            assignments: {
              where: {
                status: { in: ["draft", "scheduled", "open"] },
              },
            },
          },
        },
      },
    }),
    prisma.assignment.findFirst({
      where: {
        userId: user.id,
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        updatedAt: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.class.findFirst({
      where: {
        userId: user.id,
        archived: false,
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        subject: true,
        gradeLevel: true,
        section: true,
        updatedAt: true,
      },
    }),
    prisma.assignment.findMany({
      where: {
        userId: user.id,
        status: "draft",
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
          },
        },
        lessonPlan: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.assignment.findMany({
      where: {
        userId: user.id,
        status: { in: ["scheduled", "open"] },
        dueAt: {
          not: null,
          lt: now,
        },
      },
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        updatedAt: true,
        class: {
          select: {
            id: true,
            name: true,
            students: {
              select: {
                id: true,
              },
            },
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    }),
    prisma.studentQuizAttempt.findMany({
      where: {
        assignment: {
          userId: user.id,
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 8,
      select: {
        id: true,
        studentName: true,
        studentEmail: true,
        scorePercent: true,
        submittedAt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.generationEvent.findMany({
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
      take: 8,
      select: {
        eventType: true,
        feature: true,
        status: true,
        createdAt: true,
        metadata: true,
      },
    }),
  ]);

  const recentQuizIds = recentQuizzes.map((quiz) => quiz.id);
  const shareEvents = recentQuizIds.length
    ? await prisma.generationEvent.findMany({
        where: {
          userId: user.id,
          eventType: "quiz_generated",
          status: "success",
          feature: "quiz_share_link",
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          metadata: true,
          createdAt: true,
        },
      })
    : [];

  const latestShareUrlByQuizId = new Map<number, string>();
  for (const event of shareEvents) {
    const metadata =
      event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : null;
    const quizId =
      metadata && typeof metadata.quizId === "number"
        ? metadata.quizId
        : metadata && typeof metadata.quizId === "string"
        ? Number(metadata.quizId)
        : null;
    const shareUrl = metadata && typeof metadata.shareUrl === "string" ? metadata.shareUrl : null;
    if (!quizId || !shareUrl || latestShareUrlByQuizId.has(quizId)) continue;
    latestShareUrlByQuizId.set(quizId, shareUrl);
  }

  const latestQuizAt = recentQuizzes[0]?.createdAt ? new Date(recentQuizzes[0].createdAt) : null;
  const latestLessonAt = recentPlans[0]?.createdAt ? new Date(recentPlans[0].createdAt) : null;
  const lastActivityAt =
    latestQuizAt && latestLessonAt
      ? latestQuizAt > latestLessonAt
        ? latestQuizAt
        : latestLessonAt
      : latestQuizAt || latestLessonAt;

  const freeQuizPointsSnapshot =
    (user.subscriptionPlan || "free") === "free"
      ? getFreeQuizPointsSnapshot(user)
      : null;

  const recentQuizzesWithLinks = recentQuizzes.map((quiz) => {
    const expiresAt = quiz.shareSettings?.expiresAt ? new Date(quiz.shareSettings.expiresAt) : null;
    const ttlSeconds = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : 0;
    const fallbackShareUrl =
      quiz.shareSettings?.isOpen && expiresAt && ttlSeconds > 0
        ? `${req.nextUrl.origin}/quiz/${encodeURIComponent(createQuizShareToken(quiz.id, ttlSeconds))}`
        : null;
    const persistedShareUrl =
      quiz.shareSettings?.isOpen && expiresAt && ttlSeconds > 0
        ? latestShareUrlByQuizId.get(quiz.id) || null
        : null;
    return {
      ...quiz,
      shareUrl: persistedShareUrl || fallbackShareUrl,
    };
  });

  const dueSoonAssignments = activeAssignments
    .filter((assignment) => assignment.dueAt)
    .filter((assignment) => new Date(assignment.dueAt || 0).getTime() >= now.getTime())
    .sort(
      (a, b) =>
        new Date(a.dueAt || 0).getTime() - new Date(b.dueAt || 0).getTime(),
    )
    .slice(0, 5)
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      dueAt: assignment.dueAt,
      class: assignment.class,
      submissionCount: assignment._count.attempts,
    }));

  const activeAssignmentIds = activeAssignments.map((assignment) => assignment.id);
  const assignmentEventRows = activeAssignmentIds.length
    ? await prisma.generationEvent.findMany({
        where: {
          userId: user.id,
          eventType: {
            in: ["assignment_roster_emailed", "assignment_missing_students_reminded"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          eventType: true,
          createdAt: true,
          metadata: true,
        },
      })
    : [];

  const latestReminderByAssignmentId = new Map<string, Date>();
  const latestRosterEmailByAssignmentId = new Map<string, Date>();
  for (const event of assignmentEventRows) {
    const metadata =
      event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : null;
    const assignmentId =
      metadata && typeof metadata.assignmentId === "string" ? metadata.assignmentId : null;
    if (!assignmentId || !activeAssignmentIds.includes(assignmentId)) continue;
    if (
      event.eventType === "assignment_missing_students_reminded" &&
      !latestReminderByAssignmentId.has(assignmentId)
    ) {
      latestReminderByAssignmentId.set(assignmentId, event.createdAt);
    }
    if (
      event.eventType === "assignment_roster_emailed" &&
      !latestRosterEmailByAssignmentId.has(assignmentId)
    ) {
      latestRosterEmailByAssignmentId.set(assignmentId, event.createdAt);
    }
  }

  const overdueAssignments = overdueAssignmentRows.map((assignment) => {
    const studentCount = assignment.class.students.length;
    const submissionCount = assignment._count.attempts;
    return {
      id: assignment.id,
      title: assignment.title,
      status: assignment.status,
      dueAt: assignment.dueAt,
      updatedAt: assignment.updatedAt,
      class: {
        id: assignment.class.id,
        name: assignment.class.name,
      },
      submissionCount,
      studentCount,
      missingCount: Math.max(studentCount - submissionCount, 0),
    };
  });

  const reminderNeededAssignments = activeAssignments
    .map((assignment) => {
      const studentCount = assignment.class.students.length;
      const submissionCount = assignment._count.attempts;
      const missingCount = Math.max(studentCount - submissionCount, 0);
      return {
        id: assignment.id,
        title: assignment.title,
        status: assignment.status,
        dueAt: assignment.dueAt,
        class: {
          id: assignment.class.id,
          name: assignment.class.name,
        },
        submissionCount,
        studentCount,
        missingCount,
        lastRosterEmailAt: latestRosterEmailByAssignmentId.get(assignment.id) || null,
        lastReminderAt: latestReminderByAssignmentId.get(assignment.id) || null,
      };
    })
    .filter(
      (assignment) =>
        assignment.status !== "draft" &&
        assignment.studentCount > 0 &&
        assignment.missingCount > 0 &&
        Boolean(assignment.lastRosterEmailAt) &&
        !assignment.lastReminderAt,
    )
    .sort((a, b) => {
      const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })
    .slice(0, 5);

  const recentWorkflowActivity = recentWorkflowEvents
    .map((event) => {
      const metadata =
        event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
          ? (event.metadata as Record<string, unknown>)
          : null;
      const assignmentId =
        metadata && typeof metadata.assignmentId === "string" ? metadata.assignmentId : null;
      const className = metadata && typeof metadata.className === "string" ? metadata.className : null;
      const shareUrl = metadata && typeof metadata.shareUrl === "string" ? metadata.shareUrl : null;
      const requestId = metadata && typeof metadata.requestId === "string" ? metadata.requestId : null;
      const recipientCount =
        metadata && typeof metadata.recipientCount === "number" ? metadata.recipientCount : null;
      const error = metadata && typeof metadata.error === "string" ? metadata.error : null;
      return {
        eventType: event.eventType,
        feature: event.feature,
        status: event.status,
        createdAt: event.createdAt,
        assignmentId,
        className,
        shareUrl,
        requestId,
        recipientCount,
        error,
      };
    })
    .filter((item) => item.assignmentId);

  const lowScoreAlerts = recentAssignmentResults
    .map((assignment) => {
      const studentCount = assignment.class.students.length;
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
        class: {
          id: assignment.class.id,
          name: assignment.class.name,
        },
        averageScore,
        submissionCount,
        studentCount,
        missingCount: Math.max(studentCount - submissionCount, 0),
      };
    })
    .filter((assignment) => assignment.averageScore < 70 || assignment.missingCount > 0)
    .slice(0, 5);
  const trendAssignments = recentAssignmentResults.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    updatedAt: assignment.updatedAt,
    dueAt: assignment.dueAt,
    studentCount: assignment.class.students.length,
    class: {
      id: assignment.class.id,
      name: assignment.class.name,
    },
    attempts: assignment.attempts,
  }));
  const weakQuestionTrends = buildWeakQuestionTrends(trendAssignments);
  const studentsAtRisk = buildStudentsAtRisk(trendAssignments);
  const performanceTrend = buildPerformanceTrend(trendAssignments);
  const alertGroupsByClass = buildAlertGroupsByClass(trendAssignments);
  const interventionSummary = buildInterventionSummary({
    weakQuestionTrends,
    studentsAtRisk,
    alertGroupsByClass,
  });
  const adaptiveWorkspaceSummary = buildAdaptiveWorkspaceSummary({
    weakQuestionTrends,
    studentsAtRisk,
    alertGroupsByClass,
  });
  const workspaceInterventionReview = buildWorkspaceInterventionReview({
    adaptiveSummary: adaptiveWorkspaceSummary,
    performanceTrend,
    lowScoreAlertCount: lowScoreAlerts.length,
    reminderNeededCount: reminderNeededAssignments.length,
  });
  const premiumInterventionAccess = (user.subscriptionPlan || "free") === "premium";

  const suggestedAction =
    overdueAssignments[0]
      ? {
          type: "overdue_assignment",
          title: `Resolve overdue work in ${overdueAssignments[0].class.name}`,
          description: `${overdueAssignments[0].title} is overdue with ${overdueAssignments[0].missingCount} student submission${
            overdueAssignments[0].missingCount === 1 ? "" : "s"
          } still missing.`,
          href: `/assignments/${overdueAssignments[0].id}`,
        }
      : draftAssignments[0]
      ? {
          type: "finish_draft",
          title: `Finish draft assignment: ${draftAssignments[0].title}`,
          description: `This draft is still sitting in ${draftAssignments[0].class.name}. Publish it or complete the setup to keep the class workflow moving.`,
          href: `/assignments/${draftAssignments[0].id}`,
        }
      : reminderNeededAssignments[0]
      ? {
          type: "send_reminder",
          title: `Send reminder for ${reminderNeededAssignments[0].title}`,
          description: `${reminderNeededAssignments[0].missingCount} student${
            reminderNeededAssignments[0].missingCount === 1 ? "" : "s"
          } in ${reminderNeededAssignments[0].class.name} are still missing and have not been reminded yet.`,
          href: `/assignments/${reminderNeededAssignments[0].id}`,
        }
      : lowScoreAlerts[0]?.averageScore < 70
      ? {
          type: "reteach",
          title: `Review ${lowScoreAlerts[0].title}`,
          description: `Average score is ${lowScoreAlerts[0].averageScore}%. This class likely needs a follow-up reteach or remediation quiz.`,
          href: `/assignments/${lowScoreAlerts[0].id}`,
        }
      : dueSoonAssignments[0]
      ? {
          type: "due_soon",
          title: `Check ${dueSoonAssignments[0].title}`,
          description: "This assignment is due soon. Review completion and remind missing students.",
          href: `/assignments/${dueSoonAssignments[0].id}`,
        }
      : latestAssignment
      ? {
          type: "continue_assignment",
          title: `Continue ${latestAssignment.title}`,
          description: "Jump back into the latest class assignment and keep the workflow moving.",
          href: `/assignments/${latestAssignment.id}`,
        }
      : latestClass
      ? {
          type: "resume_latest_class",
          title: `Resume ${latestClass.name}`,
          description: "Open the latest active class and keep the daily teaching workflow moving from the class hub.",
          href: `/classes/${latestClass.id}`,
        }
      : {
          type: "start_class_workflow",
          title: "Create your next class assignment",
          description: "Generate a quiz or lesson plan, then assign it to a class to start the teacher workflow loop.",
          href: "/generate-quiz",
        };

  const dueTodayCount = activeAssignments.filter((assignment) => {
    if (!assignment.dueAt) return false;
    const dueAt = new Date(assignment.dueAt);
    return dueAt >= startOfDay && dueAt < endOfDay;
  }).length;

  const todayView = {
    dueTodayCount,
    overdueCount: overdueAssignments.length,
    draftCount: draftAssignments.length,
    reminderNeededCount: reminderNeededAssignments.length,
    lowScoreAlertCount: lowScoreAlerts.length,
    recentSubmissionCount: recentSubmissionRows.length,
  };

  const payload = {
    subscriptionPlan: user.subscriptionPlan || "free",
    quizUsage: user.quizUsage,
    lastQuizAt: user.lastQuizAt,
    freeQuizPoints: freeQuizPointsSnapshot?.availablePoints ?? user.freeQuizPoints ?? null,
    freeQuizPointsMax: freeQuizPointsSnapshot?.maxPoints ?? user.freeQuizPointsMax ?? null,
    freeQuizPointsRechargeAt:
      freeQuizPointsSnapshot?.rechargeAt ?? user.freeQuizPointsRechargeAt ?? null,
    lastActivityAt,
    quizCount,
    lessonPlanCount,
    classCount,
    activeAssignmentCount,
    todayQuizCount,
    todayLessonPlanCount,
    recentQuizzes: recentQuizzesWithLinks,
    recentPlans,
    activeAssignments,
    activeClasses,
    latestAssignment,
    latestClass,
    draftAssignments,
    overdueAssignments,
    dueSoonAssignments,
    reminderNeededAssignments,
    todayView,
    lowScoreAlerts,
    alertGroupsByClass,
    studentsAtRisk,
    weakQuestionTrends,
    performanceTrend,
    premiumInterventionAccess,
    interventionSummary: premiumInterventionAccess ? interventionSummary : null,
    adaptiveWorkspaceSummary: premiumInterventionAccess ? adaptiveWorkspaceSummary : null,
    workspaceInterventionReview: premiumInterventionAccess ? workspaceInterventionReview : null,
    recentSubmissions: recentSubmissionRows.map((attempt) => ({
      id: attempt.id,
      studentName: attempt.studentName,
      studentEmail: attempt.studentEmail,
      scorePercent: attempt.scorePercent,
      submittedAt: attempt.submittedAt,
      assignment: attempt.assignment,
    })),
    recentWorkflowActivity,
    suggestedAction,
    recentAssignmentResults: recentAssignmentResults.map((assignment) => {
      const studentCount = assignment.class.students.length;
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
        dueAt: assignment.dueAt,
        class: {
          id: assignment.class.id,
          name: assignment.class.name,
        },
        submissionCount,
        studentCount,
        missingCount: Math.max(studentCount - submissionCount, 0),
        averageScore,
      };
    }),
  };

  setDashboardSummarySnapshot({
    userId: user.id,
    origin: req.nextUrl.origin,
    payload,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "x-dashboard-summary-cache": "miss",
    },
  });
}
