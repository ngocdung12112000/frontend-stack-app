/**
 * returnUrl validation. Only same-site relative paths are allowed, so a crafted link
 * (`?returnUrl=https://evil.example`, `//evil.example`, `/\evil.example`) can never become an
 * open redirect. Auth endpoints are rejected too, to avoid redirect loops.
 */
const FALLBACK_ORIGIN = "http://returnurl.invalid";
const BLOCKED_PREFIXES = ["/api/auth", "/login", "/register"];

export function safeReturnUrl(
  value: string | null | undefined,
  fallback = "/account",
): string {
  if (!value || value.length > 2048) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // Backslashes are treated as slashes by browsers; control chars enable header/URL tricks.
  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, FALLBACK_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== FALLBACK_ORIGIN) return fallback;
  if (BLOCKED_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) {
    return fallback;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function loginUrl(returnUrl?: string | null): string {
  const safe = safeReturnUrl(returnUrl, "");
  return safe ? `/login?returnUrl=${encodeURIComponent(safe)}` : "/login";
}

export function refreshUrl(returnUrl: string): string {
  return `/api/auth/refresh?returnUrl=${encodeURIComponent(returnUrl)}`;
}
