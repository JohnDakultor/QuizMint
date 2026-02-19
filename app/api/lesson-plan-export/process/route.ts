import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";
import { processLessonPlanExportJob } from "@/lib/lesson-plan-export";

export const runtime = "nodejs";
const PROVIDER_ISSUE_MESSAGE =
  "Server issue - we're fixing it. Please try again in a few minutes.";

function isProviderIssueError(err: unknown): boolean {
  const message = String((err as { message?: string })?.message || "");
  return (
    message.includes("AI response failed:") ||
    message.includes("Quota exceeded") ||
    message.includes('"code":402') ||
    message.includes("Provider returned error")
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscriptionPlan: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.subscriptionPlan !== "premium") {
      return NextResponse.json({ error: "Premium required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    let jobId = body?.jobId ? String(body.jobId) : "";

    if (!jobId) {
      const nextQueued = await prisma.lessonPlanExport.findFirst({
        where: { userId: user.id, status: "queued" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!nextQueued) {
        return NextResponse.json({ error: "No queued job" }, { status: 404 });
      }
      jobId = nextQueued.id;
    }

    const job = await processLessonPlanExportJob(jobId, user.id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      error: job.error || null,
    });
  } catch (err: any) {
    if (isProviderIssueError(err)) {
      return NextResponse.json({ error: PROVIDER_ISSUE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json(
      { error: err?.message || "Failed to process job" },
      { status: 500 }
    );
  }
}
