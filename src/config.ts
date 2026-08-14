/* ------------------------------------------------------------------
   The catalog. Prices are James's real numbers (Aug 2026).
   TODO(James): confirm the two SHIPPING amounts — placeholders below.
------------------------------------------------------------------- */
export type ProductKey = "sports" | "city" | "custom";

export type ShippingOption = {
  label: string; amountCents: number; estDays: [number, number];
};

export const PRODUCTS: Record<ProductKey, {
  name: string; size: string; priceCents: number; inkLabel: string;
  shippingCents: number; shipMethod: string;
  shippingOptions: ShippingOption[];
  blurb: string; framed: boolean;
}> = {
  sports: {
    name: "Sports Line Art Portrait",
    inkLabel: "your choice of inks",
    size: '12" x 18"',
    priceCents: 9800,                    // $98 — shipping included
    shippingCents: 0,                    // included (US)
    shipMethod: "Framed, protected flat pack",
    // TODO(James): replace with real Pirate Ship quotes (packed weights)
    shippingOptions: [
      { label: "US shipping — included", amountCents: 0,
        estDays: [5, 8] },
    ],
    blurb: "Your athlete drawn as one continuous pen line. Arrives framed.",
    framed: true,
  },
  city: {
    name: "City Map Art",
    inkLabel: "white ink on navy stock",
    size: '16" x 20"',
    priceCents: 9800,                    // $98 — shipping included
    shippingCents: 0,                    // included (US)
    shipMethod: "Rolled in a secure shipping tube",
    // TODO(James): replace with real Pirate Ship quotes (packed weights)
    shippingOptions: [
      { label: "US shipping — included", amountCents: 0,
        estDays: [5, 8] },
    ],
    blurb: "A minimalist plotted street map of a place that matters.",
    framed: false,
  },
  custom: {
    name: "Custom Line Art",
    inkLabel: "your choice of inks",
    size: '18" x 12"',
    priceCents: 9800,
    shippingCents: 0,
    shipMethod: "Framed, protected flat pack",
    shippingOptions: [
      { label: "US shipping \u2014 included", amountCents: 0,
        estDays: [5, 8] },
    ],
    blurb: "Your car. Your boat. The stadium where it happened. "
      + "If a photo holds it, one pen can draw it \u2014 arrives framed.",
    framed: true,
  },
};

export const PRODUCT = PRODUCTS.sports;  // legacy alias

export const BRAND = {
  name: "GRID & INK CO.",
  tagline: "One pen. One line at a time. No two alike.",
  email: "gridpenco@gmail.com",
  ink: "#082b4a",
};

export const TURNAROUND = "Plotted and shipped within 7-10 days";
