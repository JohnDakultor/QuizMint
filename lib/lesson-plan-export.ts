import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { generateLessonPlanDocx } from "@/lib/generate-lesson-plan-docx";
import { generateLessonPlanPDF } from "@/lib/lessonPlan-gen-pdf-dl";
import { generateLessonPlanPptAIWithMeta } from "@/lib/lesson-plan-ppt-ai";
import { generateLessonPlanPptx } from "@/lib/generate-lesson-plan-pptx";

export type LessonPlanExportFormat = "docx" | "pdf" | "pptx";

export type LessonPlanExportInput = {
  lessonPlan: any;
  topic: string;
  subject: string;
  grade: string;
  days: number;
  minutesPerDay: number;
};

export function getLessonPlanExportHash(input: LessonPlanExportInput) {
  const stable = JSON.stringify({
    lessonPlan: input.lessonPlan,
    topic: input.topic,
    subject: input.subject,
    grade: input.grade,
    days: input.days,
    minutesPerDay: input.minutesPerDay,
  });
  return createHash("sha256").update(stable).digest("hex");
}

export function getMimeType(format: LessonPlanExportFormat) {
  if (format === "pdf") return "application/pdf";
  if (format === "pptx")
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export function getFileName(topic: string, format: LessonPlanExportFormat) {
  const safe = (topic || "Lesson_Plan").replace(/\s+/g, "_");
  return `${safe}_Lesson_Plan.${format}`;
}

export async function generateExportBuffer(
  format: LessonPlanExportFormat,
  input: LessonPlanExportInput,
  options?: { liteMode?: boolean }
) {
  if (format === "docx") {
    const docx = await generateLessonPlanDocx(input.lessonPlan);
    return {
      buffer: Buffer.from(docx),
      telemetry: {
        costUsd: 0,
      },
    };
  }

  if (format === "pdf") {
    const pdf = await generateLessonPlanPDF(input.lessonPlan, input.topic);
    return {
      buffer: Buffer.from(pdf),
      telemetry: {
        costUsd: 0,
      },
    };
  }

  const pptAIResult = await generateLessonPlanPptAIWithMeta({
    lessonPlan: input.lessonPlan,
    topic: input.topic,
    subject: input.subject,
    grade: input.grade,
    duration: `${input.days} day(s), ${input.minutesPerDay} minutes per day`,
    isProOrPremium: true,
  }, { liteMode: Boolean(options?.liteMode) });
  const pptx = await generateLessonPlanPptx(pptAIResult.deck, {
    liteMode: Boolean(options?.liteMode),
  });
  return {
    buffer: Buffer.from(pptx),
    telemetry: {
      costUsd: pptAIResult.meta.estimatedCostUsd ?? 0,
      retryCount: pptAIResult.meta.retryCount,
      fallbackUsed: pptAIResult.meta.fallbackUsed,
      finalModel: pptAIResult.meta.finalModel,
      finalProvider: pptAIResult.meta.finalProvider,
      promptTokens: pptAIResult.meta.promptTokens,
      completionTokens: pptAIResult.meta.completionTokens,
      totalTokens: pptAIResult.meta.totalTokens,
    },
  };
}

export async function processLessonPlanExportJob(jobId: string, userId: string) {
  const updated = await prisma.lessonPlanExport.updateMany({
    where: {
      id: jobId,
      userId,
      status: "queued",
    },
    data: {
      status: "processing",
      startedAt: new Date(),
      error: null,
    },
  });

  if (updated.count === 0) {
    const existingJob = await prisma.lessonPlanExport.findFirst({
      where: { id: jobId, userId },
    });
    if (!existingJob) return null;
    return {
      job: existingJob,
      telemetry: {
        costUsd: 0,
      },
    };
  }

  const job = await prisma.lessonPlanExport.findFirst({
    where: { id: jobId, userId },
  });
  if (!job) return null;

  try {
    const input = job.input as unknown as LessonPlanExportInput;
    const format = job.format as LessonPlanExportFormat;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { liteMode: true },
    });
    const generated = await generateExportBuffer(format, input, {
      liteMode: Boolean(user?.liteMode),
    });
    const mimeType = getMimeType(format);
    const fileName = getFileName(input.topic, format);

    const completedJob = await prisma.lessonPlanExport.update({
      where: { id: jobId },
      data: {
        status: "completed",
        resultData: generated.buffer,
        mimeType,
        fileName,
        completedAt: new Date(),
      },
    });
    return {
      job: completedJob,
      telemetry: generated.telemetry,
    };
  } catch (err: any) {
    const failedJob = await prisma.lessonPlanExport.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: err?.message || "Export failed",
        completedAt: new Date(),
      },
    });
    return {
      job: failedJob,
      telemetry: {
        costUsd: 0,
      },
    };
  }
}
