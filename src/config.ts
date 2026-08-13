/* ------------------------------------------------------------------
   The catalog. Prices are James's real numbers (Aug 2026).
   TODO(James): confirm the two SHIPPING amounts — placeholders below.
------------------------------------------------------------------- */
export type ProductKey = "sports" | "city";

export type ShippingOption = {
  label: string; amountCents: number; estDays: [number, number];
};

export const PRODUCTS: Record<ProductKey, {
  name: string; size: string; priceCents: number;
  shippingCents: number; shipMethod: string;
  shippingOptions: ShippingOption[];
  blurb: string; framed: boolean;
}> = {
  sports: {
    name: "Sports Line Art Portrait",
    size: '12" x 18"',
    priceCents: 9000,                    // $90
    shippingCents: 1800,                 // = Standard below (card display)
    shipMethod: "Framed, protected flat pack",
    // TODO(James): replace with real Pirate Ship quotes (packed weights)
    shippingOptions: [
      { label: "Standard (USPS Ground)", amountCents: 1800, estDays: [5, 8] },
      { label: "Priority (USPS Priority Mail)", amountCents: 3200,
        estDays: [2, 3] },
    ],
    blurb: "Your athlete drawn as one continuous pen line. Arrives framed.",
    framed: true,
  },
  city: {
    name: "City Map Art",
    size: '16" x 20"',
    priceCents: 9000,                    // $90
    shippingCents: 1200,                 // = Standard below (card display)
    shipMethod: "Rolled in a secure shipping tube",
    // TODO(James): replace with real Pirate Ship quotes (packed weights)
    shippingOptions: [
      { label: "Standard (USPS Ground)", amountCents: 1200, estDays: [5, 8] },
      { label: "Priority (USPS Priority Mail)", amountCents: 2400,
        estDays: [2, 3] },
    ],
    blurb: "A minimalist plotted street map of a place that matters.",
    framed: false,
  },
};

export const PRODUCT = PRODUCTS.sports;  // legacy alias

export const BRAND = {
  name: "GRID & INK CO.",
  tagline: "One pen. One line at a time. No two alike.",
  ink: "#082b4a",
};

export const TURNAROUND = "Plotted and shipped within 7-10 days";
