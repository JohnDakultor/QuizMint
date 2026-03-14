type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "info" : "debug";
const CONFIGURED_LEVEL = (process.env.LOG_LEVEL || DEFAULT_LEVEL).toLowerCase() as LogLevel;
const MIN_LEVEL = LEVEL_WEIGHT[CONFIGURED_LEVEL] ? CONFIGURED_LEVEL : DEFAULT_LEVEL;
const DEFAULT_SAMPLE_RATE = process.env.NODE_ENV === "production" ? 0.25 : 1;
const SAMPLE_RATE = clampSampleRate(process.env.LOG_SAMPLE_RATE, DEFAULT_SAMPLE_RATE);
const INCLUDE_STACK =
  process.env.LOG_INCLUDE_STACK === "1" || process.env.NODE_ENV !== "production";

const REDACT_KEYS = new Set(
  (process.env.LOG_REDACT_KEYS ||
    "password,pass,token,apikey,apiKey,authorization,cookie,set-cookie,email,text,prompt,raw,response")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
);

function clampSampleRate(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function shouldLog(level: LogLevel): boolean {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[MIN_LEVEL]) return false;
  if (level === "error") return true;
  if (SAMPLE_RATE >= 1) return true;
  return Math.random() < SAMPLE_RATE;
}

function redactString(input: string): string {
  if (input.length <= 256) return input;
  return `${input.slice(0, 256)}...<truncated>`;
}

function sanitize(value: unknown, keyHint = ""): unknown {
  if (value === null || value === undefined) return value;

  const key = keyHint.toLowerCase();
  if (REDACT_KEYS.has(key)) return "[redacted]";

  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(INCLUDE_STACK ? { stack: value.stack } : {}),
    };
  }

  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item));

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitize(v, k);
    }
    return out;
  }

  return String(value);
}

function write(level: LogLevel, event: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(meta ? { meta: sanitize(meta) } : {}),
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const log = {
  debug: (event: string, meta?: Record<string, unknown>) =>
    write("debug", event, meta),
  info: (event: string, meta?: Record<string, unknown>) =>
    write("info", event, meta),
  warn: (event: string, meta?: Record<string, unknown>) =>
    write("warn", event, meta),
  error: (event: string, meta?: Record<string, unknown>) =>
    write("error", event, meta),
};

// Backward-compatible named helpers used in older modules.
export const logDebug = (event: string, meta?: Record<string, unknown>) =>
  log.debug(event, meta);
export const logInfo = (event: string, meta?: Record<string, unknown>) =>
  log.info(event, meta);
export const logWarn = (event: string, meta?: Record<string, unknown>) =>
  log.warn(event, meta);
export const logError = (event: string, meta?: Record<string, unknown>) =>
  log.error(event, meta);
