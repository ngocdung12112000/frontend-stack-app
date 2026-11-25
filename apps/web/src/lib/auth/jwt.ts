/**
 * JWT payload decoding for the BFF. No signature verification on purpose: the gateway verifies
 * every token, and the BFF only needs the claims to render UI and decide when to refresh.
 * Never trust these values for authorization decisions on the server side of the API.
 */

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
  /** Expiry as epoch seconds. */
  exp: number;
};

type RawClaims = Record<string, unknown>;

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Returns the payload claims, or null for anything that is not a well-formed JWT. */
export function decodeJwtPayload(token: string | undefined | null): RawClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload: unknown = JSON.parse(base64UrlDecode(parts[1] ?? ""));
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as RawClaims)
      : null;
  } catch {
    return null;
  }
}

/** Expiry in epoch seconds, or null when the token is malformed or has no `exp`. */
export function getTokenExpiry(token: string | undefined | null): number | null {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp : null;
}

/** ASP.NET serialises a single role/permission as a string and several as an array. */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return typeof value === "string" ? [value] : [];
}

function toBoolean(value: unknown): boolean {
  return value === true || (typeof value === "string" && value.toLowerCase() === "true");
}

/** Maps access-token claims to a SessionUser. Null when the token has no subject or expiry. */
export function userFromToken(token: string | undefined | null): SessionUser | null {
  const claims = decodeJwtPayload(token);
  if (!claims) return null;
  const { sub, exp } = claims;
  if (typeof sub !== "string" || typeof exp !== "number") return null;
  return {
    id: sub,
    email: typeof claims.email === "string" ? claims.email : "",
    fullName: typeof claims.name === "string" ? claims.name : "",
    emailVerified: toBoolean(claims.email_verified),
    roles: toStringArray(claims.role),
    permissions: toStringArray(claims.perm),
    exp,
  };
}
