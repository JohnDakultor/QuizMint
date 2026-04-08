export type QuizWorkloadQuestionMix = {
  mcq?: number;
  trueFalse?: number;
  fillBlank?: number;
  shortAnswer?: number;
  matching?: number;
  essayRubric?: number;
  worksheet?: number;
  gamified?: number;
} | null;

export type QuizWorkloadRoutingInput = {
  text: string;
  requestedItemCount: number | null;
  questionMix: QuizWorkloadQuestionMix;
  adaptiveLearning: boolean;
};

export type QuizWorkloadDecision = {
  score: number;
  shouldQueue: boolean;
  reasons: string[];
};

const DEFAULT_QUIZ_QUEUE_THRESHOLD = 6;

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

export function scoreQuizGenerationWorkload(
  input: QuizWorkloadRoutingInput
): QuizWorkloadDecision {
  const text = String(input.text || "").trim();
  if (!text) {
    return { score: 0, shouldQueue: false, reasons: [] };
  }

  const reasons: string[] = [];
  let score = 0;

  const requestedItemCount = input.requestedItemCount ?? 10;
  const mix = input.questionMix;
  const matching = mix?.matching ?? 0;
  const essayRubric = mix?.essayRubric ?? 0;
  const worksheet = mix?.worksheet ?? 0;
  const gamified = mix?.gamified ?? 0;
  const trueFalse = mix?.trueFalse ?? 0;
  const fillBlank = mix?.fillBlank ?? 0;
  const shortAnswer = mix?.shortAnswer ?? 0;
  const heavyMixCount = matching + essayRubric + worksheet + gamified;
  const totalNonMcqMixCount = trueFalse + fillBlank + shortAnswer + heavyMixCount;

  if (isLikelyUrl(text)) {
    score += 10;
    reasons.push("url_source");
  }

  if (text.length > 900) {
    score += 3;
    reasons.push("long_prompt");
  }
  if (text.length > 1500) {
    score += 2;
    reasons.push("very_long_prompt");
  }

  if (requestedItemCount > 12) {
    score += 2;
    reasons.push("high_item_count");
  }
  if (requestedItemCount > 20) {
    score += 2;
    reasons.push("very_high_item_count");
  }

  if (heavyMixCount >= 2) {
    score += 3;
    reasons.push("heavy_question_mix");
  }
  if (heavyMixCount >= 4) {
    score += 2;
    reasons.push("very_heavy_question_mix");
  }

  if (totalNonMcqMixCount >= 5) {
    score += 2;
    reasons.push("mixed_non_mcq_load");
  }
  if (totalNonMcqMixCount >= 8) {
    score += 1;
    reasons.push("dense_non_mcq_load");
  }

  if (input.adaptiveLearning) {
    score += 3;
    reasons.push("adaptive_generation");
  }

  return {
    score,
    shouldQueue: score >= DEFAULT_QUIZ_QUEUE_THRESHOLD,
    reasons,
  };
}

export function shouldQueueQuizGeneration(
  input: QuizWorkloadRoutingInput,
  threshold = DEFAULT_QUIZ_QUEUE_THRESHOLD
) {
  const decision = scoreQuizGenerationWorkload(input);
  return {
    ...decision,
    shouldQueue: decision.score >= threshold,
  };
}
