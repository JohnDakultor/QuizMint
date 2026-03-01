// app/api/user/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

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
      aiDifficulty: true, // ADD THIS
      adaptiveLearning: true, // ADD THIS
      liteMode: true,
      lastQuizAt: true, // ADD THIS if you need it
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const uploadRows = await prisma.$queryRaw<
    Array<{
      lessonMaterialUploadUsage: number | null;
      lastLessonMaterialUploadAt: Date | null;
      lessonMaterialUploadResetInSeconds: number | null;
    }>
  >`
    SELECT
      "lessonMaterialUploadUsage",
      "lastLessonMaterialUploadAt",
      CASE
        WHEN "lastLessonMaterialUploadAt" IS NULL THEN NULL
        ELSE CEIL(EXTRACT(EPOCH FROM (("lastLessonMaterialUploadAt" + INTERVAL '3 hours') - NOW())))
      END::int AS "lessonMaterialUploadResetInSeconds"
    FROM "User"
    WHERE id = ${user.id}
    LIMIT 1
  `;
  let lessonMaterialUploadUsage = Number(uploadRows?.[0]?.lessonMaterialUploadUsage || 0);
  let lastLessonMaterialUploadAt = uploadRows?.[0]?.lastLessonMaterialUploadAt || null;
  let lessonMaterialUploadResetInSeconds = (() => {
    const n = Number(uploadRows?.[0]?.lessonMaterialUploadResetInSeconds);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  })();

  const isFree = !user.subscriptionPlan || user.subscriptionPlan === "free";
  if (isFree && lessonMaterialUploadUsage > 0 && lastLessonMaterialUploadAt) {
    const shouldReset =
      lessonMaterialUploadResetInSeconds !== null &&
      lessonMaterialUploadResetInSeconds <= 0;
    if (shouldReset) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "lessonMaterialUploadUsage" = 0,
            "lastLessonMaterialUploadAt" = NULL
        WHERE id = ${user.id}
      `;
      lessonMaterialUploadUsage = 0;
      lastLessonMaterialUploadAt = null;
      lessonMaterialUploadResetInSeconds = null;
    } else {
      if (lessonMaterialUploadUsage >= 3) {
        lessonMaterialUploadResetInSeconds = Math.max(
          Number(lessonMaterialUploadResetInSeconds || 0),
          0
        );
      } else {
        lessonMaterialUploadResetInSeconds = null;
      }
    }
  } else if (lessonMaterialUploadUsage < 3) {
    lessonMaterialUploadResetInSeconds = null;
  }

  return NextResponse.json({
    user: {
      ...user,
      lessonMaterialUploadUsage,
      lastLessonMaterialUploadAt,
      lessonMaterialUploadResetInSeconds,
    },
  });
}
