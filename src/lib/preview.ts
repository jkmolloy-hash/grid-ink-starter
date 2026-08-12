/* ------------------------------------------------------------------
   The in-browser preview engine.

   This is a faithful port of the production plotter's default
   recipe — the same tone math the real machine uses:
     - autocontrast with a 1% clip
     - ink density = (1 - luminance) ^ gamma, gamma 2.0
     - paper stays empty above the white cutoff (0.85)
     - ~16,000 stipple dots, denser where the photo is darker
   The website preview approximates the hand-plotted look; the
   production console remains the source of truth for what plots.
------------------------------------------------------------------- */

export interface PreviewOptions {
  gamma: number;
  whiteCutoff: number;
  dots: number;
  seed: number;
}

export const DEFAULT_RECIPE: PreviewOptions = {
  gamma: 2.0,
  whiteCutoff: 0.85,
  dots: 16000,
  seed: 7,
};

/* Small deterministic RNG so the same photo previews the same way */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Luminance -> plotting density, exactly the engine's curve. */
export function buildDensity(
  gray: Float32Array, opts: PreviewOptions
): Float32Array {
  const n = gray.length;
  const sorted = Float32Array.from(gray).sort();
  const lo = sorted[Math.floor(n * 0.01)];
  const hi = sorted[Math.min(n - 1, Math.floor(n * 0.99))];
  const span = Math.max(1e-6, hi - lo);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const lum = Math.min(1, Math.max(0, (gray[i] - lo) / span));
    out[i] = lum > opts.whiteCutoff ? 0 : Math.pow(1 - lum, opts.gamma);
  }
  return out;
}

/* Weighted sampling of dot positions from the density map. */
export function samplePoints(
  density: Float32Array, w: number, h: number, opts: PreviewOptions
): Float32Array {
  const cdf = new Float64Array(density.length);
  let acc = 0;
  for (let i = 0; i < density.length; i++) { acc += density[i]; cdf[i] = acc; }
  const pts = new Float32Array(opts.dots * 3);   // x, y, tone triplets
  if (acc <= 0) return pts.slice(0, 0);
  const rnd = mulberry32(opts.seed);
  let k = 0;
  for (let d = 0; d < opts.dots; d++) {
    const target = rnd() * acc;
    let lo2 = 0, hi2 = cdf.length - 1;
    while (lo2 < hi2) {                          // binary search the CDF
      const mid = (lo2 + hi2) >> 1;
      if (cdf[mid] < target) lo2 = mid + 1; else hi2 = mid;
    }
    const y = Math.floor(lo2 / w), x = lo2 % w;
    pts[k++] = x + rnd();                        // jitter inside the cell
    pts[k++] = y + rnd();
    pts[k++] = density[lo2];
  }
  return pts.slice(0, k);
}

/* Draw the full sheet: paper, margins, stipple, caption strip. */
export function drawPreview(
  canvas: HTMLCanvasElement, img: HTMLImageElement,
  athlete: string, opts: PreviewOptions = DEFAULT_RECIPE
) {
  const SHEET_W = 720, SHEET_H = 1080;           // 12x18 at 60px/inch
  const MARGIN = 54;
  canvas.width = SHEET_W; canvas.height = SHEET_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fdfdfb";
  ctx.fillRect(0, 0, SHEET_W, SHEET_H);

  /* frame-true fit of the photo into the inner box, like the engine */
  const innerW = SHEET_W - MARGIN * 2;
  const innerH = SHEET_H - MARGIN * 2 - 46;      // room for the caption
  const work = document.createElement("canvas");
  const maxDim = 480;
  const s0 = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
  work.width = Math.max(2, Math.round(img.naturalWidth * s0));
  work.height = Math.max(2, Math.round(img.naturalHeight * s0));
  const wctx = work.getContext("2d")!;
  wctx.drawImage(img, 0, 0, work.width, work.height);
  const data = wctx.getImageData(0, 0, work.width, work.height).data;
  const gray = new Float32Array(work.width * work.height);
  for (let i = 0; i < gray.length; i++) {
    const j = i * 4;
    gray[i] = (0.2126 * data[j] + 0.7152 * data[j + 1]
             + 0.0722 * data[j + 2]) / 255;
  }
  const density = buildDensity(gray, opts);
  const pts = samplePoints(density, work.width, work.height, opts);

  const fit = Math.min(innerW / work.width, innerH / work.height);
  const ox = MARGIN + (innerW - work.width * fit) / 2;
  const oy = MARGIN + (innerH - work.height * fit) / 2;
  ctx.fillStyle = "#082b4a";
  for (let i = 0; i < pts.length; i += 3) {
    const r = 0.9 + 1.5 * Math.sqrt(pts[i + 2]);
    ctx.beginPath();
    ctx.arc(ox + pts[i] * fit, oy + pts[i + 1] * fit, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* the engineering caption, straight from the brand */
  ctx.fillStyle = "#7b8794";
  ctx.font = "600 13px 'IBM Plex Mono', monospace";
  const label = (athlete || "YOUR ATHLETE").toUpperCase();
  ctx.fillText(`${label} \u00B7 HAND-PLOTTED \u00B7 12\u00D718 IN \u00B7 PEN 0.5 MM`, MARGIN, SHEET_H - 40);
  ctx.strokeStyle = "rgba(8,43,74,.18)";
  ctx.strokeRect(MARGIN / 2, MARGIN / 2, SHEET_W - MARGIN, SHEET_H - MARGIN);
}

/* ------------------------------------------------------------------
   Continuous-line mode: the finished pieces are ONE meandering pen
   path (a traveling-salesman walk through the stipple points), so
   the preview draws the same way. Greedy nearest-neighbor with a
   spatial grid — fast enough for the browser.
------------------------------------------------------------------- */
export function greedyPath(pts: Float32Array): Uint32Array {
  const n = pts.length / 3;
  if (n === 0) return new Uint32Array(0);
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, pts[i * 3]);     maxX = Math.max(maxX, pts[i * 3]);
    minY = Math.min(minY, pts[i * 3 + 1]); maxY = Math.max(maxY, pts[i * 3 + 1]);
  }
  const span = Math.max(1e-6, Math.max(maxX - minX, maxY - minY));
  const cell = Math.max(1e-6, span / Math.max(4, Math.sqrt(n)));
  const gw = Math.max(1, Math.ceil((maxX - minX) / cell) + 1);
  const gh = Math.max(1, Math.ceil((maxY - minY) / cell) + 1);
  const buckets: number[][] = Array.from({ length: gw * gh }, () => []);
  const bx = (i: number) => Math.min(gw - 1, Math.floor((pts[i * 3] - minX) / cell));
  const by = (i: number) => Math.min(gh - 1, Math.floor((pts[i * 3 + 1] - minY) / cell));
  for (let i = 0; i < n; i++) buckets[by(i) * gw + bx(i)].push(i);

  const order = new Uint32Array(n);
  const used = new Uint8Array(n);
  let cur = 0;
  used[0] = 1; order[0] = 0;
  const remove = (i: number) => {
    const b = buckets[by(i) * gw + bx(i)];
    b.splice(b.indexOf(i), 1);
  };
  remove(0);
  for (let k = 1; k < n; k++) {
    const cx = bx(cur), cy = by(cur);
    let best = -1, bestD = Infinity;
    for (let ring = 0; ring < Math.max(gw, gh); ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const gx = cx + dx, gy = cy + dy;
          if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
          for (const j of buckets[gy * gw + gx]) {
            const d = (pts[j * 3] - pts[cur * 3]) ** 2
                    + (pts[j * 3 + 1] - pts[cur * 3 + 1]) ** 2;
            if (d < bestD) { bestD = d; best = j; }
          }
        }
      }
      if (best >= 0 && ring > 1) break;   // a hit plus one safety ring
    }
    if (best < 0) break;
    used[best] = 1; remove(best);
    order[k] = best; cur = best;
  }
  return order;
}

/* Same sheet as drawPreview, but rendered as the one-line drawing. */
export function drawLinePreview(
  canvas: HTMLCanvasElement, img: HTMLImageElement,
  athlete: string, opts: PreviewOptions = { ...DEFAULT_RECIPE, dots: 5200 }
) {
  const SHEET_W = 720, SHEET_H = 1080, MARGIN = 54;
  canvas.width = SHEET_W; canvas.height = SHEET_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fdfdfb"; ctx.fillRect(0, 0, SHEET_W, SHEET_H);
  const innerW = SHEET_W - MARGIN * 2, innerH = SHEET_H - MARGIN * 2 - 46;
  const work = document.createElement("canvas");
  const maxDim = 420;
  const s0 = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
  work.width = Math.max(2, Math.round(img.naturalWidth * s0));
  work.height = Math.max(2, Math.round(img.naturalHeight * s0));
  const wctx = work.getContext("2d")!;
  wctx.drawImage(img, 0, 0, work.width, work.height);
  const data = wctx.getImageData(0, 0, work.width, work.height).data;
  const gray = new Float32Array(work.width * work.height);
  for (let i = 0; i < gray.length; i++) {
    const j = i * 4;
    gray[i] = (0.2126 * data[j] + 0.7152 * data[j + 1]
             + 0.0722 * data[j + 2]) / 255;
  }
  const density = buildDensity(gray, opts);
  const pts = samplePoints(density, work.width, work.height, opts);
  const order = greedyPath(pts);
  const fit = Math.min(innerW / work.width, innerH / work.height);
  const ox = MARGIN + (innerW - work.width * fit) / 2;
  const oy = MARGIN + (innerH - work.height * fit) / 2;
  ctx.strokeStyle = "#082b4a";
  ctx.lineWidth = 1.4;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.beginPath();
  for (let k = 0; k < order.length; k++) {
    const i = order[k] * 3;
    const x = ox + pts[i] * fit, y = oy + pts[i + 1] * fit;
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#7b8794";
  ctx.font = "600 13px 'IBM Plex Mono', monospace";
  const label = (athlete || "YOUR ATHLETE").toUpperCase();
  ctx.fillText(`${label} \u00B7 ONE CONTINUOUS LINE \u00B7 12\u00D718 IN \u00B7 HAND-PLOTTED`, MARGIN, SHEET_H - 40);
  ctx.strokeStyle = "rgba(8,43,74,.18)"; ctx.lineWidth = 1;
  ctx.strokeRect(MARGIN / 2, MARGIN / 2, SHEET_W - MARGIN, SHEET_H - MARGIN);
}
