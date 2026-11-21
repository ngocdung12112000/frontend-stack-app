import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/mocks/server";
import { ProductList } from "./product-list";

const url = "http://localhost:5000/api/v1/products";

describe("ProductList", () => {
  it("shows the empty state when the API returns an empty page", async () => {
    render(await ProductList());
    expect(screen.getByText(/no products yet/i)).toBeInTheDocument();
  });

  it("renders products when the API returns items", async () => {
    server.use(
      http.get(url, () =>
        HttpResponse.json({
          items: [
            {
              id: "0190f0aa-0000-7000-8000-000000000001",
              name: "Mug",
              price: 9.5,
              currency: "USD",
            },
          ],
          page: 1,
          pageSize: 8,
          totalCount: 1,
        }),
      ),
    );
    render(await ProductList());
    expect(screen.getByText("Mug")).toBeInTheDocument();
  });

  it("shows the error state on a server error", async () => {
    server.use(http.get(url, () => HttpResponse.json({ code: "X" }, { status: 500 })));
    render(await ProductList());
    expect(screen.getByRole("alert")).toHaveTextContent(/could not load products/i);
  });

  it("shows the error state when the gateway is unreachable", async () => {
    server.use(http.get(url, () => HttpResponse.error()));
    render(await ProductList());
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
