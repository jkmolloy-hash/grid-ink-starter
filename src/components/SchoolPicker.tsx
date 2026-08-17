/* School lookup.

   The customer types a school name; we search real places and show the
   matches with their addresses so they can confirm which one they mean.
   We do NOT fetch crests automatically — the studio sources the right
   logo by hand and shows it on the proof before anything is plotted. */
import { useEffect, useRef, useState } from "react";

export type SchoolPick = { name: string; address: string };

type Feature = {
  properties: {
    name?: string; street?: string; housenumber?: string;
    city?: string; state?: string; postcode?: string; county?: string;
  };
};

function addressOf(p: Feature["properties"]): string {
  const line1 = [p.housenumber, p.street].filter(Boolean).join(" ");
  const line2 = [p.city ?? p.county, p.state, p.postcode]
    .filter(Boolean).join(", ");
  return [line1, line2].filter(Boolean).join(", ");
}

export default function SchoolPicker(
  { value, onPick }: { value: SchoolPick | null;
                       onPick: (s: SchoolPick | null) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SchoolPick[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (value) return;                       // already chosen: stop searching
    if (q.trim().length < 3) { setHits([]); setNote(""); return; }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setBusy(true); setNote("");
      try {
        const url = "https://photon.komoot.io/api/?limit=6"
          + "&osm_tag=amenity:school&osm_tag=amenity:college"
          + "&osm_tag=amenity:university&q=" + encodeURIComponent(q.trim());
        const r = await fetch(url);
        const j = await r.json() as { features?: Feature[] };
        const list = (j.features ?? [])
          .filter(f => f.properties?.name)
          .map(f => ({ name: f.properties.name as string,
                       address: addressOf(f.properties) }))
          .filter(s => s.address.length > 0);
        setHits(list);
        if (!list.length)
          setNote("No match yet \u2014 try the full school name, or add "
            + "the town.");
      } catch {
        setNote("Search isn't responding. You can type the address in "
          + "the notes instead.");
      }
      setBusy(false);
    }, 400);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [q, value]);

  if (value) {
    return (
      <div className="mt-1 rounded border border-ink/20 bg-paper px-4 py-3">
        <div className="font-semibold">{value.name}</div>
        <div className="caption mt-1">{value.address}</div>
        <button className="caption underline mt-2"
                onClick={() => { onPick(null); setQ(""); setHits([]); }}>
          Choose a different school
        </button>
      </div>
    );
  }

  return (
    <div>
      <input className="field mt-1" value={q} maxLength={80}
             placeholder="Start typing the school name…"
             onChange={e => setQ(e.target.value)} />
      {busy && <div className="caption mt-1">Searching…</div>}
      {note && <div className="caption mt-1">{note}</div>}
      {hits.length > 0 && (
        <div className="mt-2 rounded border border-ink/15 divide-y
                        divide-ink/10 overflow-hidden">
          {hits.map((s, i) => (
            <button key={i}
                    className="block w-full text-left px-4 py-2
                               hover:bg-paper"
                    onClick={() => { onPick(s); setHits([]); }}>
              <span className="font-semibold text-sm">{s.name}</span>
              <span className="caption block">{s.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
