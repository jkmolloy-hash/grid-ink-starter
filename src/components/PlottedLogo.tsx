import { useState } from "react";
import { EMBLEM } from "@/lib/emblem";

/* The logo, drawn the way the shop draws everything: 254 real centerline
   pen strokes at constant pen speed — frame, grid, nib, meander, wordmark.
   Click to watch it plot again. */
const DUR = 6.5;
const SPEED = EMBLEM.total / DUR;

export default function PlottedLogo({ className = "" }: { className?: string }) {
  const [run, setRun] = useState(0);
  let cum = 0;
  return (
    <svg key={run} viewBox={`0 0 ${EMBLEM.w} ${EMBLEM.h}`}
         className={className} role="img"
         aria-label="Grid and Ink Company logo, drawing itself stroke by stroke"
         onClick={() => setRun(r => r + 1)} style={{ cursor: "pointer" }}>
      <rect x="6" y="6" width={EMBLEM.w - 12} height={EMBLEM.h - 12}
            rx="56" fill="#082b4a" />
      {EMBLEM.paths.map((p, i) => {
        const delay = cum / SPEED;
        cum += p.len;
        return (
          <path key={i} d={p.d} fill="none" stroke="#fdfdfb"
                strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"
                className="plot-stroke"
                style={{
                  // +3 buffer keeps the round cap hidden until the
                  // stroke actually begins — no dot constellation
                  strokeDasharray: p.len + 3, strokeDashoffset: p.len + 3,
                  animation:
                    `plot-draw ${(p.len / SPEED).toFixed(3)}s linear ` +
                    `${delay.toFixed(3)}s forwards`,
                }} />
        );
      })}
    </svg>
  );
}
