import { createHmac, timingSafeEqual } from "crypto";

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

function selectPayMongoSecretKey() {
  const vercelEnv = process.env.VERCEL_ENV;
  const appEnv = process.env.APP_ENV;
  const isProd =
    appEnv === "production" ||
    vercelEnv === "production" ||
    (!vercelEnv && process.env.NODE_ENV === "production");

  if (isProd) {
    return (
      process.env.PAYMONGO_LIVE_SECRET_KEY ||
      process.env.PAYMONGO_SECRET_KEY ||
      ""
    );
  }

  return (
    process.env.PAYMONGO_TEST_SECRET_KEY ||
    process.env.PAYMONGO_SECRET_KEY ||
    ""
  );
}

export function getPayMongoAuthHeader() {
  const secret = selectPayMongoSecretKey();
  if (!secret) {
    throw new Error(
      "Missing PayMongo secret key. Set PAYMONGO_TEST_SECRET_KEY (dev) or PAYMONGO_LIVE_SECRET_KEY (prod)."
    );
  }
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

export function getPayMongoBase() {
  return PAYMONGO_BASE;
}

function safeCompareHex(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function extractSignatureCandidates(signatureHeader: string) {
  // Supports values like:
  //  - "sha256=<hex>"
  //  - "t=...,v1=<hex>"
  //  - "<hex>"
  return signatureHeader
    .split(",")
    .map((s) => s.trim())
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq === -1) return part;
      return part.slice(eq + 1);
    })
    .map((v) => v.replace(/^sha256=/, "").trim())
    .filter(Boolean);
}

export function verifyPayMongoWebhookSignature(rawBody: string, signatureHeader: string) {
  const signingSecret =
    process.env.PAYMONGO_WEBHOOK_SIGNING_SECRET ||
    process.env.PAYMONGO_WEBHOOK_SECRET ||
    "";

  if (!signingSecret) {
    return false;
  }

  const computed = createHmac("sha256", signingSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const candidates = extractSignatureCandidates(signatureHeader);
  return candidates.some((candidate) => safeCompareHex(candidate, computed));
}
