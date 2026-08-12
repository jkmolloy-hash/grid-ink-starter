import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/App";

interface OrderRow {
  id: string; product_name: string; size_label: string;
  price_cents: number; athlete_name: string | null;
  status: string; created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid \u2014 queued to plot",
  in_production: "On the plotter",
  shipped: "Shipped",
};

export default function Account() {
  const session = useSession();
  const [params] = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session) return;
    supabase.from("orders")
      .select("id, product_name, size_label, price_cents, athlete_name, status, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoaded(true); });
  }, [session]);

  if (!session)
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <p className="font-semibold">Sign in to see your orders.</p>
        <Link to="/auth?next=/account" className="btn-ink mt-5">Sign in</Link>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      {params.get("paid") && (
        <div className="bg-paper border border-ink/10 rounded-md shadow-sheet
                        p-4 mb-8 font-semibold">
          Payment received &mdash; your portrait is in the queue. &#10003;
        </div>
      )}
      <div className="caption">Signed in as {session.user.email}</div>
      <h1 className="text-3xl font-extrabold mt-1">My orders</h1>
      {loaded && orders.length === 0 && (
        <div className="mt-10 text-ink/70">
          Nothing here yet. <Link className="underline underline-offset-4 font-semibold"
          to="/create">Start your first portrait.</Link>
        </div>
      )}
      <div className="mt-8 space-y-4">
        {orders.map(o => (
          <div key={o.id} className="bg-paper rounded-lg border border-ink/10
                                     shadow-sheet p-6 flex items-center justify-between gap-6">
            <div>
              <div className="font-bold">{o.product_name}
                {o.athlete_name ? ` \u2014 ${o.athlete_name.toUpperCase()}` : ""}</div>
              <div className="caption mt-1">
                {o.size_label} &middot; {new Date(o.created_at).toLocaleDateString()}
                &middot; {(o.price_cents / 100).toLocaleString("en-US",
                  { style: "currency", currency: "USD" })}
              </div>
            </div>
            <span className="caption bg-bench rounded-full px-4 py-2 whitespace-nowrap">
              {STATUS_LABEL[o.status] ?? o.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
