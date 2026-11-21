import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@stackshop/ui";
import { ProductList, ProductListSkeleton } from "@/components/catalog/product-list";

export default function HomePage() {
  return (
    <>
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Welcome to StackShop</h1>
        <p className="text-lg text-muted-foreground">
          The storefront is under construction. Featured categories and trending products will
          appear here.
        </p>
        <Button asChild size="lg">
          <Link href="/search">Browse products</Link>
        </Button>
      </section>
      <section aria-labelledby="products-heading" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <h2 id="products-heading" className="mb-4 text-2xl font-semibold">
          Products
        </h2>
        {/* Uncached request-time fetch: must sit in Suspense under cacheComponents.
            F03 will move this to `use cache` + cacheTag("product:{id}"). */}
        <Suspense fallback={<ProductListSkeleton />}>
          <ProductList />
        </Suspense>
      </section>
    </>
  );
}
