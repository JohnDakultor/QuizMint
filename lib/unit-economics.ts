type OpenRouterUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type OpenRouterCostEstimate = OpenRouterUsage & {
  model: string;
  inputPer1M: number;
  outputPer1M: number;
  estimatedCostUsd: number;
};

function parseNumber(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function modelEnvKey(model: string) {
  return model.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

function readModelPricing(model: string) {
  const key = modelEnvKey(model);
  const inputSpecific = parseNumber(process.env[`OPENROUTER_PRICE_${key}_INPUT_PER_1M`], Number.NaN);
  const outputSpecific = parseNumber(
    process.env[`OPENROUTER_PRICE_${key}_OUTPUT_PER_1M`],
    Number.NaN
  );

  const inputDefault = parseNumber(process.env.OPENROUTER_DEFAULT_INPUT_PER_1M, 0);
  const outputDefault = parseNumber(process.env.OPENROUTER_DEFAULT_OUTPUT_PER_1M, 0);

  return {
    inputPer1M: Number.isFinite(inputSpecific) ? inputSpecific : inputDefault,
    outputPer1M: Number.isFinite(outputSpecific) ? outputSpecific : outputDefault,
  };
}

export function extractOpenRouterUsage(payload: unknown): OpenRouterUsage | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const usage =
    root.usage && typeof root.usage === "object" && !Array.isArray(root.usage)
      ? (root.usage as Record<string, unknown>)
      : null;
  if (!usage) return null;

  const promptTokensRaw = usage.prompt_tokens ?? usage.input_tokens;
  const completionTokensRaw = usage.completion_tokens ?? usage.output_tokens;
  const totalTokensRaw = usage.total_tokens;

  const promptTokens = typeof promptTokensRaw === "number" ? promptTokensRaw : 0;
  const completionTokens = typeof completionTokensRaw === "number" ? completionTokensRaw : 0;
  const totalTokens =
    typeof totalTokensRaw === "number" ? totalTokensRaw : promptTokens + completionTokens;

  if (promptTokens <= 0 && completionTokens <= 0 && totalTokens <= 0) {
    return null;
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

export function estimateOpenRouterCost(model: string, usage: OpenRouterUsage): OpenRouterCostEstimate {
  const pricing = readModelPricing(model);
  const inputCost = (usage.promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputPer1M;
  const estimatedCostUsd = Number((inputCost + outputCost).toFixed(8));

  return {
    model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    inputPer1M: pricing.inputPer1M,
    outputPer1M: pricing.outputPer1M,
    estimatedCostUsd,
  };
}

export function roundUsd(value: number) {
  return Number(value.toFixed(8));
}
