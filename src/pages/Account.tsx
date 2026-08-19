import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/App";
import Seo from "@/components/Seo";

interface OrderRow {
  id: string; product_name: string; size_label: string;
  price_cents: number; athlete_name: string | null;
  status: string; created_at: string; change_request: string | null;
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
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [asking, setAsking] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");

  async function loadProofs(rows: OrderRow[]) {
    const waiting = rows.filter(o => o.status === "proof_ready");
    if (!waiting.length) { setProofs({}); return; }
    const im = await supabase.from("order_images").select("*")
      .in("order_id", waiting.map(o => o.id)).eq("kind", "proof");
    const next: Record<string, string> = {};
    for (const g of (im.data ?? []) as
         { order_id: string; storage_path: string; created_at?: string }[]) {
      const s = await supabase.storage.from("customer-photos")
        .createSignedUrl(g.storage_path, 3600);
      if (s.data?.signedUrl) next[g.order_id] = s.data.signedUrl;
    }
    setProofs(next);
  }

  async function respond(id: string, action: "approve" | "changes") {
    setBusy(id);
    const r = await supabase.rpc("respond_to_proof", {
      p_order: id, p_action: action,
      p_note: action === "changes" ? note : null });
    setBusy(""); setAsking(""); setNote("");
    if (!r.error) window.location.reload();
  }
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session) return;
    supabase.from("orders")
      .select("id, product_name, size_label, price_cents, athlete_name, status, created_at, change_request")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setLoaded(true);
        loadProofs((data ?? []) as OrderRow[]);
      });
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
      <Seo title="My Orders — Grid & Ink Co." description="Track your Grid & Ink Co. orders from proof to shipped." path="/account" noindex />
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
                                     shadow-sheet p-6">
            <div className="flex items-center justify-between gap-6">
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
            {o.status === "paid" && (
              <p className="caption mt-3">
                We proof every piece &mdash; your proof will appear right
                here for approval before the pen touches paper.
              </p>
            )}
            {o.status === "changes_requested" && (
              <p className="caption mt-3">
                Your notes are with the studio &mdash; a revised proof is
                on its way here.
              </p>
            )}
            {o.status === "proof_ready" && proofs[o.id] && (
              <div className="mt-4 border-t border-ink/10 pt-4">
                <div className="font-semibold text-sm">
                  Your proof is ready
                </div>
                <img src={proofs[o.id]} alt="Proof of your piece"
                     className="mt-3 w-full max-w-sm rounded-md border border-ink/15 shadow-sheet" />
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button className="btn-ink" disabled={busy === o.id}
                          onClick={() => respond(o.id, "approve")}>
                    {busy === o.id ? "Working…" : "Approve — plot it"}
                  </button>
                  <button className="caption underline"
                          onClick={() => setAsking(asking === o.id ? "" : o.id)}>
                    Request changes
                  </button>
                </div>
                {asking === o.id && (
                  <div className="mt-3">
                    <textarea className="field w-full" rows={3}
                              maxLength={800}
                              placeholder="Tell us what to adjust — one round of changes is included."
                              value={note}
                              onChange={e => setNote(e.target.value)} />
                    <button className="btn-ink mt-2"
                            disabled={busy === o.id || !note.trim()}
                            onClick={() => respond(o.id, "changes")}>
                      Send change request
                    </button>
                  </div>
                )}
                <p className="caption mt-3">
                  If we don't hear back within 48 hours we plot it exactly
                  as proofed, so your piece ships on time.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
