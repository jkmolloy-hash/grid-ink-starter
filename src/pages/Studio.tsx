/* The Studio — James's side of the shop. Visible only to studio admins.
   Queue of orders with everything needed to plot: customer's choices,
   photo/logo/proof links, one-drop proof upload (files it, links it,
   flips the status), the pre-written ping email, and the Pirate Ship
   CSV export for everything ready to ship. */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { BRAND } from "@/config";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useSession } from "@/App";
import Seo from "@/components/Seo";

type StudioOrder = {
  id: string; created_at: string; status: string; email: string;
  product_key: string; product_name: string; athlete_name: string | null;
  line2: string | null; color_mode: string | null; ink_art: string | null;
  ink_text: string | null; layout: unknown; city_name: string | null;
  notes: string | null; change_request: string | null;
  approved_at: string | null; ship_name: string | null;
  ship_line1: string | null; ship_line2: string | null;
  ship_city: string | null; ship_state: string | null;
  ship_zip: string | null; shipping_label: string | null; user_id: string;
  map_frame: { bbox: [number, number, number, number];
               title?: string; orientation?: string } | null;
  size_label: string | null;
  ref_code: string | null; promo_code: string | null;
  discount_cents: number | null; price_cents: number | null;
  team_slug: string | null;
  school_name: string | null; school_address: string | null;
  sport: string | null; photo_quality: string | null;
};

type TeamRow = {
  slug: string; title: string; subtitle: string | null;
  art_url: string; price_cents: number; ref_code: string;
  closes_at: string | null; active: boolean; personalize: boolean;
};

function FrameMini({ frame }:
  { frame: NonNullable<StudioOrder["map_frame"]> }) {
  return (
    <div ref={el => {
           if (!el || (el as HTMLDivElement & { _m?: boolean })._m) return;
           (el as HTMLDivElement & { _m?: boolean })._m = true;
           const m = L.map(el, { zoomControl: false, dragging: false,
             scrollWheelZoom: false, doubleClickZoom: false,
             boxZoom: false, keyboard: false, touchZoom: false });
           L.tileLayer(
             "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
             { subdomains: "abcd", maxZoom: 19,
               attribution: "&copy; OSM &copy; CARTO" }).addTo(m);
           const [w, s2, e, n] = frame.bbox;
           m.fitBounds([[s2, w], [n, e]], { animate: false });
         }}
         className={(frame.orientation === "landscape"
                       ? "h-32 w-40" : "h-40 w-32")
                    + " rounded border border-ink/15 overflow-hidden"} />
  );
}
type Img = { id: string; order_id: string; storage_path: string; kind: string };
type Msg = { id: string; created_at: string; name: string; email: string;
             message: string };

const STATUSES = ["pending_payment", "paid", "in_production",
  "changes_requested", "proof_ready", "approved", "shipped",
  "cancelled"] as const;

const STATUS_TINT: Record<string, string> = {
  pending_payment: "bg-ink/10 text-ink/60",
  paid: "bg-[#082b4a] text-paper",
  in_production: "bg-[#0e7a5f]/20 text-ink",
  cancelled: "bg-ink/10 text-ink/50 line-through",
  proof_ready: "bg-[#c9a227] text-ink",
  changes_requested: "bg-[#c1121f] text-paper",
  approved: "bg-[#0e7a5f] text-paper",
  shipped: "bg-ink/15 text-ink/70",
};

function pingMailto(o: StudioOrder): string {
  const subject = encodeURIComponent(
    "Your Grid & Ink proof is ready to review");
  const body = encodeURIComponent(
    `Hi${o.ship_name ? " " + o.ship_name.split(" ")[0] : ""},\n\n` +
    `The proof of ${o.athlete_name ? o.athlete_name + "'s" : "your"} ` +
    `piece is ready. Sign in to your account to see it and approve it ` +
    `(or ask for changes \u2014 one round of adjustments is included):\n\n` +
    `${window.location.origin}/account\n\n` +
    `If we haven't heard back within 48 hours we'll plot it exactly as ` +
    `proofed so your piece ships on time.\n\n` +
    `\u2014 Grid & Ink Co.`);
  return `mailto:${o.email}?subject=${subject}&body=${body}`;
}

function csvEscape(v: string | null | undefined): string {
  const s = (v ?? "").replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export function buildPirateShipCSV(orders: StudioOrder[]): string {
  const rows = orders.filter(o => o.ship_name && o.status !== "shipped"
                                  && o.status !== "pending_payment");
  const head = ["Order ID", "Order Date", "Recipient Name",
    "Address Line 1", "Address Line 2", "City", "State", "Zip",
    "Email", "Product", "Athlete", "Status"];
  const lines = rows.map(o => [
    o.id.slice(0, 8), o.created_at.slice(0, 10), o.ship_name,
    o.ship_line1, o.ship_line2, o.ship_city, o.ship_state, o.ship_zip,
    o.email, o.product_name, o.athlete_name ?? o.city_name ?? "",
    o.status,
  ].map(csvEscape).join(","));
  return [head.join(","), ...lines].join("\n");
}

export default function Studio() {
  const session = useSession();
  const [isStudio, setIsStudio] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<StudioOrder[]>([]);
  const [images, setImages] = useState<Img[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [inbox, setInbox] = useState<Msg[]>([]);
  const [subs, setSubs] = useState<{ email: string; created_at: string }[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [tForm, setTForm] = useState({
    slug: "", title: "", subtitle: "", art_url: "",
    ref_code: "", closes_at: "" });
  const [tMsg, setTMsg] = useState("");

  async function refresh() {
    const q = await supabase.rpc("studio_orders");
    if (q.error) { setErr(q.error.message); return; }
    const os = (q.data ?? []) as StudioOrder[];
    setOrders(os);
    if (os.length) {
      const im = await supabase.from("order_images").select("*")
        .in("order_id", os.map(o => o.id));
      const imgs = (im.data ?? []) as Img[];
      setImages(imgs);
      const next: Record<string, string> = {};
      for (const g of imgs) {
        const s = await supabase.storage.from("customer-photos")
          .createSignedUrl(g.storage_path, 3600);
        if (s.data?.signedUrl) next[g.id] = s.data.signedUrl;
      }
      setUrls(next);
    } else { setImages([]); setUrls({}); }
    const mb = await supabase.from("contact_messages").select("*")
      .order("created_at", { ascending: false }).limit(50);
    setInbox((mb.data ?? []) as Msg[]);
    const ns = await supabase.from("newsletter_signups")
      .select("email, created_at")
      .order("created_at", { ascending: false });
    setSubs(ns.data ?? []);
    const tp = await supabase.from("team_pages").select("*")
      .order("created_at", { ascending: false });
    setTeams((tp.data ?? []) as TeamRow[]);
  }

  useEffect(() => {
    if (!session) { setIsStudio(null); return; }
    supabase.rpc("is_studio").then(r => {
      setIsStudio(!!r.data);
      if (r.data) refresh();
    });
  }, [session]);

  async function claim() {
    setBusy("claim");
    const r = await supabase.rpc("claim_studio");
    setBusy("");
    if (r.data) { setIsStudio(true); refresh(); }
    else setErr("Studio access is already claimed.");
  }

  async function setStatus(o: StudioOrder, status: string) {
    setBusy(o.id);
    const r = await supabase.from("orders").update({ status })
      .eq("id", o.id);
    setBusy("");
    if (r.error) setErr(r.error.message); else refresh();
  }

  async function uploadProof(o: StudioOrder, f: File | undefined | null) {
    if (!f) return;
    setBusy(o.id); setErr("");
    try {
      const ext = f.name.split(".").pop() || "jpg";
      const path = `${o.user_id}/proofs/${o.id}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("customer-photos")
        .upload(path, f, { upsert: false });
      if (up.error) throw up.error;
      const row = await supabase.from("order_images").insert({
        order_id: o.id, storage_path: path, kind: "proof" });
      if (row.error) throw row.error;
      const st = await supabase.from("orders")
        .update({ status: "proof_ready" }).eq("id", o.id);
      if (st.error) throw st.error;
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Proof upload failed.");
    }
    setBusy("");
  }

  function exportCSV() {
    const csv = buildPirateShipCSV(orders);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pirate-ship-orders.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const queue = useMemo(
    () => orders.filter(o => o.status !== "pending_payment"), [orders]);

  if (!session)
    return (
      <div className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="font-display text-2xl font-bold">The Studio</h1>
        <p className="mt-3 text-ink/70">
          Sign in first &mdash; the studio door only opens for the studio.
        </p>
        <Link className="btn-ink inline-flex mt-5" to="/auth">Sign in</Link>
      </div>
    );

  if (isStudio === false)
    return (
      <div className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="font-display text-2xl font-bold">The Studio</h1>
        <p className="mt-3 text-ink/70">
          This area belongs to Grid &amp; Ink. If you are the studio and
          this is first setup, claim it now &mdash; claiming only works
          once, while the studio is unowned.
        </p>
        <button className="btn-ink mt-5" disabled={busy === "claim"}
                onClick={claim}>
          {busy === "claim" ? "Claiming\u2026" : "Claim studio access"}
        </button>
        {err && <p className="mt-3 text-sm" style={{ color: "#b00020" }}>{err}</p>}
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <Seo title="Studio — Grid & Ink Co." description="Internal studio dashboard." path="/studio" noindex />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="caption">Grid &amp; Ink</div>
          <h1 className="font-display text-3xl font-bold">The Studio</h1>
        </div>
        <button className="btn-ink" onClick={exportCSV}>
          Download Pirate Ship CSV
        </button>
      </div>
      {err && <p className="mt-4 text-sm" style={{ color: "#b00020" }}>{err}</p>}
      {queue.length === 0 && (
        <p className="mt-10 text-ink/60">
          No orders yet &mdash; when they arrive, they line up here.
        </p>
      )}
      <div className="mt-8 space-y-6">
        {queue.map(o => {
          const mine = images.filter(g => g.order_id === o.id);
          const proof = [...mine].reverse().find(g => g.kind === "proof");
          return (
            <div key={o.id}
                 className="bg-paper rounded-lg shadow-sheet border border-ink/10 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className={"px-2.5 py-1 rounded font-mono text-[11px] uppercase tracking-wider "
                                 + (STATUS_TINT[o.status] ?? "bg-ink/10")}>
                  {o.status.replace("_", " ")}
                </span>
                <span className="font-semibold">{o.product_name}</span>
                {o.size_label &&
                  <span className="caption">{o.size_label}</span>}
                <span className="caption">{o.created_at.slice(0, 10)}</span>
                <span className="caption">{o.email}</span>
                <span className="caption font-mono">#{o.id.slice(0, 8)}</span>
              </div>

              <div className="mt-4 grid md:grid-cols-3 gap-6">
                <div>
                  <div className="caption">The piece</div>
                  <div className="mt-1 font-semibold">
                    {o.athlete_name ?? o.city_name ?? "\u2014"}
                  </div>
                  {o.line2 && <div className="text-sm">{o.line2}</div>}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="caption">
                      {o.color_mode === "two" ? "Two colors" : "One color"}
                    </span>
                    {o.ink_art && (
                      <span className="h-4 w-4 rounded border border-ink/20 inline-block"
                            style={{ background: o.ink_art }} />)}
                    {o.ink_text && o.ink_text !== o.ink_art && (
                      <span className="h-4 w-4 rounded border border-ink/20 inline-block"
                            style={{ background: o.ink_text }} />)}
                  </div>
                  {o.school_name && (
                    <div className="caption mt-2">
                      <span className="font-semibold">Logo needed:</span>{" "}
                      {o.school_name}{o.sport ? ` \u2014 ${o.sport}` : ""}
                      <span className="block">{o.school_address}</span>
                    </div>
                  )}
                  {o.photo_quality && (
                    <div className="caption mt-1">Photo: {o.photo_quality}</div>
                  )}
                  {o.notes && <div className="caption mt-2">Note: {o.notes}</div>}
                  {o.change_request && (
                    <div className="mt-3 text-sm rounded border border-[#c1121f]/40 bg-[#c1121f]/5 p-3">
                      <span className="font-semibold">Change request:</span>{" "}
                      {o.change_request}
                    </div>
                  )}
                  {o.approved_at && (
                    <div className="caption mt-2" style={{ color: "#0e7a5f" }}>
                      Approved {o.approved_at.slice(0, 10)}
                    </div>
                  )}
                </div>

                <div>
                  <div className="caption">Files</div>
                  {o.product_key === "city" && o.map_frame && (
                    <div className="mb-3">
                      <FrameMini frame={o.map_frame} />
                      <span className="caption block mt-1">
                        their framed map
                      </span>
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {mine.map(g => (
                      <a key={g.id} href={urls[g.id]} target="_blank"
                         rel="noreferrer"
                         className="block w-20">
                        <img src={urls[g.id]} alt={g.kind}
                             className="h-20 w-20 object-cover rounded border border-ink/15" />
                        <span className="caption block text-center mt-1">
                          {g.kind}
                        </span>
                      </a>
                    ))}
                    {mine.length === 0 && (
                      <span className="caption">No files</span>)}
                  </div>
                </div>

                <div>
                  <div className="caption">Actions</div>
                  <label className="mt-2 block border border-dashed border-ink/25
                                    rounded-md px-4 py-3 text-sm cursor-pointer
                                    hover:border-ink/60 transition">
                    {busy === o.id ? "Working\u2026"
                      : proof ? "Upload a new proof (replaces the last)"
                              : "Drop the proof JPEG here"}
                    <input type="file" accept="image/*" className="hidden"
                           onChange={e => uploadProof(o, e.target.files?.[0])} />
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <select className="field !w-auto text-sm" value={o.status}
                            onChange={e => setStatus(o, e.target.value)}>
                      {STATUSES.map(s => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
                    <a className="caption underline" href={pingMailto(o)}>
                      Ping email
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-14">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-bold">Inbox</h2>
          <span className="caption">from the contact form</span>
        </div>
        {inbox.length === 0 && (
          <p className="caption mt-3">No messages.</p>
        )}
        <div className="mt-4 space-y-4">
          {inbox.map(m => (
            <div key={m.id}
                 className="bg-paper rounded-lg border border-ink/10
                            shadow-sheet p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{m.name}</span>
                <span className="caption">{m.email}</span>
                <span className="caption">{m.created_at.slice(0, 10)}</span>
                <a className="caption underline ml-auto"
                   target="_blank" rel="noreferrer"
                   href={"https://mail.google.com/mail/u/" + BRAND.email
                     + "/?view=cm&fs=1&to=" + encodeURIComponent(m.email)
                     + "&su=" + encodeURIComponent(
                         "Re: your note to Grid & Ink")
                     + "&body=" + encodeURIComponent(
                         "\n\n\u2014 your note:\n> "
                         + m.message.slice(0, 500))}>
                  Reply from the studio
                </a>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-bold">Team pages</h2>
          <span className="caption">
            unlisted &middot; share the link, 20% back to the team
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3
                        bg-paper rounded border border-ink/10 p-4">
          <input className="field" placeholder="slug (e.g. crms-blue)"
                 value={tForm.slug}
                 onChange={e => setTForm({ ...tForm,
                   slug: e.target.value.toLowerCase()
                     .replace(/[^a-z0-9-]/g, "-").slice(0, 40) })} />
          <input className="field" placeholder="Title (team name)"
                 value={tForm.title}
                 onChange={e => setTForm({ ...tForm, title: e.target.value })} />
          <input className="field" placeholder="Subtitle (record, season)"
                 value={tForm.subtitle}
                 onChange={e => setTForm({ ...tForm, subtitle: e.target.value })} />
          <input className="field" placeholder="Art URL (/gallery/x.jpg)"
                 value={tForm.art_url}
                 onChange={e => setTForm({ ...tForm, art_url: e.target.value })} />
          <input className="field" placeholder="Team ref code (e.g. crms)"
                 value={tForm.ref_code}
                 onChange={e => setTForm({ ...tForm,
                   ref_code: e.target.value.toLowerCase()
                     .replace(/[^a-z0-9_-]/g, "") })} />
          <input className="field" type="date"
                 value={tForm.closes_at}
                 onChange={e => setTForm({ ...tForm, closes_at: e.target.value })} />
          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
            <button className="btn !py-2"
                    disabled={!tForm.slug || !tForm.title || !tForm.art_url
                              || !tForm.ref_code}
                    onClick={async () => {
                      const r = await supabase.from("team_pages").insert({
                        slug: tForm.slug, title: tForm.title,
                        subtitle: tForm.subtitle || null,
                        art_url: tForm.art_url, ref_code: tForm.ref_code,
                        closes_at: tForm.closes_at
                          ? new Date(tForm.closes_at + "T23:59:59").toISOString()
                          : null,
                      });
                      if (r.error) { setTMsg(r.error.message); return; }
                      setTMsg("Page created.");
                      setTForm({ slug: "", title: "", subtitle: "",
                        art_url: "", ref_code: "", closes_at: "" });
                      refresh();
                    }}>
              Create team page
            </button>
            {tMsg && <span className="caption">{tMsg}</span>}
          </div>
        </div>

        {teams.length === 0 && (
          <p className="caption mt-3">No team pages yet.</p>
        )}
        <div className="mt-4 space-y-2">
          {teams.map(t => {
            const sold = orders.filter(o => o.team_slug === t.slug
              && o.status !== "pending_payment" && o.status !== "cancelled");
            const net = sold.reduce((a, o) =>
              a + ((o.price_cents ?? 0) - (o.discount_cents ?? 0)), 0);
            const link = `${window.location.origin}/team/${t.slug}`;
            return (
              <div key={t.slug}
                   className="bg-paper rounded border border-ink/10 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">{t.title}</span>
                  <span className="caption">{sold.length} sold</span>
                  <span className="caption">
                    ${(net / 100).toFixed(2)} collected
                  </span>
                  <span className="caption">
                    team earns ${(net * 0.2 / 100).toFixed(2)}
                  </span>
                  <span className="ml-auto caption">
                    {t.closes_at
                      ? `closes ${t.closes_at.slice(0, 10)}`
                      : "no deadline"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <code className="text-xs">{link}</code>
                  <button className="caption underline"
                          onClick={() => navigator.clipboard?.writeText(link)}>
                    Copy link
                  </button>
                  <button className="caption underline"
                          onClick={async () => {
                            await supabase.from("team_pages")
                              .update({ active: !t.active }).eq("slug", t.slug);
                            refresh();
                          }}>
                    {t.active ? "Close ordering" : "Reopen"}
                  </button>
                  {!t.active && <span className="caption">closed</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-14">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-bold">Referrals</h2>
          <span className="caption">
            commission sales &middot; 20% of the amount paid
          </span>
        </div>
        {(() => {
          const sold = orders.filter(o =>
            o.ref_code && o.status !== "pending_payment"
            && o.status !== "cancelled");
          if (!sold.length)
            return <p className="caption mt-3">
              No referral sales yet. Share links like
              /?ref=rashad &mdash; orders from those visits land here.
            </p>;
          const by: Record<string, { n: number; net: number }> = {};
          for (const o of sold) {
            const net = (o.price_cents ?? 0) - (o.discount_cents ?? 0);
            by[o.ref_code!] = { n: (by[o.ref_code!]?.n ?? 0) + 1,
                                net: (by[o.ref_code!]?.net ?? 0) + net };
          }
          return (
            <div className="mt-4 space-y-2">
              {Object.entries(by).map(([code, v]) => (
                <div key={code}
                     className="bg-paper rounded border border-ink/10 px-4
                                py-2 flex flex-wrap items-center gap-4">
                  <span className="font-mono font-semibold">{code}</span>
                  <span className="caption">{v.n} sale{v.n > 1 ? "s" : ""}</span>
                  <span className="caption">
                    ${(v.net / 100).toFixed(2)} collected
                  </span>
                  <span className="ml-auto font-semibold">
                    owed ${(v.net * 0.2 / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="mt-14">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl font-bold">Subscribers</h2>
          <span className="caption">
            {subs.length} on the list &middot; 10% welcome offer
          </span>
          {subs.length > 0 && (
            <button className="caption underline ml-auto"
                    onClick={() => {
                      const csv = "Email,Signed up\n" + subs.map(x =>
                        `${x.email},${x.created_at.slice(0, 10)}`).join("\n");
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(
                        new Blob([csv], { type: "text/csv" }));
                      a.download = "gridink-subscribers.csv";
                      a.click();
                    }}>
              Download CSV
            </button>
          )}
        </div>
        {subs.length === 0 && (
          <p className="caption mt-3">No subscribers yet.</p>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {subs.slice(0, 60).map(x => (
            <div key={x.email}
                 className="bg-paper rounded border border-ink/10 px-4 py-2
                            flex items-center justify-between">
              <span className="text-sm">{x.email}</span>
              <span className="caption">{x.created_at.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
