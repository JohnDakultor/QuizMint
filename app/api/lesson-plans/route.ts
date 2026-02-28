import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { normalizeForEmbedding } from "@/lib/rag/embed";

function hashString(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
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

  const plans = await prisma.lessonPlan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const hydratedPlans = await Promise.all(
    plans.map(async (plan) => {
      const data = (plan.data as any) || {};
      const existingSources = Array.isArray(data.__sources) ? data.__sources : [];
      if (existingSources.length > 0) return plan;

      const namespaceSeed =
        normalizeForEmbedding(`${plan.topic}|${plan.subject}|${plan.grade}`) ||
        `${plan.topic}|${plan.subject}|${plan.grade}`;
      const namespace = `lesson:${user.id}:${hashString(namespaceSeed)}`;

      const docs = await prisma.document.findMany({
        where: {
          namespace,
          sourceUrl: { not: null },
        },
        select: {
          sourceUrl: true,
          title: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 25,
      });

      const deduped = new Map<string, { url: string; title?: string }>();
      for (const doc of docs) {
        const url = (doc.sourceUrl || "").trim();
        if (!url || deduped.has(url)) continue;
        deduped.set(url, { url, title: doc.title || undefined });
        if (deduped.size >= 5) break;
      }
      const inferredSources = Array.from(deduped.values());
      if (!inferredSources.length) return plan;

      return {
        ...plan,
        data: {
          ...data,
          __sources: inferredSources,
          __sourceTrace: {
            mode: "documents",
            fromCache: false,
            sourceCount: inferredSources.length,
          },
        },
      };
    })
  );

  const latest = hydratedPlans.length
    ? {
        id: hydratedPlans[0].id,
        title: hydratedPlans[0].title,
        subject: hydratedPlans[0].subject,
        createdAt: hydratedPlans[0].createdAt,
      }
    : null;

  return NextResponse.json({ plans: hydratedPlans, latest });
}
