import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminSession } from "@/lib/admin-auth";

type CohortRow = {
  cohortWeek: string;
  newUsers: number;
  returnedD1: number;
  returnedD7: number;
};

export async function GET(req: Request) {
  const auth = await assertAdminSession();
  if (!auth.ok) {
    const status =
      auth.reason === "misconfigured"
        ? 500
        : auth.reason === "challenge"
          ? 428
          : 403;
    return NextResponse.json({ error: auth.reason }, { status });
  }

  const { searchParams } = new URL(req.url);
  const weeks = Math.min(
    Math.max(Number(searchParams.get("weeks") || 12), 4),
    52
  );

  const rows = await prisma.$queryRaw<CohortRow[]>`
    WITH cohorts AS (
      SELECT
        u.id,
        DATE_TRUNC('week', u."createdAt")::date AS cohort_week,
        u."createdAt" AS signup_at
      FROM "User" u
      WHERE u."createdAt" >= NOW() - (${weeks}::int * INTERVAL '1 week')
    )
    SELECT
      c.cohort_week::text AS "cohortWeek",
      COUNT(*)::int AS "newUsers",
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM "GenerationEvent" ge
          WHERE ge."userId" = c.id
            AND ge."createdAt" >= c.signup_at + INTERVAL '1 day'
            AND ge."createdAt" <  c.signup_at + INTERVAL '2 day'
        )
      )::int AS "returnedD1",
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM "GenerationEvent" ge
          WHERE ge."userId" = c.id
            AND ge."createdAt" >= c.signup_at + INTERVAL '7 day'
            AND ge."createdAt" <  c.signup_at + INTERVAL '8 day'
        )
      )::int AS "returnedD7"
    FROM cohorts c
    GROUP BY c.cohort_week
    ORDER BY c.cohort_week DESC
  `;

  const cohorts = rows.map((row) => {
    const newUsers = row.newUsers || 0;
    const returnedD1 = row.returnedD1 || 0;
    const returnedD7 = row.returnedD7 || 0;
    return {
      cohortWeek: row.cohortWeek,
      newUsers,
      returnedD1,
      returnedD7,
      d1Rate: newUsers > 0 ? Number(((returnedD1 / newUsers) * 100).toFixed(1)) : 0,
      d7Rate: newUsers > 0 ? Number(((returnedD7 / newUsers) * 100).toFixed(1)) : 0,
    };
  });

  return NextResponse.json(
    { cohorts, weeks },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
