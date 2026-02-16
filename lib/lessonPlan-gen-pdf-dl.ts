import PDFDocument from "pdfkit";
import { Buffer } from "buffer";

export interface LessonPlanDay {
  day: number;
  topic: string;
  "4asModel": Array<{
    phase: string;
    title: string;
    timeMinutes: number;
    description: string;
    teacherRole: string;
    studentRole: string;
    materials: string[];
  }>;
  specificActivities: {
    ACTIVITY?: {
      type: string;
      readingPassage: string;
      questions: Array<{ question: string; answer: string }>;
    };
    ANALYSIS?: {
      type: string;
      trueFalse: Array<{ statement: string; answer: string; explanation: string }>;
      checklist: string[];
    };
    ABSTRACTION?: {
      type: string;
      pairs: Array<{ left: string; right: string }>;
      explanation: string;
    };
    APPLICATION?: {
      type: string;
      multipleChoice: Array<{ question: string; options: string[]; answer: string; explanation: string }>;
      identification: { clues: string[]; wordBank: string[]; answers: string[] };
    };
  };
  assessment: Array<{
    criteria: string;
    description: string;
    rubricLevel: {
      excellent: string;
      satisfactory: string;
      needsImprovement: string;
    };
  }>;
  differentiation: string;
  closure: string;
}

export interface LessonPlanData {
  title: string;
  grade: string;
  duration: string;
  objectives: string[];
  days: LessonPlanDay[];
}

const PAGE = {
  x: 50,
  width: 512,
  padding: 12,
};

export async function generateLessonPlanPDF(
  lessonPlan: LessonPlanData,
  topic: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        bufferPages: true,
        info: {
          Title: `Lesson Plan: ${lessonPlan.title}`,
          Author: "Quizmints AI",
          Subject: "Lesson Plan",
          Creator: "Quizmints",
          Producer: "Quizmints PDF Generator",
          CreationDate: new Date(),
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      addHeader(doc, lessonPlan.title);
      addBasicInfo(doc, lessonPlan);
      addObjectives(doc, lessonPlan.objectives);
      addDaysContent(doc, lessonPlan.days);
      addFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function addHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.rect(0, 0, 612, 90).fill("#1d4ed8");
  doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text(title, 50, 26);
  doc
    .fillColor("#dbeafe")
    .fontSize(12)
    .font("Helvetica-Oblique")
    .text("4A's Model Lesson Plan - Quizmints AI", 50, 58);
  doc.fillColor("#000000");
  doc.y = 110;
}

function addBasicInfo(doc: PDFKit.PDFDocument, lessonPlan: LessonPlanData) {
  const y = doc.y;
  const h = 58;
  ensureSpace(doc, h + 10);
  doc.roundedRect(PAGE.x, y, PAGE.width, h, 10).fill("#eef2ff").stroke("#c7d2fe");

  doc.fillColor("#1e3a8a").fontSize(12).font("Helvetica-Bold").text("Grade:", 62, y + 12);
  doc.fillColor("#374151").font("Helvetica").text(lessonPlan.grade, 110, y + 12);

  doc.fillColor("#1e3a8a").font("Helvetica-Bold").text("Duration:", 62, y + 30);
  doc.fillColor("#374151").font("Helvetica").text(lessonPlan.duration, 125, y + 30);

  doc.fillColor("#1e3a8a").font("Helvetica-Bold").text("Model:", 300, y + 12);
  doc.fillColor("#374151").font("Helvetica").text("4A's Instructional Model", 350, y + 12);

  doc.fillColor("#1e3a8a").font("Helvetica-Bold").text("Generated:", 300, y + 30);
  doc.fillColor("#374151").font("Helvetica").text("Quizmints AI", 370, y + 30);

  doc.y = y + h + 12;
}

function addObjectives(doc: PDFKit.PDFDocument, objectives: string[]) {
  if (!objectives || objectives.length === 0) return;
  drawSectionTitle(doc, "Learning Objectives", "#2563eb");

  const itemHeights = objectives.map((obj) =>
    textHeight(doc, obj, PAGE.width - 30, 11, "Helvetica", 2)
  );
  const contentHeight =
    itemHeights.reduce((a, b) => a + b, 0) + (objectives.length - 1) * 6;
  const cardHeight = PAGE.padding * 2 + contentHeight;

  drawCard(doc, cardHeight, "#eff6ff", "#bfdbfe");
  const startY = doc.y;
  let cursorY = startY + PAGE.padding;

  objectives.forEach((obj, i) => {
    doc.fillColor("#2563eb").fontSize(12).font("Helvetica-Bold").text("-", PAGE.x + 10, cursorY);
    doc
      .fillColor("#374151")
      .fontSize(11)
      .font("Helvetica")
      .text(obj, PAGE.x + 25, cursorY - 1, { width: PAGE.width - 30, align: "left" });
    cursorY += itemHeights[i] + 6;
  });

  doc.y = startY + cardHeight + 10;
}

function addDaysContent(doc: PDFKit.PDFDocument, days: LessonPlanDay[]) {
  days.forEach((day, idx) => {
    if (idx > 0) {
      doc.addPage();
      addHeader(doc, `Day ${day.day}: ${day.topic}`);
    }
    drawSectionTitle(doc, `Day ${day.day}: ${day.topic}`, "#0f766e");
    add4AsModel(doc, day["4asModel"]);
    addSpecificActivities(doc, day.specificActivities);
    addAssessment(doc, day.assessment);
    addDifferentiation(doc, day.differentiation);
    addClosure(doc, day.closure);
  });
}

function add4AsModel(doc: PDFKit.PDFDocument, fourAsModel: any[]) {
  drawSectionTitle(doc, "4A's Pedagogical Framework", "#2563eb");

  const phaseColors: Record<string, { accent: string; bg: string; border: string }> = {
    ACTIVITY: { accent: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    ANALYSIS: { accent: "#059669", bg: "#ecfdf3", border: "#bbf7d0" },
    ABSTRACTION: { accent: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
    APPLICATION: { accent: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  };

  fourAsModel.forEach((phase) => {
    const colors = phaseColors[phase.phase] || {
      accent: "#475569",
      bg: "#f8fafc",
      border: "#e2e8f0",
    };

    const header = `${phase.phase} - ${phase.title} (${phase.timeMinutes} mins)`;
    const descH = textHeight(doc, phase.description, PAGE.width - 70, 10, "Helvetica", 2);
    const teacherH = textHeight(doc, phase.teacherRole, PAGE.width - 140, 9, "Helvetica", 2);
    const studentH = textHeight(doc, phase.studentRole, PAGE.width - 140, 9, "Helvetica", 2);
    const materials = (phase.materials || []).slice(0, 3).join(", ");
    const materialsH = materials
      ? textHeight(doc, materials, PAGE.width - 130, 9, "Helvetica", 2)
      : 0;

    const cardHeight =
      PAGE.padding * 2 +
      16 +
      descH +
      8 +
      teacherH +
      6 +
      studentH +
      (materials ? 6 + materialsH : 0);

    drawCard(doc, cardHeight, colors.bg, colors.border);
    const cardTop = doc.y;
    doc.rect(PAGE.x, cardTop, 6, cardHeight).fill(colors.accent);

    let y = cardTop + PAGE.padding;
    doc.fillColor(colors.accent).fontSize(12).font("Helvetica-Bold").text(header, PAGE.x + 15, y);
    y += 16;

    doc.fillColor("#374151").fontSize(10).font("Helvetica").text(phase.description, PAGE.x + 15, y, {
      width: PAGE.width - 25,
      align: "left",
    });
    y += descH + 6;

    doc.fillColor("#111827").fontSize(9).font("Helvetica-Bold").text("Teacher Role:", PAGE.x + 15, y);
    doc.fillColor("#4b5563").fontSize(9).font("Helvetica").text(phase.teacherRole, PAGE.x + 90, y, {
      width: PAGE.width - 100,
      align: "left",
    });
    y += teacherH + 6;

    doc.fillColor("#111827").fontSize(9).font("Helvetica-Bold").text("Student Role:", PAGE.x + 15, y);
    doc.fillColor("#4b5563").fontSize(9).font("Helvetica").text(phase.studentRole, PAGE.x + 90, y, {
      width: PAGE.width - 100,
      align: "left",
    });
    y += studentH + 6;

    if (materials) {
      doc.fillColor("#111827").fontSize(9).font("Helvetica-Bold").text("Materials:", PAGE.x + 15, y);
      doc.fillColor("#4b5563").fontSize(9).font("Helvetica").text(materials, PAGE.x + 85, y, {
        width: PAGE.width - 95,
        align: "left",
      });
    }

    doc.y = cardTop + cardHeight + 10;
  });
}

function addSpecificActivities(doc: PDFKit.PDFDocument, activities: any) {
  drawSectionTitle(doc, "Specific Activity Types", "#7c3aed");

  Object.entries(activities).forEach(([phase, activity]: [string, any]) => {
    const phaseColors: Record<string, string> = {
      ACTIVITY: "#3b82f6",
      ANALYSIS: "#10b981",
      ABSTRACTION: "#8b5cf6",
      APPLICATION: "#f59e0b",
    };

    const header = `${phase}: ${activity.type || "Activity"}`;
    let content = "";

    if (phase === "ACTIVITY" && activity.readingPassage) {
      content += `Reading Passage:\n${activity.readingPassage}\n\n`;
      if (Array.isArray(activity.questions)) {
        content += "Questions:\n";
        activity.questions.forEach((q: any, i: number) => {
          content += `Q${i + 1}: ${q.question}\nA: ${q.answer}\n`;
        });
      }
    } else if (phase === "ANALYSIS") {
      if (Array.isArray(activity.trueFalse)) {
        content += "True/False:\n";
        activity.trueFalse.forEach((tf: any, i: number) => {
          content += `${i + 1}. ${tf.statement} (${tf.answer})\n`;
        });
      }
      if (Array.isArray(activity.checklist)) {
        content += "\nChecklist:\n";
        activity.checklist.forEach((c: string, i: number) => {
          content += `- ${c}\n`;
        });
      }
    } else if (phase === "ABSTRACTION") {
      if (Array.isArray(activity.pairs)) {
        content += "Matching:\n";
        activity.pairs.forEach((p: any) => {
          content += `${p.left} -> ${p.right}\n`;
        });
      }
      if (activity.explanation) {
        content += `\nExplanation:\n${activity.explanation}\n`;
      }
    } else if (phase === "APPLICATION") {
      if (Array.isArray(activity.multipleChoice)) {
        content += "Multiple Choice:\n";
        activity.multipleChoice.forEach((mc: any, i: number) => {
          content += `Q${i + 1}: ${mc.question}\n`;
          if (Array.isArray(mc.options)) content += mc.options.join(" | ") + "\n";
          if (mc.answer) content += `Answer: ${mc.answer}\n`;
        });
      }
      if (activity.identification) {
        content += "\nIdentification:\n";
        if (Array.isArray(activity.identification.clues)) {
          activity.identification.clues.forEach((clue: string, i: number) => {
            const ans = activity.identification.answers?.[i] ?? "";
            content += `${i + 1}. ${clue}${ans ? ` (Answer: ${ans})` : ""}\n`;
          });
        }
      }
    }

    const contentHeight = textHeight(doc, content, PAGE.width - 20, 9, "Helvetica", 2);
    const cardHeight = PAGE.padding * 2 + 14 + contentHeight;

    drawCard(doc, cardHeight, "#ffffff", "#e5e7eb");
    const top = doc.y;
    doc.fillColor(phaseColors[phase] || "#6b7280")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(header, PAGE.x + 10, top + PAGE.padding);

    doc.fillColor("#475569")
      .fontSize(9)
      .font("Helvetica")
      .text(content.trim(), PAGE.x + 10, top + PAGE.padding + 16, {
        width: PAGE.width - 20,
        align: "left",
      });

    doc.y = top + cardHeight + 10;
  });
}

function addAssessment(doc: PDFKit.PDFDocument, assessments: any[]) {
  if (!assessments || assessments.length === 0) return;
  drawSectionTitle(doc, "Assessment / Rubrics", "#dc2626");

  assessments.forEach((assessment) => {
    const descH = textHeight(doc, assessment.description, PAGE.width - 20, 10, "Helvetica", 2);
    const exH = textHeight(doc, assessment.rubricLevel?.excellent ?? "", PAGE.width - 100, 9, "Helvetica", 2);
    const satH = textHeight(doc, assessment.rubricLevel?.satisfactory ?? "", PAGE.width - 100, 9, "Helvetica", 2);
    const needH = textHeight(doc, assessment.rubricLevel?.needsImprovement ?? "", PAGE.width - 100, 9, "Helvetica", 2);
    const cardHeight = PAGE.padding * 2 + 12 + descH + 8 + exH + 6 + satH + 6 + needH;

    drawCard(doc, cardHeight, "#f8fafc", "#e2e8f0");
    const top = doc.y;
    let y = top + PAGE.padding;
    doc.fillColor("#1e3a8a").fontSize(12).font("Helvetica-Bold").text(assessment.criteria, PAGE.x + 10, y);
    y += 14;
    doc.fillColor("#475569").fontSize(10).font("Helvetica").text(assessment.description, PAGE.x + 10, y, {
      width: PAGE.width - 20,
      align: "left",
    });
    y += descH + 6;

    y = renderRubricLine(doc, y, "Excellent", assessment.rubricLevel?.excellent ?? "", "#10b981");
    y = renderRubricLine(doc, y + 4, "Satisfactory", assessment.rubricLevel?.satisfactory ?? "", "#f59e0b");
    y = renderRubricLine(doc, y + 4, "Needs Improvement", assessment.rubricLevel?.needsImprovement ?? "", "#ef4444");

    doc.y = top + cardHeight + 10;
  });
}

function addDifferentiation(doc: PDFKit.PDFDocument, differentiation: string) {
  if (!differentiation) return;
  drawSectionTitle(doc, "Differentiation Strategies", "#059669");
  const contentHeight = textHeight(doc, differentiation, PAGE.width - 20, 10, "Helvetica", 2);
  const cardHeight = PAGE.padding * 2 + contentHeight;
  drawCard(doc, cardHeight, "#ecfdf3", "#bbf7d0");
  const top = doc.y;
  doc.fillColor("#374151").fontSize(10).font("Helvetica").text(differentiation, PAGE.x + 10, top + PAGE.padding, {
    width: PAGE.width - 20,
    align: "left",
  });
  doc.y = top + cardHeight + 10;
}

function addClosure(doc: PDFKit.PDFDocument, closure: string) {
  if (!closure) return;
  drawSectionTitle(doc, "Lesson Closure", "#7c3aed");
  const contentHeight = textHeight(doc, closure, PAGE.width - 20, 10, "Helvetica", 2);
  const cardHeight = PAGE.padding * 2 + contentHeight;
  drawCard(doc, cardHeight, "#f5f3ff", "#ddd6fe");
  const top = doc.y;
  doc.fillColor("#374151").fontSize(10).font("Helvetica").text(closure, PAGE.x + 10, top + PAGE.padding, {
    width: PAGE.width - 20,
    align: "left",
  });
  doc.y = top + cardHeight + 10;
}

function addFooter(doc: PDFKit.PDFDocument) {
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(50, 780).lineTo(562, 780).stroke();
    doc.fillColor("#6b7280").fontSize(10).font("Helvetica").text(`Page ${i + 1} of ${pageCount}`, 50, 790, {
      align: "left",
      width: 512,
    });
    doc.fillColor("#9ca3af").fontSize(9).font("Helvetica-Oblique").text("© Quizmints AI - Generated Lesson Plan", 50, 790, {
      align: "right",
      width: 512,
    });
  }
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, color: string) {
  ensureSpace(doc, 26);
  doc.fillColor(color).fontSize(14).font("Helvetica-Bold").text(title, PAGE.x, doc.y);
  doc.moveDown(0.4);
}

function drawCard(doc: PDFKit.PDFDocument, height: number, bg: string, border: string) {
  ensureSpace(doc, height + 6);
  doc.roundedRect(PAGE.x, doc.y, PAGE.width, height, 10).fill(bg).stroke(border);
}

function textHeight(
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  size: number,
  font: string,
  lineGap: number
) {
  doc.font(font).fontSize(size);
  return doc.heightOfString(text || "", { width, lineGap });
}

function renderRubricLine(
  doc: PDFKit.PDFDocument,
  y: number,
  label: string,
  text: string,
  color: string
) {
  doc.fillColor(color).fontSize(9).font("Helvetica-Bold").text(`${label}:`, PAGE.x + 10, y);
  doc.fillColor("#475569").fontSize(9).font("Helvetica").text(text, PAGE.x + 90, y, {
    width: PAGE.width - 100,
    align: "left",
  });
  const h = textHeight(doc, text, PAGE.width - 100, 9, "Helvetica", 2);
  return y + h;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}
