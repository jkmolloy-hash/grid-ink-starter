/* The map picker for city pieces.
   The viewport IS the piece: whatever the customer frames inside the
   16×20-proportioned window becomes the plotted map. Dark basemap so
   the framing view already reads like the product — light streets on
   near-black ≈ white ink on navy stock. On order we emit the same
   spec shape the Grid & Ink map pipeline has always consumed. */
import { useEffect, useRef, type MutableRefObject } from "react";
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
};

export default function MapPicker({ frameRef, fly }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, {
      center: [39.5, -98.35],  // the continental US until they search
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd", maxZoom: 19 },
    ).addTo(map);
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

  useEffect(() => {
    if (fly && mapRef.current)
      mapRef.current.flyTo([fly.lat, fly.lng], fly.zoom ?? 12,
                           { duration: 1.1 });
  }, [fly]);

  return (
    <div className="relative w-full max-w-md">
      <div ref={divRef}
           className="w-full aspect-[4/5] rounded-md shadow-sheet
                      border border-ink/10 overflow-hidden bg-[#0b1622]" />
      {/* the drawn frame — what's inside this line is the piece */}
      <div className="pointer-events-none absolute inset-3 rounded-sm
                      border-2 border-paper/85 z-[500]" />
    </div>
  );
}
