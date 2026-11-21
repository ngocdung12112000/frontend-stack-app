export const siteConfig = {
  name: "StackShop",
  description:
    "StackShop is a learning e-commerce platform: browse products, build a cart and check out.",
} as const;

export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/search" },
  { label: "Brands", href: "/brands" },
] as const;
