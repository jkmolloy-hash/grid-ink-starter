/* Varsity block lettering — the plotter engine's EXACT letterforms,
   exported glyph-for-glyph. What this draws on screen is what the pen
   draws on paper: outline strokes, counters and all. */
import data from "./varsity.json";

type Glyphs = {
  upm: number;
  cap: number;
  adv: Record<string, number>;
  glyphs: Record<string, number[][][]>;
};
const F = data as Glyphs;

const TRACK = 0.08; // letterspacing as a fraction of size — matches the pieces

function codeFor(ch: string): string {
  const c = ch.codePointAt(0) ?? 63;
  return F.glyphs[String(c)] ? String(c) : "63"; // '?' for anything exotic
}

/** Width of a line at a given cap-height size (px or mm — same units out). */
export function varsityWidth(text: string, size: number): number {
  const scale = size / F.cap;
  let w = 0;
  for (const ch of text.toUpperCase()) w += (F.adv[codeFor(ch)] ?? 650) * scale;
  if (text.length > 1) w += (text.length - 1) * TRACK * size;
  return w;
}

/** Draw one line, center-anchored at (cx, baselineY). Size = cap height. */
export function drawVarsity(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  baselineY: number,
  size: number,
  color: string,
): { x: number; y: number; w: number; h: number } {
  const scale = size / F.cap;
  const total = varsityWidth(text, size);
  let penX = cx - total / 2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.045); // ~0.5 mm nib feel
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const ch of text.toUpperCase()) {
    const g = codeFor(ch);
    for (const contour of F.glyphs[g]) {
      ctx.beginPath();
      contour.forEach(([gx, gy], i) => {
        const px = penX + gx * scale;
        const py = baselineY - gy * scale; // font is y-up
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    }
    penX += (F.adv[g] ?? 650) * scale + TRACK * size;
  }
  ctx.restore();
  return { x: cx - total / 2, y: baselineY - size, w: total, h: size * 1.25 };
}

/** Largest size (≤ max) at which the line fits the given width. */
export function fitSize(text: string, maxWidth: number, max: number): number {
  if (!text) return max;
  const w = varsityWidth(text, max);
  return w <= maxWidth ? max : (max * maxWidth) / w;
}
