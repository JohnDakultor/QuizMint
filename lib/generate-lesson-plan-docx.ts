// lib/generate-lesson-plan-docx.ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

type HeadingLevelType = (typeof HeadingLevel)[keyof typeof HeadingLevel];

function safeString(value: any, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function safeArray<T = any>(value: any): T[] {
  if (!Array.isArray(value)) return [];
  return value;
}

function heading(text: string, level: HeadingLevelType, after = 200, before = 0) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before, after },
  });
}

function labelValue(label: string, value: string, after = 100) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, color: "374151" }),
      new TextRun({ text: value, color: "4B5563" }),
    ],
    spacing: { after },
  });
}

function bullet(text: string, indent = 360, after = 60) {
  return new Paragraph({
    children: [new TextRun({ text: `- ${text}`, color: "4B5563" })],
    spacing: { after },
    indent: { left: indent },
  });
}

function paragraph(text: string, after = 120, indent = 0) {
  return new Paragraph({
    children: [new TextRun({ text, color: "4B5563" })],
    spacing: { after },
    indent: indent ? { left: indent } : undefined,
  });
}

export async function generateLessonPlanDocx(lessonPlan: any): Promise<Buffer> {
  const children: Paragraph[] = [];

  const title = safeString(lessonPlan?.title, "Lesson Plan");
  children.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 40, color: "1E40AF" })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Grade: ", bold: true, color: "374151" }),
        new TextRun({ text: safeString(lessonPlan?.grade, "Unknown"), color: "4B5563" }),
        new TextRun({ text: "   -   ", color: "9CA3AF" }),
        new TextRun({ text: "Duration: ", bold: true, color: "374151" }),
        new TextRun({ text: safeString(lessonPlan?.duration, "Unknown"), color: "4B5563" }),
      ],
      spacing: { after: 200 },
    })
  );

  children.push(heading("Learning Objectives", HeadingLevel.HEADING_2, 120));
  const objectives = safeArray<string>(lessonPlan?.objectives);
  if (objectives.length === 0) {
    children.push(paragraph("No objectives provided.", 120));
  } else {
    objectives.forEach((obj) => children.push(bullet(safeString(obj), 360, 40)));
    children.push(new Paragraph({ text: "" }));
  }

  const days = safeArray<any>(lessonPlan?.days);
  days.forEach((day, dayIndex) => {
    const dayNumber = day?.day ?? dayIndex + 1;
    const dayTopic = safeString(day?.topic, "Lesson Day");
    children.push(heading(`Day ${dayNumber}: ${dayTopic}`, HeadingLevel.HEADING_1, 200, 200));

    // 4A's Pedagogical Framework
    children.push(heading("4A's Pedagogical Framework", HeadingLevel.HEADING_2, 120));
    const phases = safeArray<any>(day?.["4asModel"]);
    if (phases.length === 0) {
      children.push(paragraph("No 4A's phases provided.", 120));
    } else {
      phases.forEach((phase) => {
        const phaseTitle = safeString(phase?.phase, "PHASE");
        const phaseName = safeString(phase?.title, "");
        const mins = safeString(phase?.timeMinutes, "10");
        children.push(
          heading(`${phaseTitle} - ${phaseName} (${mins} mins)`, HeadingLevel.HEADING_3, 80, 120)
        );

        const description = safeString(phase?.description, "");
        if (description) children.push(paragraph(description, 120, 240));

        const teacherRole = safeString(phase?.teacherRole, "");
        if (teacherRole) children.push(labelValue("Teacher Role", teacherRole, 80));

        const studentRole = safeString(phase?.studentRole, "");
        if (studentRole) children.push(labelValue("Student Role", studentRole, 80));

        const materials = safeArray<string>(phase?.materials);
        if (materials.length > 0) {
          children.push(new Paragraph({ children: [new TextRun({ text: "Materials:", bold: true, color: "374151" })] }));
          materials.forEach((m) => children.push(bullet(safeString(m), 360, 40)));
          children.push(new Paragraph({ text: "" }));
        }
      });
    }

    // Specific Activities
    const activities = day?.specificActivities;
    children.push(heading("Specific Activity Types", HeadingLevel.HEADING_2, 120, 200));
    if (!activities || typeof activities !== "object") {
      children.push(paragraph("No specific activities provided.", 120));
    } else {
      Object.entries(activities).forEach(([phase, activity]: [string, any]) => {
        const activityType = safeString(activity?.type, "Activity");
        children.push(heading(`${phase}: ${activityType}`, HeadingLevel.HEADING_3, 80, 120));

        if (phase === "ACTIVITY" && activity?.readingPassage) {
          children.push(labelValue("Reading Passage", safeString(activity.readingPassage), 80));
          const questions = safeArray<any>(activity?.questions);
          if (questions.length > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: "Questions:", bold: true, color: "374151" })] }));
            questions.forEach((q, idx) => {
              const qText = safeString(q?.question, "");
              const aText = safeString(q?.answer, "");
              if (qText) children.push(bullet(`Q${idx + 1}: ${qText}`, 360, 30));
              if (aText) children.push(bullet(`A: ${aText}`, 420, 40));
            });
          }
        }

        if (phase === "ANALYSIS") {
          const trueFalse = safeArray<any>(activity?.trueFalse);
          if (trueFalse.length > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: "True/False:", bold: true, color: "374151" })] }));
            trueFalse.forEach((tf, idx) => {
              const statement = safeString(tf?.statement, "");
              const answer = safeString(tf?.answer, "");
              if (statement) {
                children.push(bullet(`${idx + 1}. ${statement}${answer ? ` (${answer})` : ""}`, 360, 30));
              }
            });
          }
          const checklist = safeArray<string>(activity?.checklist);
          if (checklist.length > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: "Checklist:", bold: true, color: "374151" })] }));
            checklist.forEach((c) => children.push(bullet(safeString(c), 360, 30)));
          }
        }

        if (phase === "ABSTRACTION") {
          const pairs = safeArray<any>(activity?.pairs);
          if (pairs.length > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: "Matching:", bold: true, color: "374151" })] }));
            pairs.forEach((p) => {
              const left = safeString(p?.left, "");
              const right = safeString(p?.right, "");
              if (left || right) children.push(bullet(`${left} -> ${right}`, 360, 30));
            });
          }
          const explanation = safeString(activity?.explanation, "");
          if (explanation) children.push(labelValue("Concept Explanation", explanation, 80));
        }

        if (phase === "APPLICATION") {
          const mc = safeArray<any>(activity?.multipleChoice);
          if (mc.length > 0) {
            children.push(new Paragraph({ children: [new TextRun({ text: "Multiple Choice:", bold: true, color: "374151" })] }));
            mc.forEach((item, idx) => {
              const q = safeString(item?.question, "");
              if (q) children.push(bullet(`Q${idx + 1}: ${q}`, 360, 30));
              const options = safeArray<string>(item?.options);
              options.forEach((opt) => children.push(bullet(opt, 420, 20)));
              const answer = safeString(item?.answer, "");
              if (answer) children.push(bullet(`Answer: ${answer}`, 420, 30));
            });
          }

          const identification = activity?.identification;
          if (identification) {
            children.push(new Paragraph({ children: [new TextRun({ text: "Identification:", bold: true, color: "374151" })] }));
            const clues = safeArray<string>(identification?.clues);
            const answers = safeArray<string>(identification?.answers);
            clues.forEach((clue, idx) => {
              const ans = answers[idx] ? ` (Answer: ${safeString(answers[idx])})` : "";
              children.push(bullet(`${idx + 1}. ${safeString(clue)}${ans}`, 360, 30));
            });
            const wordBank = safeArray<string>(identification?.wordBank);
            if (wordBank.length > 0) {
              children.push(new Paragraph({ children: [new TextRun({ text: "Word Bank:", bold: true, color: "374151" })] }));
              wordBank.forEach((w) => children.push(bullet(safeString(w), 360, 20)));
            }
          }
        }

        children.push(new Paragraph({ text: "" }));
      });
    }

    // Differentiation
    const differentiation = safeString(day?.differentiation, "");
    if (differentiation) {
      children.push(heading("Differentiation Strategies", HeadingLevel.HEADING_2, 80, 200));
      children.push(paragraph(differentiation, 120, 240));
    }

    // Closure
    const closure = safeString(day?.closure, "");
    if (closure) {
      children.push(heading("Lesson Closure", HeadingLevel.HEADING_2, 80, 160));
      children.push(paragraph(closure, 120, 240));
    }

    // Assessment
    const assessments = safeArray<any>(day?.assessment);
    children.push(heading("Assessment / Rubrics", HeadingLevel.HEADING_2, 120, 200));
    if (assessments.length === 0) {
      children.push(paragraph("No assessment rubrics provided.", 120));
    } else {
      assessments.forEach((assess) => {
        const criteria = safeString(assess?.criteria, "");
        const description = safeString(assess?.description, "");
        if (criteria) children.push(heading(criteria, HeadingLevel.HEADING_3, 60, 80));
        if (description) children.push(paragraph(description, 80, 240));

        const rubric = assess?.rubricLevel || {};
        const excellent = safeString(rubric?.excellent, "");
        const satisfactory = safeString(rubric?.satisfactory, "");
        const needsImprovement = safeString(rubric?.needsImprovement, "");
        if (excellent) children.push(labelValue("Excellent", excellent, 60));
        if (satisfactory) children.push(labelValue("Satisfactory", satisfactory, 60));
        if (needsImprovement) children.push(labelValue("Needs Improvement", needsImprovement, 120));
      });
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
            size: {
              width: 12240,
              height: 15840,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
