// Creates a Stripe Checkout session for one order.
// Secrets required (Supabase > Edge Functions > Secrets):
//   STRIPE_SECRET_KEY  — from Stripe > Developers > API keys
//   SITE_URL           — your live site, e.g. https://gridink.lovable.app
import Stripe from "npm:stripe@16";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { orderId } = await req.json();
    // The customer's own session — RLS makes sure it's their order.
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: order, error } = await supa.from("orders")
      .select("id, product_name, size_label, price_cents, athlete_name, "
            + "shipping_cents, ship_method, shipping_options")
      .eq("id", orderId).single();
    if (error || !order) throw new Error("Order not found.");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    const site = Deno.env.get("SITE_URL") ?? "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: order.price_cents,
          product_data: {
            name: `${order.product_name} (${order.size_label})`,
            description: order.athlete_name
              ? `Athlete: ${order.athlete_name}` : undefined,
          },
        },
      }],
      shipping_address_collection: { allowed_countries: ["US"] },
      // Every tier the product offers; the customer picks one on the
      // Stripe page and the choice comes back through the webhook.
      shipping_options: ((order.shipping_options?.length
        ? order.shipping_options
        : [{ label: order.ship_method ?? "Shipping",
             amountCents: order.shipping_cents ?? 0 }])
        as { label: string; amountCents: number;
             estDays?: [number, number] }[])
        .map((o) => ({
          shipping_rate_data: {
            type: "fixed_amount" as const,
            display_name: o.label,
            fixed_amount: { amount: o.amountCents, currency: "usd" },
            ...(o.estDays ? { delivery_estimate: {
              minimum: { unit: "business_day" as const, value: o.estDays[0] },
              maximum: { unit: "business_day" as const, value: o.estDays[1] },
            } } : {}),
          },
        })),
      metadata: { order_id: order.id },
      success_url: `${site}/account?paid=1`,
      cancel_url: `${site}/create`,
    });

    await supa.from("orders")
      .update({ stripe_session_id: session.id }).eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
