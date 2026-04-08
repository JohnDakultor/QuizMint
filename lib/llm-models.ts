type LlmPlanTier = "public" | "free" | "pro" | "premium";

type LlmFeature =
  | "quiz"
  | "lesson_plan"
  | "lesson_plan_ppt"
  | "analytics"
  | "vision_quiz"
  | "lesson_content"
  | "deck_preview"
  | "slide_preview";

const DEFAULT_PRIMARY_MODEL = "tngtech/deepseek-r1t2-chimera";
const DEFAULT_FALLBACK_MODEL = "openai/gpt-4o-mini";
const DEFAULT_VISION_MODEL = "mistralai/mistral-small-3.2-24b-instruct";
const DEFAULT_ANALYTICS_MODEL = "gpt-4o-mini";

function normalizePlanTier(plan: string | null | undefined): LlmPlanTier {
  const normalized = String(plan || "free").trim().toLowerCase();
  if (normalized === "public") return "public";
  if (normalized === "premium") return "premium";
  if (normalized === "pro") return "pro";
  return "free";
}

function envValue(keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function featureEnvBase(feature: LlmFeature) {
  switch (feature) {
    case "quiz":
      return "QUIZ";
    case "lesson_plan":
      return "LESSON_PLAN";
    case "lesson_plan_ppt":
      return "LESSON_PLAN_PPT";
    case "analytics":
      return "ANALYTICS";
    case "vision_quiz":
      return "VISION";
    case "lesson_content":
      return "LESSON_CONTENT";
    case "deck_preview":
      return "DECK_PREVIEW";
    case "slide_preview":
      return "SLIDE_PREVIEW";
    default:
      return "QUIZ";
  }
}

function legacyPrimaryAliases(feature: LlmFeature, plan: LlmPlanTier) {
  switch (feature) {
    case "vision_quiz":
      return [
        plan === "premium"
          ? "OPENROUTER_VISION_MODEL_PREMIUM"
          : plan === "pro"
            ? "OPENROUTER_VISION_MODEL_PRO"
            : plan === "public"
              ? "OPENROUTER_VISION_MODEL_PUBLIC"
              : "OPENROUTER_VISION_MODEL_FREE",
        "OPENROUTER_VISION_MODEL",
        "OPENROUTER_MODEL_VISION",
      ];
    case "analytics":
      return ["OPENROUTER_MODEL_ANALYTICS"];
    default:
      return [];
  }
}

function legacyFallbackAliases(feature: LlmFeature) {
  switch (feature) {
    case "lesson_plan":
      return ["OPENROUTER_FALLBACK_MODEL_LESSON"];
    case "lesson_plan_ppt":
      return ["OPENROUTER_FALLBACK_MODEL_PPT"];
    case "vision_quiz":
      return ["OPENROUTER_VISION_FALLBACK_MODEL"];
    default:
      return [];
  }
}

export function resolveModelForFeature(input: {
  feature: LlmFeature;
  plan?: string | null;
  defaultModel?: string;
}) {
  const plan = normalizePlanTier(input.plan);
  const featureBase = featureEnvBase(input.feature);
  return (
    envValue([
      `OPENROUTER_MODEL_${featureBase}_${plan.toUpperCase()}`,
      ...legacyPrimaryAliases(input.feature, plan),
      `OPENROUTER_MODEL_${plan.toUpperCase()}`,
      `OPENROUTER_MODEL_${featureBase}`,
      "OPENROUTER_MODEL",
    ]) ||
    input.defaultModel ||
    (input.feature === "vision_quiz"
      ? DEFAULT_VISION_MODEL
      : input.feature === "analytics"
        ? DEFAULT_ANALYTICS_MODEL
        : DEFAULT_PRIMARY_MODEL)
  );
}

export function resolveFallbackModelForFeature(input: {
  feature: LlmFeature;
  defaultModel?: string;
}) {
  const featureBase = featureEnvBase(input.feature);
  return (
    envValue([
      `OPENROUTER_FALLBACK_MODEL_${featureBase}`,
      ...legacyFallbackAliases(input.feature),
      "OPENROUTER_FALLBACK_MODEL",
    ]) ||
    input.defaultModel ||
    DEFAULT_FALLBACK_MODEL
  );
}

export function resolvePaidPlanTier(isProOrPremium: boolean) {
  return isProOrPremium ? "premium" : "free";
}

