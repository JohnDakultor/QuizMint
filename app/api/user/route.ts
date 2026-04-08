// app/api/user/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import {
  getFreeQuizPointsSnapshot,
  isFreeQuizPointLimited,
  getFreeLessonPlanPointsSnapshot,
  isFreeLessonPlanPointLimited,
} from "@/lib/free-tier-points";

// export async function GET() {
//   const session = await getServerSession(authOptions);
//   if (!session?.user?.email) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const user = await prisma.user.findUnique({
//     where: { email: session.user.email },
//     select: { quizUsage: true },
//   });

//   if (!user) {
//     return NextResponse.json({ error: "User not found" }, { status: 404 });
//   }

//   return NextResponse.json({ quizUsage: user.quizUsage });
// }
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      subscriptionPlan: true,
      quizUsage: true,
      freeQuizPoints: true,
      freeQuizPointsMax: true,
      freeQuizPointsRechargeAt: true,
      freeLessonPlanPoints: true,
      freeLessonPlanPointsMax: true,
      freeLessonPlanPointsRechargeAt: true,
      aiDifficulty: true, // ADD THIS
      adaptiveLearning: true, // ADD THIS
      liteMode: true,
      lastQuizAt: true, // ADD THIS if you need it
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const freeQuizPointsSnapshot = isFreeQuizPointLimited(user.subscriptionPlan)
    ? getFreeQuizPointsSnapshot(user)
    : null;
  const freeLessonPlanPointsSnapshot = isFreeLessonPlanPointLimited(user.subscriptionPlan)
    ? getFreeLessonPlanPointsSnapshot(user)
    : null;

  return NextResponse.json({
    user: {
      ...user,
      freeQuizPoints: freeQuizPointsSnapshot?.availablePoints ?? user.freeQuizPoints,
      freeQuizPointsMax: freeQuizPointsSnapshot?.maxPoints ?? user.freeQuizPointsMax,
      freeQuizPointsRechargeAt:
        freeQuizPointsSnapshot?.rechargeAt ?? user.freeQuizPointsRechargeAt,
      freeLessonPlanPoints:
        freeLessonPlanPointsSnapshot?.availablePoints ?? user.freeLessonPlanPoints,
      freeLessonPlanPointsMax:
        freeLessonPlanPointsSnapshot?.maxPoints ?? user.freeLessonPlanPointsMax,
      freeLessonPlanPointsRechargeAt:
        freeLessonPlanPointsSnapshot?.rechargeAt ?? user.freeLessonPlanPointsRechargeAt,
    },
  });
}
