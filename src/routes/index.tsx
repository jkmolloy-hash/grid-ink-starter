import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grid and Ink Shop" },
      { name: "description", content: "A curated print and paper goods shop." },
      { property: "og:title", content: "Grid and Ink Shop" },
      { property: "og:description", content: "A curated print and paper goods shop." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        Grid and Ink Shop
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Empty scaffold ready for your page code. Replace this component in{" "}
        <code>src/routes/index.tsx</code>.
      </p>
    </div>
  );
}
