import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function parseAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminLoginPath() {
  const slug = (process.env.ADMIN_LOGIN_SLUG || "").trim();
  return slug ? `/admin-login/${slug}` : "/admin-login";
}

function getAdminSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.NEXTAUTH_SECRET || "";
}

function signAdminPayload(payload: string) {
  const secret = getAdminSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createAdminSessionToken(email: string) {
  const admins = parseAdminEmails();
  const normalized = email.toLowerCase().trim();
  if (!admins.includes(normalized)) return "";

  const now = Date.now();
  const exp = now + ADMIN_SESSION_TTL_MS;
  const payload = `${normalized}.${exp}`;
  const sig = signAdminPayload(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

function parseAndVerifyAdminSessionToken(token: string) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return false;
    const secondLastDot = decoded.lastIndexOf(".", lastDot - 1);
    if (secondLastDot === -1) return false;

    const email = decoded.slice(0, secondLastDot);
    const expRaw = decoded.slice(secondLastDot + 1, lastDot);
    const sig = decoded.slice(lastDot + 1);

    if (!email || !expRaw || !sig) return false;
    const admins = parseAdminEmails();
    if (!admins.includes(email)) return false;
    const exp = Number(expRaw);
    if (!Number.isFinite(exp) || exp < Date.now()) return false;
    const expectedSig = signAdminPayload(`${email}.${exp}`);
    if (!expectedSig) return false;
    const isValid = timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
    return isValid ? email : false;
  } catch {
    return false;
  }
}

export function getAdminCookieConfig() {
  return {
    name: ADMIN_SESSION_COOKIE,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: ADMIN_SESSION_TTL_MS / 1000,
    },
  };
}

export async function assertAdminIdentity() {
  const admins = parseAdminEmails();

  if (!admins.length) {
    return { ok: false as const, reason: "misconfigured" as const };
  }

  return { ok: true as const };
}

export function validateAdminLogin(email: string, passcode: string) {
  const admins = parseAdminEmails();
  const normalizedEmail = email.toLowerCase().trim();
  const expectedPasscode = process.env.ADMIN_PASSCODE || "";

  if (!admins.length) return { ok: false as const, reason: "misconfigured" as const };
  if (!expectedPasscode) {
    return { ok: false as const, reason: "admin_passcode_not_configured" as const };
  }
  if (!admins.includes(normalizedEmail)) {
    return { ok: false as const, reason: "invalid_admin_email" as const };
  }
  if (passcode !== expectedPasscode) {
    return { ok: false as const, reason: "invalid_passcode" as const };
  }

  return { ok: true as const, email: normalizedEmail };
}

export async function assertAdminSession() {
  const identity = await assertAdminIdentity();
  if (!identity.ok) return identity;

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  const email = parseAndVerifyAdminSessionToken(token);
  if (!email) {
    return { ok: false as const, reason: "challenge" as const };
  }

  return { ok: true as const, email };
}
