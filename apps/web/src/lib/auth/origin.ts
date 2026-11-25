/**
 * Origin check for mutating route handlers (CSRF defence in depth on top of SameSite cookies).
 * Requires an Origin header whose host matches the host the request was addressed to.
 */
export function isSameOrigin(headers: { get(name: string): string | null }): boolean {
  const origin = headers.get("origin");
  if (!origin) return false;
  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").split(",")[0]!.trim();
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
