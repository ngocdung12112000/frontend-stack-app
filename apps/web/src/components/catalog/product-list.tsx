import { getProducts } from "@/lib/products";

export async function ProductList() {
  const result = await getProducts();

  if (!result.ok) {
    return (
      <p role="alert" className="text-muted-foreground">
        We could not load products right now. Please try again in a moment.
      </p>
    );
  }

  const items = result.data.items ?? [];
  if (items.length === 0) {
    return <p className="text-muted-foreground">No products yet. Check back soon.</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p) => (
        <li key={p.id} className="rounded-lg border p-4 text-left">
          <p className="font-medium">{p.name}</p>
          <p className="text-sm text-muted-foreground">
            {p.price} {p.currency}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ProductListSkeleton() {
  return (
    <div aria-hidden="true" className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-20 rounded-lg bg-muted" />
      ))}
    </div>
  );
}
