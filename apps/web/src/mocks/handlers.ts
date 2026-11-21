import { http, HttpResponse } from "msw";
import type { ProductPage } from "@/lib/products";

/** Handlers match the gateway paths the api-client calls (absolute URLs via API_BASE_URL). */
const base = process.env.API_BASE_URL || "http://localhost:5000";

export const emptyProductPage: ProductPage = { items: [], page: 1, pageSize: 8, totalCount: 0 };

export const handlers = [
  http.get(`${base}/api/v1/products`, () => HttpResponse.json(emptyProductPage)),
];
