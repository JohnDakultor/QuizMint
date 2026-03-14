import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const APP_HOST_PROD = "app.quizmintai.com";
const WWW_HOST_PROD = "www.quizmintai.com";

function resolveAppHost(req: NextRequest) {
  const currentHost = req.nextUrl.host;
  const currentHostname = req.nextUrl.hostname;
  const currentPort = req.nextUrl.port;

  try {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    if (fromEnv) return new URL(fromEnv).host;
  } catch {
    // Ignore invalid env and fallback below
  }

  // Local dev support: localhost -> app.localhost (same port).
  if (
    currentHostname === "localhost" ||
    currentHostname === "127.0.0.1" ||
    currentHostname === "www.localhost"
  ) {
    return `app.localhost${currentPort ? `:${currentPort}` : ""}`;
  }

  if (currentHost === APP_HOST_PROD) return currentHost;
  return APP_HOST_PROD;
}

function shouldCheckRedirect(hostname: string) {
  return (
    hostname === WWW_HOST_PROD ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "www.localhost"
  );
}

export async function proxy(req: NextRequest) {
  const host = req.nextUrl.host;
  const hostname = req.nextUrl.hostname;

  if (!shouldCheckRedirect(hostname)) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token) return NextResponse.next();

  const appHost = resolveAppHost(req) || APP_HOST_PROD;
  if (host === appHost) return NextResponse.next();

  const target = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${appHost}`);
  if (appHost.endsWith(".localhost") || appHost.startsWith("localhost")) {
    target.protocol = "http:";
  }
  return NextResponse.redirect(target, 307);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

