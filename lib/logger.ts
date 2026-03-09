const isProd = process.env.NODE_ENV === "production";

type Meta = Record<string, unknown> | undefined;

function formatMeta(meta?: Meta) {
  if (!meta) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return "";
  }
}

export function logDebug(message: string, meta?: Meta) {
  if (isProd) return;
  console.debug(`[debug] ${message}${formatMeta(meta)}`);
}

export function logInfo(message: string, meta?: Meta) {
  console.info(`[info] ${message}${formatMeta(meta)}`);
}

export function logWarn(message: string, meta?: Meta) {
  console.warn(`[warn] ${message}${formatMeta(meta)}`);
}

export function logError(message: string, meta?: Meta) {
  console.error(`[error] ${message}${formatMeta(meta)}`);
}
