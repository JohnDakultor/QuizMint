import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const quiz = await prisma.quiz.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        questions: true,
        shareSettings: {
          select: { isOpen: true, expiresAt: true },
        },
      },
    });

    let sources: { url: string; title?: string }[] = [];
    let sourceTrace:
      | {
          mode: "none" | "documents" | "semantic_cache";
          fromCache: boolean;
          sourceCount: number;
        }
      | null = null;

    if (quiz) {
      const eventRows = await prisma.$queryRaw<
        Array<{ metadata: unknown; createdAt: Date }>
      >`
        SELECT "metadata", "createdAt"
        FROM "GenerationEvent"
        WHERE "userId" = ${user.id}
          AND "eventType" = 'quiz_generated'
          AND "status" = 'success'
          AND ("feature" = 'quiz' OR "feature" = 'quiz_file_upload')
          AND ("metadata"->>'quizId') = ${String(quiz.id)}
        ORDER BY "createdAt" DESC
        LIMIT 1
      `;

      const eventMeta =
        eventRows[0]?.metadata &&
        typeof eventRows[0].metadata === "object" &&
        !Array.isArray(eventRows[0].metadata)
          ? (eventRows[0].metadata as Record<string, unknown>)
          : null;

      if (eventMeta) {
        const metaSources = Array.isArray(eventMeta.sources)
          ? eventMeta.sources
          : [];
        sources = metaSources
          .reduce<Array<{ url: string; title?: string }>>((acc, source) => {
            if (!source || typeof source !== "object") return acc;
            const obj = source as Record<string, unknown>;
            const url = typeof obj.url === "string" ? obj.url.trim() : "";
            const title =
              typeof obj.title === "string" ? obj.title.trim() : "";
            if (!url) return acc;
            acc.push(title ? { url, title } : { url });
            return acc;
          }, [])
          .slice(0, 5);

        const modeRaw =
          typeof eventMeta.sourceMode === "string"
            ? eventMeta.sourceMode
            : "none";
        const mode =
          modeRaw === "documents" || modeRaw === "semantic_cache"
            ? modeRaw
            : "none";
        const fromCache = Boolean(eventMeta.cacheHit);
        sourceTrace = {
          mode,
          fromCache,
          sourceCount:
            typeof eventMeta.sourceCount === "number"
              ? eventMeta.sourceCount
              : sources.length,
        };

        if (!sources.length && typeof eventMeta.promptPreview === "string") {
          const maybeUrl = eventMeta.promptPreview.trim();
          if (/^https?:\/\//i.test(maybeUrl)) {
            sources = [{ url: maybeUrl }];
            sourceTrace = {
              mode: "documents",
              fromCache,
              sourceCount: 1,
            };
          }
        }
      }
    }

    return NextResponse.json({
      quiz: quiz ?? null,
      shareSettings: quiz?.shareSettings ?? null,
      sources,
      sourceTrace,
      latest: quiz
        ? {
            id: quiz.id,
            title: quiz.title,
            createdAt: quiz.createdAt,
            questionCount: quiz.questions.length,
          }
        : null,
    });
  } catch (err: any) {
    console.error("Latest quiz error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
