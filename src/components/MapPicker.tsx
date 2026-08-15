/* The map picker for city pieces — BLUEPRINT edition.
   The viewport IS the piece: whatever the customer frames inside the
   16×20-proportioned window becomes the plotted map. We load the light
   basemap and invert it in CSS toward brand navy, so streets read as
   white lines on blueprint blue — the finished product's own look.
   Once a place is chosen, the frame carries the poster furniture the
   Fortis pieces always had: the title in letterspaced caps, live
   coordinates read from the frame's center, and the north arrow. */
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapFrame = {
  bbox: [number, number, number, number]; // west, south, east, north
  center: [number, number];               // lat, lng
  zoom: number;
};

type Props = {
  frameRef: MutableRefObject<(() => MapFrame) | null>;
  fly: { lat: number; lng: number; zoom?: number } | null;
  title: string;
  orientation?: "portrait" | "landscape";
};

function fmtCoords(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(4)}\u00b0 ${lat >= 0 ? "N" : "S"}` +
         ` / ${Math.abs(lng).toFixed(4)}\u00b0 ${lng >= 0 ? "E" : "W"}`;
}

export default function MapPicker({ frameRef, fly, title,
                                    orientation = "portrait" }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [coords, setCoords] = useState("");

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, {
      center: [39.5, -98.35],
      zoom: 4,
      zoomControl: true,
      attributionControl: false,   // rebuilt below without the prefix
    });
    L.control.attribution({ prefix: false, position: "bottomright" })
      .addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>')
      .addTo(map);
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 19 },
    ).addTo(map);
    const update = () => {
      const c = map.getCenter();
      setCoords(fmtCoords(c.lat, c.lng));
    };
    map.on("move", update);
    update();
    mapRef.current = map;
    frameRef.current = () => {
      const b = map.getBounds();
      const c = map.getCenter();
      return {
        bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        center: [c.lat, c.lng],
        zoom: map.getZoom(),
      };
    };
    return () => { map.remove(); mapRef.current = null; frameRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {           // container reshapes when orientation flips
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [orientation]);

  useEffect(() => {
    if (fly && mapRef.current)
      mapRef.current.flyTo([fly.lat, fly.lng], fly.zoom ?? 12,
                           { duration: 1.1 });
  }, [fly]);

  const showFurniture = title.trim().length > 1;

  return (
    <div className={"relative w-full blueprint-map "
                    + (orientation === "landscape" ? "max-w-lg" : "max-w-md")}>
      <div ref={divRef}
           className="w-full rounded-md shadow-sheet border border-ink/10 overflow-hidden bg-[#082b4a]"
           style={{ aspectRatio: orientation === "landscape" ? "5 / 4" : "4 / 5" }} />
      {/* blueprint blue: screen-blend turns black to navy, keeps white white */}
      <div className="pointer-events-none absolute inset-0 z-[400]
                      mix-blend-screen rounded-md"
           style={{ background: "#082b4a" }} />
      {/* the drawn frame — what's inside this line is the piece */}
      <div className="pointer-events-none absolute inset-3 rounded-sm
                      border-2 border-paper/85 z-[500]" />
      {showFurniture && (
        <>
          {/* north arrow — drawn the way the pen draws it: strokes only */}
          <svg viewBox="0 0 24 46" aria-hidden="true" fill="none"
               className="pointer-events-none absolute top-6 right-6 w-5
                          text-paper/90 z-[500]">
            <text x="12" y="11" textAnchor="middle" fontSize="11"
                  fontFamily="IBM Plex Mono, monospace" fontWeight="600"
                  fill="currentColor">N</text>
            <line x1="12" y1="17" x2="12" y2="40" stroke="currentColor"
                  strokeWidth="1.6" strokeLinecap="round" />
            <path d="M7 24 L12 17 L17 24" stroke="currentColor"
                  strokeWidth="1.6" strokeLinecap="round"
                  strokeLinejoin="round" />
          </svg>
          {/* the poster furniture: title + live coordinates */}
          <div className="pointer-events-none absolute inset-x-0 bottom-7
                          z-[500] text-center text-paper">
            <div className="font-display font-bold uppercase
                            tracking-[0.28em] text-lg
                            [text-shadow:0_1px_8px_rgba(4,20,36,.9)]">
              {title.trim()}
            </div>
            <div className="font-mono text-[11px] tracking-[0.22em] mt-1
                            text-paper/90
                            [text-shadow:0_1px_6px_rgba(4,20,36,.9)]">
              {coords}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
