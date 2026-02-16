import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { generateLessonPlanDocx } from "@/lib/generate-lesson-plan-docx";
import { generateLessonPlanPDF } from "@/lib/lessonPlan-gen-pdf-dl";
import { generateLessonPlanPptAI } from "@/lib/lesson-plan-ppt-ai";
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
  input: LessonPlanExportInput
) {
  if (format === "docx") {
    const docx = await generateLessonPlanDocx(input.lessonPlan);
    return Buffer.from(docx);
  }

  if (format === "pdf") {
    const pdf = await generateLessonPlanPDF(input.lessonPlan, input.topic);
    return Buffer.from(pdf);
  }

  const deck = await generateLessonPlanPptAI({
    lessonPlan: input.lessonPlan,
    topic: input.topic,
    subject: input.subject,
    grade: input.grade,
    duration: `${input.days} day(s), ${input.minutesPerDay} minutes per day`,
    isProOrPremium: true,
  });
  const pptx = await generateLessonPlanPptx(deck);
  return Buffer.from(pptx);
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
    return prisma.lessonPlanExport.findFirst({
      where: { id: jobId, userId },
    });
  }

  const job = await prisma.lessonPlanExport.findFirst({
    where: { id: jobId, userId },
  });
  if (!job) return null;

  try {
    const input = job.input as unknown as LessonPlanExportInput;
    const format = job.format as LessonPlanExportFormat;
    const buffer = await generateExportBuffer(format, input);
    const mimeType = getMimeType(format);
    const fileName = getFileName(input.topic, format);

    return await prisma.lessonPlanExport.update({
      where: { id: jobId },
      data: {
        status: "completed",
        resultData: buffer,
        mimeType,
        fileName,
        completedAt: new Date(),
      },
    });
  } catch (err: any) {
    return await prisma.lessonPlanExport.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: err?.message || "Export failed",
        completedAt: new Date(),
      },
    });
  }
}

