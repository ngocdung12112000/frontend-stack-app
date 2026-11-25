/** Unsigned test JWTs shaped like the identity service's access tokens. Tests/MSW only. */
function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

export type TestClaims = {
  sub?: string;
  email?: string;
  name?: string;
  email_verified?: boolean | string;
  role?: string | string[];
  perm?: string | string[];
  /** Seconds from now (negative = already expired). Ignored when `exp` is set. */
  expiresInSeconds?: number;
  exp?: number;
};

export function makeJwt(claims: TestClaims = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const { expiresInSeconds = 900, ...rest } = claims;
  const payload = {
    sub: "0197a2b0-0000-7000-8000-000000000001",
    jti: "jti-test",
    email: "ada@example.com",
    email_verified: true,
    name: "Ada Lovelace",
    role: "Customer",
    iss: "stackshop-identity",
    aud: "stackshop-api",
    iat: now,
    exp: now + expiresInSeconds,
    ...rest,
  };
  return `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify(payload))}.sig`;
}
