/**
 * Session cookie names and attributes (docs/05-api-design.md section 4).
 *  - `at`: access token JWT, httpOnly, SameSite=Lax, Path=/
 *  - `rt`: refresh token, httpOnly, SameSite=Strict, Path=/api/auth (never sent to pages)
 * Both are kept for the refresh-token lifetime: the proxy reads the (possibly expired) `at` to
 * learn that a session exists and to decide when to refresh, since it cannot see `rt`.
 */
export const AT_COOKIE = "at";
export const RT_COOKIE = "rt";
export const RT_PATH = "/api/auth";
/**
 * Short-lived marker set by the refresh handler. It stops a refresh loop when a freshly issued
 * token is still inside the 60s window (very short TTL, or clock skew between BFF and identity):
 * the proxy lets a just-refreshed, still-valid token through instead of bouncing it again.
 */
export const REFRESHED_COOKIE = "rf";
export const REFRESHED_TTL_SECONDS = 10;
/** Refresh token TTL (BR-05). */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
/** Refresh when the access token has less than this many seconds left. */
export const REFRESH_THRESHOLD_SECONDS = 60;

export type TokenPair = { accessToken: string; refreshToken: string; expiresIn: number };

export type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "strict";
  path: string;
  maxAge: number;
};

export type CookieJar = {
  set(name: string, value: string, options: CookieOptions): unknown;
};

type HeaderReader = { get(name: string): string | null };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** `Secure` everywhere except plain-http localhost, where browsers would drop the cookie. */
export function isSecureRequest(headers: HeaderReader): boolean {
  const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "")
    .split(",")[0]!
    .trim();
  const hostname = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : (host.split(":")[0] ?? "");
  return !LOCAL_HOSTS.has(hostname.toLowerCase());
}

export function atCookieOptions(secure: boolean, maxAge = SESSION_TTL_SECONDS): CookieOptions {
  return { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge };
}

export function rtCookieOptions(secure: boolean, maxAge = SESSION_TTL_SECONDS): CookieOptions {
  return { httpOnly: true, secure, sameSite: "strict", path: RT_PATH, maxAge };
}

export function applySessionCookies(jar: CookieJar, tokens: TokenPair, secure: boolean): void {
  jar.set(AT_COOKIE, tokens.accessToken, atCookieOptions(secure));
  jar.set(RT_COOKIE, tokens.refreshToken, rtCookieOptions(secure));
}

export function markRefreshed(jar: CookieJar, secure: boolean): void {
  jar.set(REFRESHED_COOKIE, "1", { ...atCookieOptions(secure, REFRESHED_TTL_SECONDS) });
}

export function clearSessionCookies(jar: CookieJar, secure: boolean): void {
  jar.set(AT_COOKIE, "", atCookieOptions(secure, 0));
  jar.set(RT_COOKIE, "", rtCookieOptions(secure, 0));
  jar.set(REFRESHED_COOKIE, "", atCookieOptions(secure, 0));
}
