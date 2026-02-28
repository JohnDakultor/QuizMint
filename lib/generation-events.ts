import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
export type GenerationEventType =
  | "quiz_generated"
  | "lesson_generated"
  | "pptx_generated"
  | "export_generated"
  | "export_failed"
  | "pause_clicked";

type TrackGenerationEventInput = {
  userId?: string | null;
  eventType: GenerationEventType;
  status: "success" | "failed" | "aborted";
  feature?: string;
  plan?: string | null;
  latencyMs?: number;
  costUsd?: number;
  metadata?: Prisma.InputJsonValue;
};

export async function trackGenerationEvent(input: TrackGenerationEventInput) {
  try {
    await prisma.generationEvent.create({
      data: {
        userId: input.userId ?? null,
        eventType: input.eventType,
        feature: input.feature ?? null,
        status: input.status,
        plan: input.plan ?? null,
        latencyMs: input.latencyMs ?? null,
        metadata:
          input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
            ? ({
                ...(input.metadata as Record<string, unknown>),
                costUsd:
                  typeof input.costUsd === "number" ? Number(input.costUsd.toFixed(8)) : undefined,
              } as Prisma.InputJsonValue)
            : input.metadata ?? undefined,
      },
    });
  } catch (err) {
    console.warn("Failed to track generation event:", err);
  }
}

type ProviderErrorDetails = {
  provider: string | null;
  code: number | null;
};

function parseJsonObjectFromString(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  const startIndex = trimmed.indexOf("{");
  if (startIndex < 0) return null;
  const candidate = trimmed.slice(startIndex);
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export function extractProviderErrorDetails(err: unknown): ProviderErrorDetails {
  const root = err && typeof err === "object" ? (err as Record<string, unknown>) : null;
  const message = String((err as any)?.message || "");

  const fromObjectProvider =
    typeof root?.provider_name === "string"
      ? root.provider_name
      : typeof root?.provider === "string"
        ? root.provider
        : null;
  const fromObjectCode = typeof root?.code === "number" ? root.code : null;

  const errorObj =
    root?.error && typeof root.error === "object" && !Array.isArray(root.error)
      ? (root.error as Record<string, unknown>)
      : null;
  const errorMeta =
    errorObj?.metadata &&
    typeof errorObj.metadata === "object" &&
    !Array.isArray(errorObj.metadata)
      ? (errorObj.metadata as Record<string, unknown>)
      : null;

  const providerFromErrorObject =
    typeof errorMeta?.provider_name === "string"
      ? errorMeta.provider_name
      : typeof errorObj?.provider === "string"
        ? errorObj.provider
        : null;
  const codeFromErrorObject =
    typeof errorObj?.code === "number"
      ? errorObj.code
      : typeof errorMeta?.code === "number"
        ? errorMeta.code
        : null;

  if (providerFromErrorObject || fromObjectProvider || codeFromErrorObject || fromObjectCode) {
    return {
      provider: providerFromErrorObject ?? fromObjectProvider ?? null,
      code: codeFromErrorObject ?? fromObjectCode ?? null,
    };
  }

  const parsed = parseJsonObjectFromString(message);
  if (!parsed) {
    const providerMatch = message.match(/"provider_name"\s*:\s*"([^"]+)"/);
    const codeMatch = message.match(/"code"\s*:\s*(\d{3})/);
    return {
      provider: providerMatch?.[1] ?? null,
      code: codeMatch ? Number(codeMatch[1]) : null,
    };
  }

  const parsedError =
    parsed.error && typeof parsed.error === "object" && !Array.isArray(parsed.error)
      ? (parsed.error as Record<string, unknown>)
      : parsed;
  const parsedMeta =
    parsedError.metadata &&
    typeof parsedError.metadata === "object" &&
    !Array.isArray(parsedError.metadata)
      ? (parsedError.metadata as Record<string, unknown>)
      : null;

  const parsedProvider =
    typeof parsedMeta?.provider_name === "string"
      ? parsedMeta.provider_name
      : typeof parsedError.provider === "string"
        ? parsedError.provider
        : null;
  const parsedCode =
    typeof parsedError.code === "number"
      ? parsedError.code
      : typeof parsedMeta?.code === "number"
        ? parsedMeta.code
        : null;

  return { provider: parsedProvider, code: parsedCode };
}
