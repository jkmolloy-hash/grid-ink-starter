/* Composition mockup for the sports piece.
   HONESTY CONTRACT: the photo stays a photo — no fake line-art. What IS
   real: the sheet proportions, the drawn border, and the varsity
   lettering (the engine's exact letterforms), all in the chosen inks.
   Name, school line and logo are draggable; positions ride the order. */
import { useEffect, useRef, useState } from "react";
import { drawVarsity, fitSize } from "@/lib/varsity";

export type Pos = { x: number; y: number };
export type Layout = { name: Pos; line2: Pos; logo: Pos };

export const DEFAULT_LAYOUT: Layout = {
  name: { x: 0.5, y: 0.09 },
  line2: { x: 0.5, y: 0.93 },
  logo: { x: 0.15, y: 0.87 },
};

type Props = {
  photoUrl: string;
  name: string;
  line2: string;
  logoUrl: string;
  inkArt: string;   // border (stands in for the artwork's ink)
  inkText: string;  // lettering + logo
  layout: Layout;
  onLayout: (l: Layout) => void;
};

const W = 800, H = 1200;                    // 2:3 backing — a 12×18 sheet

export default function Mockup(p: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [logoAlpha, setLogoAlpha] = useState(false);
  const hits = useRef<Record<string, { x: number; y: number; w: number; h: number }>>({});
  const drag = useRef<null | { key: keyof Layout; sx: number; sy: number; ox: number; oy: number }>(null);

  useEffect(() => {
    if (!p.photoUrl) { setPhoto(null); return; }
    const im = new Image();
    im.onload = () => setPhoto(im);
    im.src = p.photoUrl;
  }, [p.photoUrl]);

  useEffect(() => {
    if (!p.logoUrl) { setLogo(null); return; }
    const im = new Image();
    im.onload = () => {
      setLogo(im);
      // tint only logos that have transparency; a JPG crest stays as-is
      const c = document.createElement("canvas");
      c.width = c.height = 24;
      const x = c.getContext("2d")!;
      x.drawImage(im, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data;
      let alpha = false;
      for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { alpha = true; break; }
      setLogoAlpha(alpha);
    };
    im.src = p.logoUrl;
  }, [p.logoUrl]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    // the sheet
    ctx.fillStyle = "#fdfdfb";
    ctx.fillRect(0, 0, W, H);
    // the drawn border — the artwork ink
    ctx.strokeStyle = p.inkArt;
    ctx.lineWidth = 3;
    ctx.strokeRect(W * 0.055, H * 0.045, W * 0.89, H * 0.91);
    // the photo, honest and whole, in the middle zone
    if (photo) {
      const bx = W * 0.1, by = H * 0.155, bw = W * 0.8, bh = H * 0.645;
      const s = Math.min(bw / photo.width, bh / photo.height);
      const dw = photo.width * s, dh = photo.height * s;
      ctx.drawImage(photo, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
    }
    hits.current = {};
    // the lettering — engine letterforms, chosen ink, auto-fit
    if (p.name.trim()) {
      const size = fitSize(p.name.trim(), W * 0.84, W * 0.088);
      hits.current.name = drawVarsity(ctx, p.name.trim(),
        W * p.layout.name.x, H * p.layout.name.y + size / 2, size, p.inkText);
    }
    if (p.line2.trim()) {
      const size = fitSize(p.line2.trim(), W * 0.84, W * 0.058);
      hits.current.line2 = drawVarsity(ctx, p.line2.trim(),
        W * p.layout.line2.x, H * p.layout.line2.y + size / 2, size, p.inkText);
    }
    // the logo, tinted to the lettering ink when it can be
    if (logo) {
      const lw = W * 0.17, lh = (logo.height / logo.width) * lw;
      const lx = W * p.layout.logo.x - lw / 2, ly = H * p.layout.logo.y - lh / 2;
      if (logoAlpha) {
        const t = document.createElement("canvas");
        t.width = Math.max(1, lw); t.height = Math.max(1, lh);
        const tc = t.getContext("2d")!;
        tc.drawImage(logo, 0, 0, lw, lh);
        tc.globalCompositeOperation = "source-in";
        tc.fillStyle = p.inkText;
        tc.fillRect(0, 0, lw, lh);
        ctx.drawImage(t, lx, ly);
      } else {
        ctx.drawImage(logo, lx, ly, lw, lh);
      }
      hits.current.logo = { x: lx, y: ly, w: lw, h: lh };
    }
  }, [photo, logo, logoAlpha, p.name, p.line2, p.inkArt, p.inkText, p.layout]);

  function toCanvas(e: React.PointerEvent): { x: number; y: number } {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W,
             y: ((e.clientY - r.top) / r.height) * H };
  }

  function down(e: React.PointerEvent) {
    const c = toCanvas(e);
    const pad = 14;
    for (const key of ["logo", "line2", "name"] as (keyof Layout)[]) {
      const h = hits.current[key];
      if (h && c.x >= h.x - pad && c.x <= h.x + h.w + pad &&
          c.y >= h.y - pad && c.y <= h.y + h.h + pad) {
        drag.current = { key, sx: c.x, sy: c.y,
                         ox: p.layout[key].x, oy: p.layout[key].y };
        ref.current!.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
    }
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return;
    const c = toCanvas(e);
    const d = drag.current;
    // delta drag — grab it anywhere, it moves as your hand moves
    const nx = Math.min(0.95, Math.max(0.05, d.ox + (c.x - d.sx) / W));
    const ny = Math.min(0.96, Math.max(0.04, d.oy + (c.y - d.sy) / H));
    p.onLayout({ ...p.layout, [d.key]: { x: nx, y: ny } });
  }
  function up() { drag.current = null; }

  return (
    <canvas ref={ref} width={W} height={H}
            className="w-full max-w-md rounded-md shadow-sheet border
                       border-ink/10 touch-none cursor-grab"
            onPointerDown={down} onPointerMove={move}
            onPointerUp={up} onPointerCancel={up} />
  );
}
