// Stripe calls this when a checkout finishes; we mark the order paid.
// Secrets required:
//   STRIPE_SECRET_KEY      — same as create-checkout
//   STRIPE_WEBHOOK_SECRET  — from Stripe > Webhooks > your endpoint
// IMPORTANT: turn OFF "Enforce JWT verification" for this function
// (Supabase > Edge Functions > stripe-webhook > Details) — Stripe
// signs its own requests instead.
import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, sig!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!);
  } catch (e) {
    return new Response(`Signature verification failed: ${e}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // Service role: this runs server-side on Stripe's behalf.
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Which shipping tier they chose (label lives on the rate object)
    const sc = session.shipping_cost;
    let shippingLabel: string | null = null;
    if (sc?.shipping_rate) {
      try {
        const rate = await stripe.shippingRates.retrieve(
          sc.shipping_rate as string);
        shippingLabel = rate.display_name ?? null;
      } catch (_) { /* keep null — amount still recorded */ }
    }
    // Where to ship (Stripe collects this on the checkout page).
    // deno-lint-ignore no-explicit-any
    const anySession = session as any;
    const addr = session.shipping_details
      ?? anySession.collected_information?.shipping_details ?? null;
    await supa.from("orders").update({
      status: "paid",
      shipping_label: shippingLabel,
      shipping_paid_cents: sc?.amount_total ?? null,
      ship_name: addr?.name ?? null,
      ship_line1: addr?.address?.line1 ?? null,
      ship_line2: addr?.address?.line2 ?? null,
      ship_city: addr?.address?.city ?? null,
      ship_state: addr?.address?.state ?? null,
      ship_zip: addr?.address?.postal_code ?? null,
    }).eq("stripe_session_id", session.id);
  }
  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
