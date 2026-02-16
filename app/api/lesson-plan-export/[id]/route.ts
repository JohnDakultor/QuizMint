import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-option";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await params;
    const job = await prisma.lessonPlanExport.findFirst({
      where: { id, userId: user.id },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const download = req.nextUrl.searchParams.get("download") === "1";
    if (download) {
      if (job.status !== "completed" || !job.resultData || !job.mimeType || !job.fileName) {
        return NextResponse.json(
          { error: "File not ready" },
          { status: 409 }
        );
      }
      return new NextResponse(new Uint8Array(job.resultData), {
        headers: {
          "Content-Type": job.mimeType,
          "Content-Disposition": `attachment; filename="${job.fileName}"`,
          "Cache-Control": "private, max-age=60",
        },
      });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      error: job.error || null,
      ready: job.status === "completed",
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch export job" },
      { status: 500 }
    );
  }
}
