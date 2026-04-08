import { normalizeLessonPlanFramework } from "@/lib/lesson-plan-frameworks";

type PptOutlineDay = {
  day: number;
  topic: string;
  keyConcepts: string[];
  examples: string[];
  practiceItems: string[];
  assessment: Array<{ criteria: string; description: string }>;
  closure: string;
  differentiation: string;
};

export type LessonPlanPptOutline = {
  topic: string;
  subject: string;
  grade: string;
  duration: string;
  title: string;
  days: PptOutlineDay[];
  objectives: string[];
  materials: string[];
  standards: string[];
};

export type LessonPlanArtifacts = {
  version: 1;
  pptOutline: LessonPlanPptOutline;
};

function trimText(text: string, max: number) {
  const t = (text || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

function safeArray<T = any>(value: any): T[] {
  if (!Array.isArray(value)) return [];
  return value;
}

function extractRichContentFromLessonPlan(lessonPlan: any) {
  const days = safeArray<any>(lessonPlan?.days || []);

  if (days.length === 0) {
    return [];
  }

  return days.map((day: any, idx: number) => {
    const activities = day?.specificActivities || {};
    const dayTopic = day?.topic || `Day ${idx + 1}`;
    const keyConcepts: string[] = [];
    const examples: string[] = [];
    const practiceItems: string[] = [];

    if (activities?.ACTIVITY) {
      if (activities.ACTIVITY.readingPassage) {
        keyConcepts.push(trimText(activities.ACTIVITY.readingPassage, 180));
      }

      const readingQuestions = safeArray(activities.ACTIVITY.questions);
      readingQuestions.forEach((q: any) => {
        if (q?.question) {
          practiceItems.push(`Question: ${trimText(q.question, 100)}`);
        }
      });
    }

    if (activities?.ANALYSIS) {
      const trueFalse = safeArray(activities.ANALYSIS.trueFalse);
      trueFalse.forEach((tf: any) => {
        if (tf?.statement) {
          keyConcepts.push(`True/False: ${trimText(tf.statement, 120)}`);
        }
      });

      const checklist = safeArray(activities.ANALYSIS.checklist);
      checklist.forEach((item: string) => {
        if (item) {
          keyConcepts.push(`Checklist: ${trimText(item, 100)}`);
        }
      });
    }

    if (activities?.ABSTRACTION) {
      if (activities.ABSTRACTION.explanation) {
        keyConcepts.push(trimText(activities.ABSTRACTION.explanation, 200));
      }

      const pairs = safeArray(activities.ABSTRACTION.pairs);
      pairs.forEach((pair: any) => {
        if (pair?.left && pair?.right) {
          keyConcepts.push(`${trimText(pair.left, 30)} -> ${trimText(pair.right, 80)}`);
        }
      });
    }

    if (activities?.APPLICATION) {
      const mcq = safeArray(activities.APPLICATION.multipleChoice);
      mcq.forEach((q: any) => {
        if (q?.question) {
          practiceItems.push(`Practice: ${trimText(q.question, 100)}`);
        }
      });

      const realWorldExamples = safeArray(activities.APPLICATION.realWorldExamples);
      realWorldExamples.forEach((ex: any) => {
        if (ex?.example) {
          examples.push(trimText(ex.example, 120));
        }
      });

      const identification = activities.APPLICATION.identification;
      if (identification?.clues) {
        const clues = safeArray(identification.clues);
        clues.forEach((clue: string) => {
          examples.push(`Clue: ${trimText(clue, 100)}`);
        });
      }
    }

    const fourAs = safeArray(day["4asModel"]);
    fourAs.forEach((phase: any) => {
      if (phase?.description) {
        keyConcepts.push(trimText(phase.description, 150));
      }
    });

    const assessment = safeArray<any>(day?.assessment).map((a: any) => ({
      criteria: trimText(a?.criteria || "Understanding", 80),
      description: trimText(a?.description || "Demonstrates knowledge", 120),
    }));

    return {
      day: day?.day ?? idx + 1,
      topic: trimText(dayTopic, 80),
      keyConcepts: keyConcepts.length > 0 ? keyConcepts : [`Key ideas about ${dayTopic}`],
      examples: examples.length > 0 ? examples : [`Examples related to ${dayTopic}`],
      practiceItems:
        practiceItems.length > 0 ? practiceItems : [`Practice applying ${dayTopic}`],
      assessment,
      closure: trimText(day?.closure || `Review and reflect on ${dayTopic}`, 180),
      differentiation: trimText(
        day?.differentiation || "Different approaches for different learners",
        150
      ),
    };
  });
}

export function buildLessonPlanPptOutline(input: {
  lessonPlan: any;
  topic: string;
  subject: string;
  grade: string;
  duration: string;
}) {
  return {
    topic: input.topic,
    subject: input.subject,
    grade: input.grade,
    duration: input.duration,
    title: trimText(input.lessonPlan?.title || `${input.topic} Lesson`, 100),
    days: extractRichContentFromLessonPlan(input.lessonPlan),
    objectives: safeArray<string>(input.lessonPlan?.objectives).map((o) =>
      trimText(o, 120)
    ),
    materials: safeArray<string>(input.lessonPlan?.materials).map((m) =>
      trimText(m, 80)
    ),
    standards: safeArray<string>(input.lessonPlan?.standards).map((s) =>
      trimText(s, 100)
    ),
  };
}

export function buildLessonPlanArtifacts(input: {
  lessonPlan: any;
  topic: string;
  subject: string;
  grade: string;
  duration: string;
}) {
  return {
    version: 1 as const,
    pptOutline: buildLessonPlanPptOutline(input),
  };
}

export function attachLessonPlanArtifacts(input: {
  lessonPlan: any;
  topic: string;
  subject: string;
  grade: string;
  duration: string;
}) {
  const artifacts = buildLessonPlanArtifacts(input);
  return {
    ...input.lessonPlan,
    framework: normalizeLessonPlanFramework(input.lessonPlan?.framework),
    __artifacts: artifacts,
  };
}

export function getLessonPlanArtifacts(lessonPlan: any): LessonPlanArtifacts | null {
  if (!lessonPlan || typeof lessonPlan !== "object" || Array.isArray(lessonPlan)) return null;
  const artifacts = (lessonPlan as Record<string, unknown>).__artifacts;
  if (!artifacts || typeof artifacts !== "object" || Array.isArray(artifacts)) return null;
  const version = (artifacts as Record<string, unknown>).version;
  const pptOutline = (artifacts as Record<string, unknown>).pptOutline;
  if (version !== 1 || !pptOutline || typeof pptOutline !== "object" || Array.isArray(pptOutline)) {
    return null;
  }
  return artifacts as LessonPlanArtifacts;
}
