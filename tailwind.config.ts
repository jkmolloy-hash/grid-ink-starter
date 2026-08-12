import type { Config } from "tailwindcss";

/* Grid & Ink brand system — the same blueprint language as the
   production console: deep navy ink on paper white, engineering
   monospace accents, generous air. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#082b4a",          // the navy — every drawn line
        paper: "#fdfdfb",        // warm paper white
        bench: "#eef1f4",        // the gray work surface
        note: "#7b8794",         // quiet annotations
        accent: "#c1121f",       // crimson — cut lines, alerts, sparing
      },
      fontFamily: {
        display: ["'Space Grotesk'", "Inter", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        sheet: "0 1px 2px rgba(8,43,74,.08), 0 12px 40px rgba(8,43,74,.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
