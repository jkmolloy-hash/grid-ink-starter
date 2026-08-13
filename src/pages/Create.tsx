import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/App";
import { drawLinePreview } from "@/lib/preview";
import { PRODUCTS, TURNAROUND, type ProductKey } from "@/config";

/* One page, two flows:
   sports — upload a photo, see the one-line drawing live, checkout.
   city   — name the place; we plot from real street data and email a
            proof before pen touches paper. */
export default function Create() {
  const session = useSession();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const key: ProductKey = params.get("product") === "city" ? "city" : "sports";
  const product = PRODUCTS[key];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<File | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [athlete, setAthlete] = useState("");
  const [cityName, setCityName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [lowRes, setLowRes] = useState<null | { w: number; h: number }>(null);
  const [err, setErr] = useState("");

  const money = (c: number) =>
    (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

  function render() {
    if (imgRef.current && canvasRef.current)
      drawLinePreview(canvasRef.current, imgRef.current, athlete);
  }
  function onFile(f: File | undefined | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("Please choose an image file."); return; }
    setErr(""); fileRef.current = f;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setLowRes(Math.min(img.naturalWidth, img.naturalHeight) < 1200
        ? { w: img.naturalWidth, h: img.naturalHeight } : null);
      setHasPhoto(true); render();
    };
    img.src = URL.createObjectURL(f);
  }

  const ready = key === "sports" ? hasPhoto : cityName.trim().length > 1;

  async function checkout() {
    if (!session || !ready) return;
    setBusy(true); setErr("");
    try {
      const ins = await supabase.from("orders").insert({
        user_id: session.user.id,
        product_key: key,
        product_name: product.name,
        size_label: product.size,
        price_cents: product.priceCents,
        shipping_cents: product.shippingCents,
        ship_method: product.shipMethod,
        shipping_options: product.shippingOptions,
        athlete_name: key === "sports" ? (athlete || null) : null,
        city_name: key === "city" ? cityName : null,
        notes: notes || null,
        status: "pending_payment",
      }).select("id").single();
      if (ins.error) throw ins.error;

      if (key === "sports" && fileRef.current) {
        const ext = fileRef.current.name.split(".").pop() || "jpg";
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("customer-photos")
          .upload(path, fileRef.current, { upsert: false });
        if (up.error) throw up.error;
        const img = await supabase.from("order_images").insert({
          order_id: ins.data.id, storage_path: path, kind: "source",
        });
        if (img.error) throw img.error;
      }

      const fn = await supabase.functions.invoke("create-checkout", {
        body: { orderId: ins.data.id },
      });
      if (fn.error) throw fn.error;
      const url = (fn.data as { url?: string })?.url;
      if (!url) throw new Error("No checkout link returned.");
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 grid lg:grid-cols-[1fr_380px] gap-10">
      {/* LEFT — the sheet */}
      <div className="flex flex-col items-center">
        {key === "sports" ? (
          !hasPhoto ? (
            <label className="w-full max-w-md aspect-[2/3] bg-paper rounded-md
                              shadow-sheet border-2 border-dashed border-ink/25
                              flex flex-col items-center justify-center gap-3
                              cursor-pointer hover:border-ink/60 transition"
                   onDragOver={e => e.preventDefault()}
                   onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}>
              <span className="text-4xl">&#8679;</span>
              <span className="font-semibold">Drop a photo here, or click to choose</span>
              <span className="caption text-center px-6">
                Fill the frame with the athlete &mdash; action or posed both
                work. Skip distant, full-field shots.
              </span>
              <span className="caption opacity-80">
                Best at 1500&nbsp;px or larger on the short side
                (any recent phone photo)
              </span>
              <input type="file" accept="image/*" className="hidden"
                     onChange={e => onFile(e.target.files?.[0])} />
            </label>
          ) : (
            <>
              <canvas ref={canvasRef}
                      className="w-full max-w-md rounded-md shadow-sheet border border-ink/10" />
              {lowRes && (
                <p className="caption mt-3 text-center max-w-md"
                   style={{ color: "#b45309" }}>
                  This photo is {lowRes.w}&times;{lowRes.h}px &mdash; on the
                  small side. It will still plot, but a larger original keeps
                  the line detail crisp.
                </p>
              )}
              <label className="caption mt-4 cursor-pointer hover:text-ink">
                Use a different photo
                <input type="file" accept="image/*" className="hidden"
                       onChange={e => onFile(e.target.files?.[0])} />
              </label>
            </>
          )
        ) : (
          <div className="w-full max-w-md aspect-[4/5] bg-paper rounded-md shadow-sheet
                          border border-ink/10 p-8 flex flex-col justify-between">
            <div className="caption">City map art &middot; {PRODUCTS.city.size}</div>
            <div>
              <div className="text-3xl font-extrabold tracking-tight">
                {cityName.trim() ? cityName.toUpperCase() : "YOUR CITY"}
              </div>
              <p className="mt-3 text-ink/70">
                Plotted from real street data in the Grid &amp; Ink blueprint
                style. We email you the exact proof for approval before the
                pen touches paper.
              </p>
            </div>
            <img src="/logo.png" alt="" className="w-20 rounded-md self-end
                                                   border border-ink/20" />
          </div>
        )}
      </div>

      {/* RIGHT — the order */}
      <div className="bg-paper rounded-lg shadow-sheet border border-ink/10 p-7 h-fit">
        <div className="caption">Your piece</div>
        <h1 className="text-xl font-extrabold mt-1">{product.name}</h1>
        <div className="caption mt-1">
          {product.size} &middot; navy ink &middot; {product.framed ? "framed" : "secure tube"}
        </div>

        {key === "sports" ? (
          <label className="block mt-6 font-semibold text-sm">Athlete's name
            <input className="field mt-1" placeholder="e.g. TOM KID"
                   value={athlete}
                   onChange={e => setAthlete(e.target.value)}
                   onBlur={render} />
          </label>
        ) : (
          <>
            <label className="block mt-6 font-semibold text-sm">City or place
              <input className="field mt-1" placeholder="e.g. Austin, Texas"
                     value={cityName}
                     onChange={e => setCityName(e.target.value)} />
            </label>
            <label className="block mt-4 font-semibold text-sm">
              Anything special? <span className="caption font-normal">(optional)</span>
              <input className="field mt-1"
                     placeholder="Neighborhood to center on, a date, a title\u2026"
                     value={notes} onChange={e => setNotes(e.target.value)} />
            </label>
          </>
        )}

        <div className="border-t border-ink/10 mt-6 pt-5 space-y-1">
          <div className="flex justify-between text-sm">
            <span>{product.name}</span><span>{money(product.priceCents)}</span>
          </div>
          <div className="flex justify-between text-sm text-ink/70">
            <span>Shipping &mdash; {product.framed ? "framed flat pack" : "secure tube"}</span>
            <span>{product.shippingCents === 0 ? "Included" : money(product.shippingCents)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-lg pt-2">
            <span>Total</span>
            <span>{money(product.priceCents + product.shippingCents)}</span>
          </div>
        </div>

        {err && <div className="mt-4 text-accent text-sm font-semibold">{err}</div>}

        {session ? (
          <button className="btn-ink w-full mt-5" disabled={!ready || busy}
                  onClick={checkout}>
            {busy ? "Preparing checkout\u2026" : "Continue to payment"}
          </button>
        ) : (
          <Link to={`/auth?next=/create?product=${key}`} className="btn-ink w-full mt-5">
            Sign in to order
          </Link>
        )}
        <p className="caption mt-3">
          Secure payment by Stripe. {TURNAROUND}.
        </p>
        <button className="caption mt-4 underline underline-offset-4"
                onClick={() => nav("/")}>Back to home</button>
      </div>
    </div>
  );
}
