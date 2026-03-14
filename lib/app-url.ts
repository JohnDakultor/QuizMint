const DEFAULT_PROD_APP_BASE = "https://app.quizmintai.com";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getClientAppBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return trimTrailingSlash(fromEnv);

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost")
    ) {
      return window.location.origin;
    }
  }

  return DEFAULT_PROD_APP_BASE;
}

export function resolveClientCallbackUrl(pathOrUrl: string) {
  const appBase = getClientAppBaseUrl();
  if (!pathOrUrl) return `${appBase}/home`;

  if (pathOrUrl.startsWith("/")) {
    return `${appBase}${normalizePath(pathOrUrl)}`;
  }

  try {
    const parsed = new URL(pathOrUrl);
    const appHost = new URL(appBase).host;
    if (parsed.host === appHost) return parsed.toString();
    return `${appBase}${normalizePath(parsed.pathname)}${parsed.search}${parsed.hash}`;
  } catch {
    return `${appBase}/home`;
  }
}

