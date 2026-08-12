import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — Grid and Ink Shop" },
      { name: "description", content: "Browse prints, stationery, and paper goods." },
      { property: "og:title", content: "Shop — Grid and Ink Shop" },
      { property: "og:description", content: "Browse prints, stationery, and paper goods." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Shop</h1>
      <p className="mt-4 text-muted-foreground">
        Page code goes here. Replace this component in <code>src/routes/shop.tsx</code>.
      </p>
    </div>
  );
}
