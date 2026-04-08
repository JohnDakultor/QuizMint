export type LessonPlanWorkloadRoutingInput = {
  topic: string;
  subject: string;
  grade: string;
  framework?: string | null;
  objectives?: string | null;
  constraints?: string | null;
  days: number;
  minutesPerDay: number;
  adaptiveLaunch?: boolean;
  format?: string | null;
  hasProvidedPlan?: boolean;
};

export type LessonPlanWorkloadDecision = {
  score: number;
  shouldQueue: boolean;
  reasons: string[];
};

const DEFAULT_LESSON_PLAN_QUEUE_THRESHOLD = 6;

export function scoreLessonPlanWorkload(
  input: LessonPlanWorkloadRoutingInput
): LessonPlanWorkloadDecision {
  let score = 0;
  const reasons: string[] = [];
  const objectivesLength = String(input.objectives || "").trim().length;
  const constraintsLength = String(input.constraints || "").trim().length;
  const baseLength =
    String(input.topic || "").trim().length +
    String(input.subject || "").trim().length +
    String(input.grade || "").trim().length;
  const format = String(input.format || "json").trim().toLowerCase();

  if (format !== "json") {
    score += 10;
    reasons.push("export_format");
  }

  if (baseLength > 180) {
    score += 1;
    reasons.push("long_base_fields");
  }

  if (objectivesLength > 220) {
    score += 2;
    reasons.push("detailed_objectives");
  }
  if (objectivesLength > 500) {
    score += 2;
    reasons.push("very_detailed_objectives");
  }

  if (constraintsLength > 180) {
    score += 2;
    reasons.push("detailed_constraints");
  }
  if (constraintsLength > 420) {
    score += 2;
    reasons.push("very_detailed_constraints");
  }

  if (Number(input.days) > 3) {
    score += 2;
    reasons.push("multi_day_plan");
  }
  if (Number(input.days) > 5) {
    score += 2;
    reasons.push("extended_multi_day_plan");
  }

  if (Number(input.minutesPerDay) >= 75) {
    score += 1;
    reasons.push("long_daily_duration");
  }

  if (input.adaptiveLaunch) {
    score += 3;
    reasons.push("adaptive_launch");
  }

  if (input.hasProvidedPlan) {
    score = Math.max(0, score - 3);
    reasons.push("provided_plan_reuse");
  }

  return {
    score,
    shouldQueue: score >= DEFAULT_LESSON_PLAN_QUEUE_THRESHOLD,
    reasons,
  };
}

export function shouldQueueLessonPlanGeneration(
  input: LessonPlanWorkloadRoutingInput,
  threshold = DEFAULT_LESSON_PLAN_QUEUE_THRESHOLD
): LessonPlanWorkloadDecision {
  const scored = scoreLessonPlanWorkload(input);
  return {
    ...scored,
    shouldQueue: scored.score >= threshold,
  };
}
