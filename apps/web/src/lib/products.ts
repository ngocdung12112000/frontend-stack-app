import "server-only";
import type { CatalogComponents } from "@ngocdung12112000/api-client";
import { createServerApi } from "@/lib/api";

export type ProductPage = CatalogComponents["schemas"]["ProductDtoPagedResult"];

export type ProductsResult = { ok: true; data: ProductPage } | { ok: false };

/** Never throws: the gateway may be down (local dev, build). Callers render the error state. */
export async function getProducts(page = 1, pageSize = 8): Promise<ProductsResult> {
  try {
    const { data, error } = await createServerApi().GET("/api/v1/products", {
      params: { query: { page, pageSize } },
    });
    if (error || !data) return { ok: false };
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}
