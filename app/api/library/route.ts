import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

function inferAdaptiveTags(...values: Array<string | null | undefined>) {
  const text = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const tags: string[] = [];
  if (!text) return tags;
  if (text.includes("adaptive")) tags.push("Adaptive Follow-Up");
  if (text.includes("follow-up") || text.includes("follow up")) tags.push("Follow-Up");
  if (text.includes("reteach") || text.includes("remediation") || text.includes("remedial")) {
    tags.push("Reteach");
  }
  if (text.includes("intervention")) tags.push("Intervention");
  return Array.from(new Set(tags));
}

function getAssignmentOutcomeSignal(assignments: Array<{
  attempts: Array<{ scorePercent: number }>;
  class: { students: Array<{ id: string }> };
}>) {
  const scored = assignments.filter((assignment) => assignment.attempts.length > 0);
  if (!scored.length) {
    return {
      hasMeasuredOutcome: false,
      averageScore: 0,
      completionRate: 0,
    };
  }

  const averageScore = Math.round(
    scored.reduce((sum, assignment) => {
      const assignmentAverage = Math.round(
        assignment.attempts.reduce((attemptSum, attempt) => attemptSum + Number(attempt.scorePercent || 0), 0) /
          assignment.attempts.length,
      );
      return sum + assignmentAverage;
    }, 0) / scored.length,
  );

  const completionRate = Math.round(
    scored.reduce((sum, assignment) => {
      const studentCount = assignment.class.students.length;
      if (studentCount <= 0) return sum + 100;
      return sum + Math.round((assignment.attempts.length / studentCount) * 100);
    }, 0) / scored.length,
  );

  return {
    hasMeasuredOutcome: true,
    averageScore,
    completionRate,
  };
}

function withInterventionOutcomeTags(
  adaptiveTags: string[],
  assignments: Array<{
    attempts: Array<{ scorePercent: number }>;
    class: { students: Array<{ id: string }> };
  }>,
) {
  const nextTags = [...adaptiveTags];
  const outcome = getAssignmentOutcomeSignal(assignments);
  if ((adaptiveTags.length || outcome.hasMeasuredOutcome) && assignments.length) {
    nextTags.push("Used In Intervention");
  }
  if (
    outcome.hasMeasuredOutcome &&
    outcome.averageScore >= 75 &&
    outcome.completionRate >= 70
  ) {
    nextTags.push("Proven Effective");
  }
  return Array.from(new Set(nextTags));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [quizzes, lessonPlans, assignments, classes] = await Promise.all([
    prisma.quiz.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            questions: true,
            attempts: true,
            assignments: true,
          },
        },
        assignments: {
          select: {
            attempts: {
              select: {
                scorePercent: true,
              },
            },
            class: {
              select: {
                students: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.lessonPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        topic: true,
        subject: true,
        grade: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignments: true,
          },
        },
        assignments: {
          select: {
            attempts: {
              select: {
                scorePercent: true,
              },
            },
            class: {
              select: {
                students: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.assignment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        availableFrom: true,
        createdAt: true,
        updatedAt: true,
        class: {
          select: {
            id: true,
            name: true,
            subject: true,
            gradeLevel: true,
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
        lessonPlan: {
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
        attempts: {
          select: {
            scorePercent: true,
          },
        },
      },
    }),
    prisma.class.findMany({
      where: {
        userId: user.id,
        archived: false,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        subject: true,
        gradeLevel: true,
      },
    }),
  ]);

  return NextResponse.json({
    quizzes: quizzes.map((quiz) => ({
      ...quiz,
      adaptiveTags: withInterventionOutcomeTags(inferAdaptiveTags(quiz.title), quiz.assignments),
    })),
    lessonPlans: lessonPlans.map((plan) => ({
      ...plan,
      adaptiveTags: withInterventionOutcomeTags(
        inferAdaptiveTags(plan.title, plan.topic, plan.subject),
        plan.assignments,
      ),
    })),
    assignments: assignments.map((assignment) => ({
      ...assignment,
      adaptiveTags: withInterventionOutcomeTags(
        inferAdaptiveTags(
          assignment.title,
          assignment.class.name,
          assignment.quiz?.title,
          assignment.lessonPlan?.title,
        ),
        [
          {
            attempts: assignment.attempts,
            class: { students: assignment.class.students },
          },
        ],
      ),
    })),
    classes,
  });
}
