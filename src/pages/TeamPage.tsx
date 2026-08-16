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
