import type { IdentityComponents } from "@ngocdung12112000/api-client";
import { http, HttpResponse } from "msw";
import type { ProductPage } from "@/lib/products";
import { makeJwt } from "./jwt";

/** Handlers match the gateway paths the api-client calls (absolute URLs via API_BASE_URL). */
const base = process.env.API_BASE_URL || "http://localhost:5000";

type Schemas = IdentityComponents["schemas"];

export const emptyProductPage: ProductPage = { items: [], page: 1, pageSize: 8, totalCount: 0 };

export const mockUser: Schemas["UserSummary"] = {
  id: "0197a2b0-0000-7000-8000-000000000001",
  email: "ada@example.com",
  fullName: "Ada Lovelace",
  roles: ["Customer"],
};

export const mockProfile: Schemas["UserProfile"] = {
  ...mockUser,
  phone: null,
  emailConfirmed: true,
  status: "Active",
  permissions: ["orders:create"],
  createdAt: "2026-11-01T10:00:00Z",
};

export const mockSessions: Schemas["SessionDto"][] = [
  {
    familyId: "0197a2b0-0000-7000-8000-0000000000a1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/126",
    ip: "203.0.113.5",
    startedAt: "2026-11-24T08:00:00Z",
    lastUsedAt: "2026-11-24T09:00:00Z",
    expiresAt: "2026-12-01T08:00:00Z",
  },
];

/** Dev knob for API_MOCKING=enabled: MOCK_ACCESS_TTL_SECONDS=20 makes every token expire fast. */
const accessTtl = Number(process.env.MOCK_ACCESS_TTL_SECONDS) || 900;

export function mockTokenPair(overrides: Partial<Schemas["TokenPairResponse"]> = {}) {
  return {
    accessToken: makeJwt({ expiresInSeconds: accessTtl }),
    refreshToken: "refresh-token-1",
    expiresIn: accessTtl,
    ...overrides,
  } satisfies Schemas["TokenPairResponse"];
}

export function problem(status: number, code: string, extra: Record<string, unknown> = {}) {
  return HttpResponse.json(
    { type: "about:blank", title: code, status, code, ...extra },
    { status, headers: { "content-type": "application/problem+json" } },
  );
}

export const identityHandlers = [
  http.post(`${base}/api/v1/auth/register`, () =>
    HttpResponse.json({ userId: mockUser.id } satisfies Schemas["RegisterResponse"], {
      status: 201,
    }),
  ),
  http.post(`${base}/api/v1/auth/login`, () =>
    HttpResponse.json({ ...mockTokenPair(), user: mockUser } satisfies Schemas["LoginResponse"]),
  ),
  http.post(`${base}/api/v1/auth/refresh`, () =>
    HttpResponse.json(mockTokenPair({ refreshToken: "refresh-token-2" })),
  ),
  http.post(`${base}/api/v1/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${base}/api/v1/auth/confirm-email`, () => new HttpResponse(null, { status: 204 })),
  http.post(
    `${base}/api/v1/auth/resend-confirmation`,
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.post(`${base}/api/v1/auth/forgot-password`, () => new HttpResponse(null, { status: 202 })),
  http.post(`${base}/api/v1/auth/reset-password`, () => new HttpResponse(null, { status: 204 })),
  http.post(`${base}/api/v1/auth/change-password`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${base}/api/v1/users/me`, () => HttpResponse.json(mockProfile)),
  http.get(`${base}/api/v1/users/me/sessions`, () => HttpResponse.json(mockSessions)),
  http.delete(
    `${base}/api/v1/users/me/sessions/:familyId`,
    () => new HttpResponse(null, { status: 204 }),
  ),
];

export const handlers = [
  http.get(`${base}/api/v1/products`, () => HttpResponse.json(emptyProductPage)),
  ...identityHandlers,
];
