/* ------------------------------------------------------------------
   The catalog. Prices are James's real numbers (Aug 2026).
   Shipping is now included in the price for both products.
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
    priceCents: 9800,                    // $98, shipping included
    shippingCents: 0,
    shipMethod: "Framed, protected flat pack",
    shippingOptions: [
      { label: "Shipping included (USPS Ground)", amountCents: 0, estDays: [5, 8] },
    ],
    blurb: "Your athlete drawn as one continuous pen line. Arrives framed.",
    framed: true,
  },
  city: {
    name: "City Map Art",
    size: '16" x 20"',
    priceCents: 9800,                    // $98, shipping included
    shippingCents: 0,
    shipMethod: "Rolled in a secure shipping tube",
    shippingOptions: [
      { label: "Shipping included (USPS Ground)", amountCents: 0, estDays: [5, 8] },
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
