import { NextRequest, NextResponse } from "next/server";
import { assertAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const admin = await assertAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry") === "1";

  const countRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "GenerationEvent" g
    WHERE g."eventType" = 'quiz_generated'
      AND g."status" = 'success'
      AND (g."feature" = 'quiz' OR g."feature" = 'quiz_file_upload')
      AND (g."metadata"->>'quizId') ~ '^[0-9]+$'
      AND COALESCE(g."metadata"->>'difficulty', '') = ''
  `;
  const eligible = countRows[0]?.count ?? 0;

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      eligible,
      updated: 0,
    });
  }

  const updated = await prisma.$executeRaw`
    UPDATE "GenerationEvent" g
    SET "metadata" = jsonb_set(
      COALESCE(g."metadata", '{}'::jsonb),
      '{difficulty}',
      to_jsonb(
        COALESCE(
          NULLIF(g."metadata"->>'difficulty', ''),
          NULLIF(g."metadata"->>'effectiveDifficulty', ''),
          NULLIF(u."aiDifficulty", ''),
          'easy'
        )
      ),
      true
    )
    FROM "Quiz" q
    JOIN "User" u ON u."id" = q."userId"
    WHERE g."eventType" = 'quiz_generated'
      AND g."status" = 'success'
      AND (g."feature" = 'quiz' OR g."feature" = 'quiz_file_upload')
      AND (g."metadata"->>'quizId') ~ '^[0-9]+$'
      AND q."id" = (g."metadata"->>'quizId')::int
      AND COALESCE(g."metadata"->>'difficulty', '') = ''
  `;

  return NextResponse.json({
    ok: true,
    dryRun: false,
    eligible,
    updated,
  });
}
