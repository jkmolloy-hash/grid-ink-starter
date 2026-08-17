/* Photo quality gate.

   A pen plotter can only draw what the photograph actually contains.
   A screen-grab from a video looks fine on a phone and falls apart
   under a pen: no fine detail to follow, just soft mush. So every
   upload is measured three ways before it can be ordered.

   1. Resolution  — pixels on the short side.
   2. Sharpness   — edge energy (a blur detector). Video grabs, digital
                    zoom and upscaled screenshots all score low.
   3. Compression — bytes per pixel. A file too small for its pixel
                    count has been re-saved or screenshotted.

   Everything runs in the browser; nothing is uploaded to measure it. */

export type PhotoVerdict = {
  level: "good" | "warn" | "reject";
  headline: string;
  reasons: string[];
  metrics: { w: number; h: number; short: number; sharpness: number;
             bytesPerPixel: number };
  summary: string;          // one line stored on the order
};

const MIN_SHORT = 900;      // below this: rejected
const GOOD_SHORT = 1500;    // at or above this: no size warning
const MIN_SHARP = 6;        // below this: rejected as blurred/upscaled
const OK_SHARP = 14;        // above this: crisp

/* Mean absolute Laplacian over a downscaled grayscale copy. Scaling to
   a fixed width keeps the number comparable between a phone photo and
   a 6000px DSLR file. */
function sharpnessOf(img: HTMLImageElement): number {
  const W = 480;
  const H = Math.max(1, Math.round(img.naturalHeight * (W / img.naturalWidth)));
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return OK_SHARP;              // can't measure: don't punish
  ctx.drawImage(img, 0, 0, W, H);
  const d = ctx.getImageData(0, 0, W, H).data;
  const g = new Float32Array(W * H);
  for (let i = 0, p = 0; i < d.length; i += 4, p++)
    g[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  let sum = 0, n = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x;
      const lap = 4 * g[p] - g[p - 1] - g[p + 1] - g[p - W] - g[p + W];
      sum += Math.abs(lap); n++;
    }
  }
  return n ? sum / n : OK_SHARP;
}

export function checkPhoto(img: HTMLImageElement, bytes: number): PhotoVerdict {
  const w = img.naturalWidth, h = img.naturalHeight;
  const short = Math.min(w, h);
  const sharpness = sharpnessOf(img);
  const bytesPerPixel = bytes / Math.max(1, w * h);

  const reasons: string[] = [];
  let level: PhotoVerdict["level"] = "good";

  if (short < MIN_SHORT) {
    level = "reject";
    reasons.push(`It's ${w} \u00d7 ${h} pixels. We need at least `
      + `${MIN_SHORT} on the short side \u2014 this one can't hold enough `
      + `detail for the pen.`);
  } else if (short < GOOD_SHORT) {
    level = "warn";
    reasons.push(`It's ${w} \u00d7 ${h} pixels. That will work, but fine `
      + `detail may come out soft. ${GOOD_SHORT}+ is ideal.`);
  }

  if (sharpness < MIN_SHARP) {
    level = "reject";
    reasons.push("The image is blurred or was enlarged from something "
      + "smaller \u2014 often a screenshot from a video, or a zoomed-in "
      + "crop. The pen would have no clear edges to follow.");
  } else if (sharpness < OK_SHARP && level !== "reject") {
    level = "warn";
    reasons.push("Detail looks a little soft. A sharper photo will plot "
      + "with more definition.");
  }

  if (bytesPerPixel < 0.06 && level !== "reject") {
    level = "warn";
    reasons.push("This file looks re-saved or screenshotted. The original "
      + "photo from the camera roll will always plot better.");
  }

  const headline =
    level === "good" ? "This photo will plot beautifully."
    : level === "warn" ? "This will work \u2014 with one caveat."
    : "This photo isn't good enough to plot.";

  return {
    level, headline, reasons,
    metrics: { w, h, short, sharpness, bytesPerPixel },
    summary: `${w}\u00d7${h}, sharpness ${sharpness.toFixed(1)}, `
      + `${bytesPerPixel.toFixed(3)} B/px \u2014 ${level}`,
  };
}
