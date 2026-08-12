import { Link } from "react-router-dom";

/* Two confident lines. Coming-soon tiles can join this array the day a
   new product line is real. */
const TILES = [
  { to: "/create?product=sports", img: "/gallery/sports-hero.jpg",
    label: "Sports Line Art", note: "The main event" },
  { to: "/create?product=city", img: "/gallery/map-austin.png",
    label: "City Maps", note: "Any place on earth" },
];

export default function CategoryTiles() {
  return (
    <section className="max-w-4xl mx-auto px-5 -mt-10 relative z-10">
      <div className="grid grid-cols-2 gap-5">
        {TILES.map(t => (
          <Link key={t.label} to={t.to}
                className="group relative overflow-hidden rounded-lg shadow-sheet
                           border border-ink/10 aspect-[4/3] bg-ink">
            <img src={t.img} alt=""
                 className="absolute inset-0 h-full w-full object-cover object-top
                            opacity-90 transition duration-500 group-hover:scale-[1.04]" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-5 text-paper">
              <div className="caption !text-paper/70">{t.note}</div>
              <div className="font-display font-bold text-xl">{t.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
