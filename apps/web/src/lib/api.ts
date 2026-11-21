import "server-only";
import { createStackShopClient } from "@ngocdung12112000/api-client";

/** Gateway URL. Server-only on purpose: never expose it as NEXT_PUBLIC_*. */
export function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || "http://localhost:5000";
}

/** Typed gateway client. Only call from Server Components, Server Actions and route handlers. */
export function createServerApi() {
  return createStackShopClient({ baseUrl: getApiBaseUrl() });
}
