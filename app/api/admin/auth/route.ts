import { NextResponse } from "next/server";
import {
  createAdminSessionToken,
  getAdminCookieConfig,
  validateAdminLogin,
} from "@/lib/admin-auth";

function unauthorized(error: string, status = 401) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "");
  const passcode = String(body?.passcode || "");

  const login = validateAdminLogin(email, passcode);
  if (!login.ok) {
    const status = login.reason === "misconfigured" || login.reason === "admin_passcode_not_configured" ? 500 : 403;
    return unauthorized(login.reason, status);
  }

  const token = createAdminSessionToken(login.email);
  if (!token) {
    return unauthorized("admin_session_secret_not_configured", 500);
  }

  const cookie = getAdminCookieConfig();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, token, cookie.options);
  return res;
}

export async function DELETE() {
  const cookie = getAdminCookieConfig();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, "", {
    ...cookie.options,
    maxAge: 0,
  });
  return res;
}
