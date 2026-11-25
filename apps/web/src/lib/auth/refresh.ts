import "server-only";
import { createServerApi } from "@/lib/api";
import type { TokenPair } from "./cookie-options";

export type RefreshOutcome =
  | { kind: "ok"; tokens: TokenPair }
  /** 401 IDENTITY_REFRESH_REUSED / IDENTITY_REFRESH_INVALID (or any 401): session is gone. */
  | { kind: "invalid"; code?: string }
  /** Gateway down / 5xx: keep the cookies and let the user retry. */
  | { kind: "unavailable" };

/**
 * Single-flight per refresh token. Several parallel requests (RSC payloads, images, tabs) can
 * hit the proxy with the same expiring `at` and therefore call refresh with the same `rt`.
 * The first call rotates it; a second call would present an already-rotated token and trip
 * reuse detection (BR-06), revoking the whole family. So concurrent callers share one
 * upstream call, and the settled result is kept briefly for stragglers whose browser has not
 * yet applied the rotated cookie.
 *
 * Scope: per Node process. With several replicas, sticky sessions or the grace window in the
 * identity service are needed (noted in the handoff).
 */
const SETTLED_TTL_MS = 10_000;
const inflight = new Map<string, Promise<RefreshOutcome>>();

export function resetRefreshCache(): void {
  inflight.clear();
}

async function callRefresh(refreshToken: string): Promise<RefreshOutcome> {
  try {
    const { data, error, response } = await createServerApi().POST("/api/v1/auth/refresh", {
      body: { refreshToken },
    });
    if (data?.accessToken && data.refreshToken) {
      return {
        kind: "ok",
        tokens: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresIn: data.expiresIn ?? 900,
        },
      };
    }
    if (response?.status === 401) {
      const code = (error as { code?: string } | undefined)?.code;
      return { kind: "invalid", code };
    }
    return { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

export function refreshTokens(refreshToken: string): Promise<RefreshOutcome> {
  const existing = inflight.get(refreshToken);
  if (existing) return existing;

  const promise = callRefresh(refreshToken);
  inflight.set(refreshToken, promise);
  void promise.then((outcome) => {
    // Transient failures are not remembered: the next request may retry.
    if (outcome.kind === "unavailable") {
      inflight.delete(refreshToken);
      return;
    }
    const timer = setTimeout(() => inflight.delete(refreshToken), SETTLED_TTL_MS);
    timer.unref?.();
  });
  return promise;
}
