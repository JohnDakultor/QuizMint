import { createHmac, timingSafeEqual } from "crypto";

type QuizSharePayload = {
  q: number;
  iat: number;
  exp: number;
  s?: 1;
  a?: string;
  d?: number;
};

type TimedAssessmentSessionPayload = {
  q: number;
  t: string;
  iat: number;
  exp: number;
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  return (
    process.env.QUIZ_SHARE_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev_quiz_share_secret"
  );
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

function sign(input: string) {
  return base64UrlEncode(createHmac("sha256", getSecret()).update(input).digest());
}

export function createQuizShareToken(
  quizId: number,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  opts?: {
    shuffleQuestions?: boolean;
    assignmentId?: string | null;
    assessmentDurationMinutes?: number | null;
  }
) {
  const now = Math.floor(Date.now() / 1000);
  const normalizedAssessmentDurationMinutes = Number.isFinite(
    Number(opts?.assessmentDurationMinutes)
  )
    ? Math.max(1, Math.floor(Number(opts?.assessmentDurationMinutes)))
    : null;
  const payload: QuizSharePayload = {
    q: quizId,
    iat: now,
    exp: now + ttlSeconds,
    ...(opts?.shuffleQuestions ? { s: 1 } : {}),
    ...(opts?.assignmentId ? { a: opts.assignmentId } : {}),
    ...(normalizedAssessmentDurationMinutes
      ? { d: normalizedAssessmentDurationMinutes }
      : {}),
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyQuizShareToken(
  token: string
):
  | {
      ok: true;
      quizId: number;
      shuffleQuestions: boolean;
      assignmentId: string | null;
      assessmentDurationMinutes: number | null;
    }
  | { ok: false; reason: string } {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return { ok: false, reason: "invalid_token" };

  const expected = sign(payloadB64);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, reason: "invalid_signature" };
  }

  let payload: QuizSharePayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf-8"));
  } catch {
    return { ok: false, reason: "invalid_payload" };
  }

  if (!payload || typeof payload.q !== "number" || typeof payload.exp !== "number") {
    return { ok: false, reason: "invalid_payload" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return { ok: false, reason: "expired" };

  return {
    ok: true,
    quizId: payload.q,
    shuffleQuestions: payload.s === 1,
    assignmentId: typeof payload.a === "string" && payload.a.trim() ? payload.a : null,
    assessmentDurationMinutes:
      typeof payload.d === "number" && Number.isFinite(payload.d) && payload.d > 0
        ? Math.floor(payload.d)
        : null,
  };
}

export function createTimedAssessmentSessionToken(
  quizId: number,
  takeSessionId: string,
  durationSeconds: number
) {
  const now = Math.floor(Date.now() / 1000);
  const normalizedDurationSeconds = Math.max(1, Math.floor(durationSeconds));
  const payload: TimedAssessmentSessionPayload = {
    q: quizId,
    t: takeSessionId,
    iat: now,
    exp: now + normalizedDurationSeconds,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyTimedAssessmentSessionToken(
  token: string
):
  | {
      ok: true;
      quizId: number;
      takeSessionId: string;
      startedAt: number;
      expiresAt: number;
    }
  | { ok: false; reason: string } {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return { ok: false, reason: "invalid_token" };

  const expected = sign(payloadB64);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, reason: "invalid_signature" };
  }

  let payload: TimedAssessmentSessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf-8"));
  } catch {
    return { ok: false, reason: "invalid_payload" };
  }

  if (
    !payload ||
    typeof payload.q !== "number" ||
    typeof payload.t !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return { ok: false, reason: "invalid_payload" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return { ok: false, reason: "expired" };

  return {
    ok: true,
    quizId: payload.q,
    takeSessionId: payload.t,
    startedAt: payload.iat * 1000,
    expiresAt: payload.exp * 1000,
  };
}
