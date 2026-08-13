import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS } from "@/config";
import PlottedLogo from "@/components/PlottedLogo";

/* Full-bleed slides in the gallery-wall treatment: a framed piece on a
   lit wall, drifting slowly (Ken Burns), crossfading every 7 seconds.
   Slide 3 is the brand moment — the logo drawing itself. */

const money = (c: number) =>
  (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD",
                                      maximumFractionDigits: 0 });

type Slide = {
  kind: "art" | "logo";
  img?: string; alt?: string; wall?: string; zoom?: "kb-in" | "kb-out";
  tone: "light" | "dark";
  kicker: string; head: [string, string];
  cta?: { to: string; label: string };
  ghost?: { href: string; label: string };
  sub?: string;
};

const SLIDES: Slide[] = [
  { kind: "art", img: "/gallery/hero-basketball.jpg",
    alt: "Hand-plotted basketball portrait, Eagles 14, framed",
    wall: "radial-gradient(120% 90% at 30% 20%, #f3f0ea 0%, #e7e3da 55%, #d8d3c8 100%)",
    zoom: "kb-in", tone: "light",
    kicker: "Senior season, drawn",
    head: ["Every athlete.", "One of one."],
    sub: "Every line is unique to your piece — there is no duplication.",
    cta: { to: "/create?product=sports",
           label: `Start a portrait — ${money(PRODUCTS.sports.priceCents)}` },
    ghost: { href: "#how", label: "How it works" } },
  { kind: "art", img: "/gallery/hero-baseball.jpg",
    alt: "Hand-plotted baseball swing with drawn stat block and mascot, framed",
    wall: "radial-gradient(120% 90% at 65% 18%, #eef2f6 0%, #dde5ec 55%, #cbd6e0 100%)",
    zoom: "kb-out", tone: "light",
    kicker: "Stats, mascot & name — drawn in",
    head: ["Their whole season,", "in ink."],
    cta: { to: "/create?product=sports",
           label: `Start a portrait — ${money(PRODUCTS.sports.priceCents)}` },
    ghost: { href: "#how", label: "How it works" } },
  { kind: "art", img: "/gallery/hero-football.jpg",
    alt: "Hand-plotted football portrait, 14U League MVP, framed",
    wall: "radial-gradient(120% 90% at 40% 15%, #f2efe9 0%, #e6e1d7 55%, #d6d0c4 100%)",
    zoom: "kb-in", tone: "light",
    kicker: "From your photo",
    head: ["Plotted once.", "Signed by hand."],
    cta: { to: "/create?product=sports",
           label: `Start a portrait — ${money(PRODUCTS.sports.priceCents)}` },
    ghost: { href: "#how", label: "See the process" } },
  { kind: "art", img: "/gallery/map-austin.png",
    alt: "Navy plotted city map of Austin, framed",
    wall: "radial-gradient(120% 90% at 70% 15%, #eef1f5 0%, #dfe4ea 55%, #ccd3dc 100%)",
    zoom: "kb-out", tone: "light",
    kicker: "City maps",
    head: ["Put your favorite", "town on the wall."],
    cta: { to: "/create?product=city",
           label: `Map your place — ${money(PRODUCTS.city.priceCents)}` },
    ghost: { href: "#newsletter", label: "Join the town vote" } },
  { kind: "logo", tone: "dark",
    kicker: "Plotted, not printed",
    head: ["Drawn the way we", "draw everything."],
    ghost: { href: "#how", label: "See the process" } },
];

export default function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive(a => (a + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section className="relative h-[82vh] min-h-[540px] overflow-hidden bg-ink"
             onMouseEnter={() => setPaused(true)}
             onMouseLeave={() => setPaused(false)}
             aria-roledescription="carousel">
      {SLIDES.map((s, i) => (
        <div key={i}
             className={"absolute inset-0 transition-opacity duration-1000 " +
                        (active === i ? "opacity-100" : "opacity-0 pointer-events-none")}
             aria-hidden={active !== i}>
          {s.kind === "art" ? (
            <div key={`${i}-${active === i}`}
                 className={"absolute inset-0 " + (active === i ? s.zoom : "")}
                 style={{ background: s.wall }}>
              {/* plaster grain */}
              <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-multiply"
                   aria-hidden="true">
                <filter id={`grain-${i}`}>
                  <feTurbulence type="fractalNoise" baseFrequency="0.9"
                                numOctaves="2" />
                </filter>
                <rect width="100%" height="100%" filter={`url(#grain-${i})`} />
              </svg>
              {/* the framed piece */}
              <div className="absolute inset-0 flex items-center justify-center pb-10">
                <div className="relative">
                  <div className="bg-[#17191c] p-[10px] rounded-[3px]
                                  shadow-[0_30px_60px_-12px_rgba(8,43,74,0.45),0_18px_26px_-14px_rgba(0,0,0,0.35)]">
                    <div className="bg-white p-[16px]">
                      <img src={s.img} alt={s.alt}
                           className="block max-h-[56vh] w-auto" />
                    </div>
                  </div>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2
                                  h-8 w-[85%] rounded-full bg-black/25 blur-xl"
                       aria-hidden="true" />
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 bg-ink flex items-center justify-center pb-10">
              {active === i && (
                <PlottedLogo key="draw" className="h-[62vh] w-auto" />
              )}
            </div>
          )}
          {/* readability scrim so the caption never fights the art */}
          <div className={"absolute inset-x-0 bottom-0 h-[46%] pointer-events-none "
                          + (s.tone === "light"
                             ? "bg-gradient-to-t from-paper via-paper/70 to-transparent"
                             : "bg-gradient-to-t from-ink via-ink/70 to-transparent")} />
          {/* copy */}
          <div className={"absolute left-0 right-0 bottom-0 px-6 sm:px-10 pb-12 " +
                          (s.tone === "light" ? "text-ink" : "text-paper")}>
            <div className="max-w-6xl mx-auto">
              <div className={"caption " +
                              (s.tone === "dark" ? "!text-paper/60" : "")}>
                {s.kicker}
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-bold leading-[1.05] mt-2">
                {s.head[0]}<br />{s.head[1]}
              </h2>
              {s.sub && (
                <p className={"mt-3 max-w-xl text-base sm:text-lg " +
                              (s.tone === "dark"
                                ? "text-paper/80" : "text-ink/75")}>
                  {s.sub}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {s.cta && (
                  <Link to={s.cta.to} className="btn-ink shadow-sheet">
                    {s.cta.label}
                  </Link>
                )}
                {s.ghost && (
                  <a href={s.ghost.href}
                     className={"inline-flex items-center justify-center px-6 py-3 rounded-md font-semibold border transition " +
                       (s.tone === "light"
                         ? "border-ink/25 hover:border-ink"
                         : "border-paper/40 text-paper hover:bg-paper hover:text-ink")}>
                    {s.ghost.label}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      {/* dots */}
      <div className="absolute bottom-6 right-8 z-20 flex gap-2">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={"h-2.5 w-2.5 rounded-full border border-paper/70 transition " +
                             (active === i ? "bg-paper" : "bg-transparent")} />
        ))}
      </div>
    </section>
  );
}
