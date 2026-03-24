export type LessonPlanFrameworkId = "four_as" | "five_e" | "ubd";

export type LessonPlanFrameworkPhase = {
  phase: string;
  title: string;
  subtitle: string;
  description: string;
  teacherRole: string;
  studentRole: string;
  materialsHint: string[];
};

export type LessonPlanFrameworkCard = {
  phase: string;
  title: string;
  subtitle: string;
  desc: string;
  shell: string;
  badge: string;
  titleColor: string;
};

export type LessonPlanFrameworkConfig = {
  id: LessonPlanFrameworkId;
  label: string;
  shortLabel: string;
  description: string;
  sectionTitle: string;
  sectionBadgeText: string;
  specificActivitiesTitle: string;
  specificActivitiesBadge: string;
  supportsSpecificActivities: boolean;
  cards: LessonPlanFrameworkCard[];
  phases: LessonPlanFrameworkPhase[];
};

const sharedShells = {
  blue:
    "border-blue-200/80 bg-gradient-to-br from-blue-50 to-white shadow-[0_10px_24px_-18px_rgba(37,99,235,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
  emerald:
    "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white shadow-[0_10px_24px_-18px_rgba(16,185,129,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
  violet:
    "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white shadow-[0_10px_24px_-18px_rgba(139,92,246,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
  amber:
    "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white shadow-[0_10px_24px_-18px_rgba(245,158,11,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
  rose:
    "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white shadow-[0_10px_24px_-18px_rgba(244,63,94,0.75)] dark:border-slate-700 dark:from-slate-900 dark:to-slate-800",
};

export const LESSON_PLAN_FRAMEWORKS: Record<LessonPlanFrameworkId, LessonPlanFrameworkConfig> = {
  four_as: {
    id: "four_as",
    label: "4A's Instructional Model",
    shortLabel: "4A's",
    description:
      "Generate comprehensive lesson plans using the 4A's instructional model with clear separation between pedagogical framework and activity types.",
    sectionTitle: "4A's Pedagogical Framework",
    sectionBadgeText: "4 Phases",
    specificActivitiesTitle: "Specific Activity Types",
    specificActivitiesBadge: "Linked to 4A's phases",
    supportsSpecificActivities: true,
    cards: [
      {
        phase: "ACTIVITY",
        title: "Activity",
        subtitle: "Engagement Phase",
        desc: "Activate prior knowledge",
        shell: sharedShells.blue,
        badge: "bg-gradient-to-r from-blue-500 to-blue-600",
        titleColor: "text-blue-700",
      },
      {
        phase: "ANALYSIS",
        title: "Analysis",
        subtitle: "Exploration Phase",
        desc: "Develop critical thinking",
        shell: sharedShells.emerald,
        badge: "bg-gradient-to-r from-emerald-500 to-emerald-600",
        titleColor: "text-emerald-700",
      },
      {
        phase: "ABSTRACTION",
        title: "Abstraction",
        subtitle: "Concept Development",
        desc: "Present concepts & principles",
        shell: sharedShells.violet,
        badge: "bg-gradient-to-r from-violet-500 to-violet-600",
        titleColor: "text-violet-700",
      },
      {
        phase: "APPLICATION",
        title: "Application",
        subtitle: "Practice & Assessment",
        desc: "Apply real-world skills",
        shell: sharedShells.amber,
        badge: "bg-gradient-to-r from-amber-500 to-orange-500",
        titleColor: "text-amber-700",
      },
    ],
    phases: [
      {
        phase: "ACTIVITY",
        title: "Engagement Phase",
        subtitle: "Activate prior knowledge",
        description: "Connect learners to the lesson through hooks, prior knowledge, and relevant context.",
        teacherRole: "Motivate, connect, and spark curiosity.",
        studentRole: "Recall prior ideas, participate, and engage.",
        materialsHint: ["Hook prompt", "Visual aids", "Starter task"],
      },
      {
        phase: "ANALYSIS",
        title: "Exploration Phase",
        subtitle: "Develop critical thinking",
        description: "Guide students to investigate examples, patterns, and relationships.",
        teacherRole: "Facilitate inquiry and guide discussion.",
        studentRole: "Explore, compare, discuss, and analyze.",
        materialsHint: ["Case examples", "Guided questions", "Group worksheet"],
      },
      {
        phase: "ABSTRACTION",
        title: "Concept Development",
        subtitle: "Formalize understanding",
        description: "Consolidate the key concepts, principles, and takeaways from the exploration.",
        teacherRole: "Explain, model, and clarify misconceptions.",
        studentRole: "Synthesize understanding and take notes.",
        materialsHint: ["Slides", "Concept map", "Worked examples"],
      },
      {
        phase: "APPLICATION",
        title: "Practice & Assessment",
        subtitle: "Apply learning",
        description: "Have learners demonstrate understanding through guided or independent application.",
        teacherRole: "Coach, assess, and provide feedback.",
        studentRole: "Apply, practice, and demonstrate mastery.",
        materialsHint: ["Practice task", "Rubric", "Exit ticket"],
      },
    ],
  },
  five_e: {
    id: "five_e",
    label: "5E Instructional Model",
    shortLabel: "5E",
    description:
      "Generate inquiry-driven lesson plans using the 5E model for structured exploration, explanation, and evaluation.",
    sectionTitle: "5E Learning Sequence",
    sectionBadgeText: "5 Phases",
    specificActivitiesTitle: "Framework Activities",
    specificActivitiesBadge: "Optional framework-linked activities",
    supportsSpecificActivities: false,
    cards: [
      {
        phase: "ENGAGE",
        title: "Engage",
        subtitle: "Spark curiosity",
        desc: "Hook learners into the topic",
        shell: sharedShells.blue,
        badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
        titleColor: "text-blue-700",
      },
      {
        phase: "EXPLORE",
        title: "Explore",
        subtitle: "Investigate concepts",
        desc: "Hands-on inquiry and discovery",
        shell: sharedShells.emerald,
        badge: "bg-gradient-to-r from-emerald-500 to-teal-500",
        titleColor: "text-emerald-700",
      },
      {
        phase: "EXPLAIN",
        title: "Explain",
        subtitle: "Build meaning",
        desc: "Clarify and formalize learning",
        shell: sharedShells.violet,
        badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
        titleColor: "text-violet-700",
      },
      {
        phase: "ELABORATE",
        title: "Elaborate",
        subtitle: "Extend understanding",
        desc: "Transfer learning to new cases",
        shell: sharedShells.amber,
        badge: "bg-gradient-to-r from-amber-500 to-orange-500",
        titleColor: "text-amber-700",
      },
      {
        phase: "EVALUATE",
        title: "Evaluate",
        subtitle: "Check mastery",
        desc: "Assess understanding and growth",
        shell: sharedShells.rose,
        badge: "bg-gradient-to-r from-rose-500 to-pink-500",
        titleColor: "text-rose-700",
      },
    ],
    phases: [
      {
        phase: "ENGAGE",
        title: "Engage",
        subtitle: "Hook and activate thinking",
        description: "Capture interest and connect the topic to prior knowledge or real-life context.",
        teacherRole: "Present an engaging stimulus and activate prior knowledge.",
        studentRole: "Observe, respond, predict, and connect ideas.",
        materialsHint: ["Prompt", "Hook media", "Starter question"],
      },
      {
        phase: "EXPLORE",
        title: "Explore",
        subtitle: "Inquiry and discovery",
        description: "Let learners investigate, experiment, or gather evidence through guided exploration.",
        teacherRole: "Facilitate exploration and guide without over-explaining.",
        studentRole: "Investigate, collaborate, and gather evidence.",
        materialsHint: ["Lab/task sheet", "Data source", "Manipulatives"],
      },
      {
        phase: "EXPLAIN",
        title: "Explain",
        subtitle: "Clarify the concept",
        description: "Develop shared meaning and explicitly connect student discoveries to core content.",
        teacherRole: "Clarify concepts and connect findings to formal ideas.",
        studentRole: "Discuss findings and articulate understanding.",
        materialsHint: ["Slides", "Examples", "Anchor chart"],
      },
      {
        phase: "ELABORATE",
        title: "Elaborate",
        subtitle: "Extend learning",
        description: "Transfer the concept to new contexts, more complex situations, or interdisciplinary tasks.",
        teacherRole: "Provide extension tasks and scaffold transfer.",
        studentRole: "Apply ideas in new situations and deepen reasoning.",
        materialsHint: ["Extension task", "Scenario cards", "Challenge prompt"],
      },
      {
        phase: "EVALUATE",
        title: "Evaluate",
        subtitle: "Measure understanding",
        description: "Assess conceptual understanding, skills, and misconceptions with reflective checks.",
        teacherRole: "Assess, give feedback, and surface misconceptions.",
        studentRole: "Demonstrate understanding and reflect on learning.",
        materialsHint: ["Quiz", "Rubric", "Reflection prompt"],
      },
    ],
  },
  ubd: {
    id: "ubd",
    label: "Understanding by Design (UbD)",
    shortLabel: "UbD",
    description:
      "Generate backward-designed lesson plans using UbD so learning goals, evidence, and lesson flow stay tightly aligned.",
    sectionTitle: "UbD Backward Design Flow",
    sectionBadgeText: "3 Stages",
    specificActivitiesTitle: "Learning Plan Extensions",
    specificActivitiesBadge: "Optional stage-linked activities",
    supportsSpecificActivities: false,
    cards: [
      {
        phase: "DESIRED_RESULTS",
        title: "Desired Results",
        subtitle: "Learning goals",
        desc: "Clarify outcomes and big ideas",
        shell: sharedShells.blue,
        badge: "bg-gradient-to-r from-blue-500 to-cyan-500",
        titleColor: "text-blue-700",
      },
      {
        phase: "EVIDENCE",
        title: "Evidence",
        subtitle: "Success criteria",
        desc: "Define how mastery is shown",
        shell: sharedShells.violet,
        badge: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
        titleColor: "text-violet-700",
      },
      {
        phase: "LEARNING_PLAN",
        title: "Learning Plan",
        subtitle: "Instructional path",
        desc: "Sequence teaching and practice",
        shell: sharedShells.emerald,
        badge: "bg-gradient-to-r from-emerald-500 to-teal-500",
        titleColor: "text-emerald-700",
      },
    ],
    phases: [
      {
        phase: "DESIRED_RESULTS",
        title: "Desired Results",
        subtitle: "Outcomes and understandings",
        description: "Clarify the enduring understandings, essential questions, and targeted learning outcomes.",
        teacherRole: "Define outcomes and focus the lesson on transfer-worthy learning.",
        studentRole: "Understand goals, success targets, and the purpose of learning.",
        materialsHint: ["Success criteria", "Essential questions", "Goal board"],
      },
      {
        phase: "EVIDENCE",
        title: "Evidence",
        subtitle: "Assessment planning",
        description: "Specify what evidence will show understanding, transfer, and skill mastery.",
        teacherRole: "Design assessment checkpoints and exemplars.",
        studentRole: "Examine criteria and prepare to demonstrate mastery.",
        materialsHint: ["Rubric", "Performance task", "Checklist"],
      },
      {
        phase: "LEARNING_PLAN",
        title: "Learning Plan",
        subtitle: "Daily learning experiences",
        description: "Sequence the learning experiences, scaffolds, and practice that lead students to mastery.",
        teacherRole: "Sequence instruction, modeling, and practice.",
        studentRole: "Participate, practice, reflect, and improve.",
        materialsHint: ["Lesson sequence", "Practice tasks", "Reflection prompts"],
      },
    ],
  },
};

export function normalizeLessonPlanFramework(value: unknown): LessonPlanFrameworkId {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_");
  if (normalized === "5e" || normalized === "five_e") return "five_e";
  if (normalized === "ubd") return "ubd";
  return "four_as";
}

export function getLessonPlanFramework(value: unknown): LessonPlanFrameworkConfig {
  return LESSON_PLAN_FRAMEWORKS[normalizeLessonPlanFramework(value)];
}

export function buildFrameworkPhaseModel(
  frameworkValue: unknown,
  args: { topic: string; subject: string; grade: string; minutesPerDay: number }
) {
  const framework = getLessonPlanFramework(frameworkValue);
  const phaseCount = framework.phases.length || 1;
  const baseMinutes = Math.max(1, Math.floor(args.minutesPerDay / phaseCount));
  const remainder = Math.max(0, args.minutesPerDay - baseMinutes * phaseCount);

  return framework.phases.map((phase, index) => ({
    phase: phase.phase,
    title: phase.title,
    timeMinutes: baseMinutes + (index < remainder ? 1 : 0),
    description: `${phase.description} Focus the work on ${args.topic} within ${args.subject} for ${args.grade} learners.`,
    teacherRole: phase.teacherRole,
    studentRole: phase.studentRole,
    materials: phase.materialsHint,
  }));
}
