function parseEmailAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAllowlistEnabled(raw: string | undefined): boolean {
  const normalized = String(raw || "").trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

export function isLoginEmailAllowed(email: string | null | undefined): boolean {
  const enabled = isAllowlistEnabled(process.env.APP_LOGIN_ALLOWLIST_ENABLED);
  if (!enabled) return true;

  const allowlist = parseEmailAllowlist(
    process.env.APP_LOGIN_ALLOWLIST || process.env.OAUTH_REVIEWER_ALLOWLIST
  );
  if (allowlist.size === 0) return true;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail.length > 0 && allowlist.has(normalizedEmail);
}

