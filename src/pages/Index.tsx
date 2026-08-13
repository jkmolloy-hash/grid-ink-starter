import { Link } from "react-router-dom";
import { PRODUCTS, TURNAROUND } from "@/config";
import HeroCarousel from "@/components/HeroCarousel";
import CategoryTiles from "@/components/CategoryTiles";
import NewsletterBand from "@/components/NewsletterBand";
import { NibMark, PenRule } from "@/components/NibMark";

export default function Index() {
  const money = (c: number) =>
    (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return (
    <div>
      <HeroCarousel />
      <CategoryTiles />

      {/* HOW IT WORKS */}
      <section id="how" className="bg-paper border-y border-ink/10 mt-14">
        <div className="max-w-6xl mx-auto px-5 py-14">
          <div className="flex items-center gap-4 mb-10">
            <NibMark className="w-9 text-ink/70" />
            <h2 className="font-display text-2xl font-bold">How it works</h2>
            <PenRule className="flex-1 h-3 text-ink/25" />
          </div>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              ["01", "Upload a photo", "A clear action shot or portrait. You'll see the plotted design instantly."],
              ["02", "Approve the preview", "Add the athlete's name. What you see is the piece we draw."],
              ["03", "We plot & ship", "A pen physically draws every line. Framed, packed, shipped."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <div className="caption">{n}</div>
                <div className="font-display font-bold text-lg mt-2">{t}</div>
                <p className="text-ink/70 mt-2">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE WORK — a real piece, on the bench */}
      <section className="bg-ink text-paper">
        <div className="max-w-6xl mx-auto px-5 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <img src="/gallery/sports-example.jpg"
               alt="Hand-plotted sports portrait in the single-line style"
               className="rounded-md w-full max-w-md mx-auto ring-1 ring-paper/20" />
          <div>
            <div className="caption !text-paper/60 mb-3">A finished piece</div>
            <h2 className="font-display text-3xl font-bold leading-tight">
              Every piece<br />is one of one.
            </h2>
            <ul className="mt-6 space-y-2 font-mono text-sm text-paper/85">
              <li>12&quot; &times; 18&quot; &middot; archival paper</li>
              <li>0.5 mm technical pen &middot; one continuous meander</li>
              <li>Name, school &amp; year in drawn lettering</li>
              <li>Plotted once &middot; signed by hand &middot; never reprinted</li>
            </ul>
            <Link to="/create?product=sports"
                  className="inline-flex mt-8 items-center justify-center gap-2 border border-paper/40 text-paper font-semibold px-6 py-3 rounded-md transition hover:bg-paper hover:text-ink">
              Create yours
            </Link>
          </div>
        </div>
      </section>

      {/* THE CATALOG — both product lines */}
      <section id="catalog" className="max-w-6xl mx-auto px-5 py-16">
        <div className="flex items-center gap-4 mb-10">
          <NibMark className="w-9 text-ink/70" />
          <h2 className="font-display text-2xl font-bold">The products</h2>
          <PenRule className="flex-1 h-3 text-ink/25" />
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {(Object.entries(PRODUCTS) as [keyof typeof PRODUCTS,
            typeof PRODUCTS[keyof typeof PRODUCTS]][]).map(([key, p]) => (
            <div key={key}
                 className="bg-paper rounded-lg shadow-sheet border border-ink/10 border-t-[3px] border-t-ink p-8 flex flex-col">
              <div className="caption">{p.framed ? "Ships framed" : "Ships in a secure tube"}</div>
              <h3 className="font-display text-2xl font-bold mt-1">{p.name}</h3>
              <p className="mt-3 text-ink/75 flex-1">{p.blurb}</p>
              <ul className="mt-4 space-y-1 caption">
                <li>&mdash; {p.size} on archival paper</li>
                <li>&mdash; {p.shipMethod}</li>
                <li>&mdash; {TURNAROUND}</li>
              </ul>
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <div className="font-mono text-2xl font-semibold">{money(p.priceCents)}</div>
                  <div className="caption">
                    {p.shippingCents === 0 ? "Shipping included" : `+ shipping from ${money(p.shippingCents)}`}
                  </div>
                </div>
                <Link to={`/create?product=${key}`} className="btn-ink">
                  {key === "sports" ? "Start your portrait" : "Map your place"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <NewsletterBand />
    </div>
  );
}
