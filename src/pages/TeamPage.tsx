/* One team's ordering page — reached only by its link.
   The artwork is already made, so this is the simplest flow in the
   shop: choose the sheet and pay. The artwork is stock — one design
   per team. Every sale carries the team's ref_code, so the Studio's
   Referrals ledger tallies what the team has earned. */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/App";
import { TEAM_PRODUCT } from "@/config";

type TeamPageRow = {
  slug: string; title: string; subtitle: string | null;
  art_url: string; price_cents: number; ref_code: string;
  closes_at: string | null; active: boolean;
};

const money = (c: number) =>
  `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

function closesCopy(iso: string | null): { text: string; closed: boolean } {
  if (!iso) return { text: "", closed: false };
  const end = new Date(iso).getTime();
  const days = Math.ceil((end - Date.now()) / 864e5);
  if (days < 0) return { text: "Ordering has closed.", closed: true };
  const when = new Date(iso).toLocaleDateString(undefined,
    { month: "long", day: "numeric" });
  if (days === 0) return { text: `Ordering closes today.`, closed: false };
  return {
    text: `Ordering closes ${when} — ${days} day${days === 1 ? "" : "s"} left.`,
    closed: false,
  };
}

export default function TeamPage() {
  const { slug = "" } = useParams();
  const session = useSession();
  const [page, setPage] = useState<TeamPageRow | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [orient, setOrient] =
    useState<"portrait" | "landscape">(TEAM_PRODUCT.defaultOrientation);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Team pages are unlisted: ask search engines to stay out.
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { document.head.removeChild(m); };
  }, []);

  useEffect(() => {
    (async () => {
      const r = await supabase.from("team_pages").select("*")
        .eq("slug", slug).maybeSingle();
      if (r.data) { setPage(r.data as TeamPageRow); setState("ready"); }
      else setState("missing");
    })();
  }, [slug]);

  async function reserve() {
    if (!page || !session || busy) return;
    setBusy(true); setErr("");
    try {
      const ins = await supabase.from("orders").insert({
        user_id: session.user.id,
        product_key: "team",
        product_name: `${TEAM_PRODUCT.name} — ${page.title}`,
        size_label: TEAM_PRODUCT.sizes[orient],
        price_cents: page.price_cents,
        shipping_cents: TEAM_PRODUCT.shippingCents,
        ship_method: TEAM_PRODUCT.shipMethod,
        shipping_options: TEAM_PRODUCT.shippingOptions,
        ref_code: page.ref_code,
        team_slug: page.slug,
        notes: notes.trim() || null,
        status: "pending_payment",
      }).select("id").single();
      if (ins.error) throw ins.error;

      const fn = await supabase.functions.invoke("create-checkout", {
        body: { orderId: ins.data.id },
      });
      if (fn.error) {
        let msg = "Checkout couldn't start.";
        try {
          const body = await (fn.error as { context: Response })
            .context.json();
          if (body?.error) msg = String(body.error);
        } catch { /* keep the generic message */ }
        throw new Error(msg);
      }
      const url = (fn.data as { url?: string })?.url;
      if (!url) throw new Error("No checkout link returned.");
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (state === "loading")
    return <div className="max-w-3xl mx-auto px-5 py-20 caption">Loading…</div>;

  if (state === "missing" || !page)
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">
          This team page isn&rsquo;t open
        </h1>
        <p className="mt-3 text-ink/70">
          Team pages run for a limited time and then close. If you think
          you should have access, get in touch and we&rsquo;ll sort it out.
        </p>
        <Link to="/contact" className="btn-ghost inline-block mt-6">
          Contact the studio
        </Link>
      </div>
    );

  const when = closesCopy(page.closes_at);
  const closed = when.closed || !page.active;

  return (
    <div className="max-w-5xl mx-auto px-5 py-12">
      <div className="caption">Team piece &middot; one of one, plotted to order</div>
      <h1 className="font-display text-3xl font-bold mt-1">{page.title}</h1>
      {page.subtitle && <p className="mt-2 text-ink/70">{page.subtitle}</p>}

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <div>
          <div className="bg-[#17191c] p-[10px] rounded shadow-sheet">
            <div className="bg-white p-4">
              <img src={page.art_url} alt={page.title}
                   className="block w-full h-auto" draggable={false} />
            </div>
          </div>
          <p className="caption mt-3">
            Hand-plotted in pen ink on archival stock. Every copy is drawn
            individually &mdash; no two are exactly alike.
          </p>
        </div>

        <div>
          <div className="text-lg font-semibold">
            {money(page.price_cents)}
          </div>
          <div className="caption mt-1">
            {TEAM_PRODUCT.sizes[orient]} &middot; {TEAM_PRODUCT.inkLabel}
            &middot; framed &middot; US shipping included
          </div>
          {when.text && (
            <div className={"mt-3 text-sm font-semibold "
              + (closed ? "text-ink/50" : "text-ink")}>
              {when.text}
            </div>
          )}

          <div className="mt-6">
            <div className="font-semibold text-sm">Orientation</div>
            <div className="flex gap-2 mt-2">
              {(["landscape", "portrait"] as const).map(o => (
                <button key={o} type="button" onClick={() => setOrient(o)}
                        className={"flex items-center gap-2 rounded border px-3 py-2 text-sm "
                          + (orient === o
                             ? "border-ink bg-ink text-paper"
                             : "border-ink/25 hover:border-ink")}>
                  <span className={"inline-block border-[1.5px] border-current rounded-[2px] "
                    + (o === "portrait" ? "w-[10px] h-[14px]" : "w-[14px] h-[10px]")} />
                  {o === "portrait" ? "Portrait" : "Landscape"}
                </button>
              ))}
            </div>
          </div>


          <label className="block mt-6 font-semibold text-sm">
            Anything we should know?
            <input className="field mt-1" maxLength={200} value={notes}
                   placeholder="Optional — a note for the studio"
                   onChange={e => setNotes(e.target.value)} />
          </label>

          {closed ? (
            <div className="mt-8 p-4 rounded border border-ink/15 bg-paper">
              <div className="font-semibold">Ordering has closed</div>
              <p className="caption mt-1">
                This team&rsquo;s run is finished and the pieces are being
                plotted. Get in touch if you missed it.
              </p>
            </div>
          ) : session ? (
            <>
              <button className="btn w-full mt-8" disabled={busy}
                      onClick={reserve}>
                {busy ? "Starting checkout…" : "Reserve yours"}
              </button>
              {err && <p className="caption mt-2 text-[#c1121f]">{err}</p>}
            </>
          ) : (
            <div className="mt-8">
              <Link to="/auth" className="btn w-full block text-center">
                Sign in to reserve
              </Link>
              <p className="caption mt-2">
                An account lets you follow your piece from proof to shipped.
              </p>
            </div>
          )}

          <p className="caption mt-6">
            A share of every piece sold goes back to the team.
          </p>
        </div>
      </div>
    </div>
  );
}
