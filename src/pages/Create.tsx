import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/App";
import { checkPhoto, type PhotoVerdict } from "@/lib/photocheck";
import SchoolPicker, { type SchoolPick } from "@/components/SchoolPicker";
import MapPicker, { type MapFrame } from "@/components/MapPicker";
import { PRODUCTS, TURNAROUND, type ProductKey, BRAND } from "@/config";
import Seo from "@/components/Seo";

/* One page, two flows:
   sports — upload a photo, see the one-line drawing live, checkout.
   city   — name the place; we plot from real street data and email a
            proof before pen touches paper. */
const INKS: [string, string][] = [
  ["Blue", "#082b4a"], ["Black", "#111111"], ["Green", "#0e7a5f"],
  ["Gold", "#c9a227"], ["Red", "#c1121f"],
];

function InkRow({ label, value, onPick }:
  { label: string; value: string; onPick: (c: string) => void }) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="caption w-24">{label}</span>
      <div className="flex gap-2">
        {INKS.map(([name, hex]) => (
          <button key={hex} type="button" title={name}
                  aria-label={name + " ink"}
                  onClick={() => onPick(hex)}
                  className={"h-7 w-7 rounded border-2 transition "
                    + (value === hex
                       ? "border-ink ring-2 ring-ink/30 scale-110"
                       : "border-ink/20 hover:border-ink/60")}
                  style={{ background: hex }} />
        ))}
      </div>
    </div>
  );
}

export default function Create() {
  const session = useSession();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const q = params.get("product");
  const key: ProductKey =
    q === "city" ? "city" : q === "custom" ? "custom" : "sports";
  const isPhoto = key !== "city";
  const [orient, setOrient] =
    useState<"portrait" | "landscape">(PRODUCTS[key].defaultOrientation);
  useEffect(() => { setOrient(PRODUCTS[key].defaultOrientation); }, [key]);
  const product = PRODUCTS[key];

  const fileRef = useRef<File | null>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [athlete, setAthlete] = useState("");
  const [cityName, setCityName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [lowRes, setLowRes] = useState<null | { w: number; h: number }>(null);
  const [line2, setLine2] = useState("");
  const logoRef = useRef<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoName, setLogoName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [colorMode, setColorMode] = useState<"single" | "two">("single");
  const [inkArt, setInkArt] = useState("#082b4a");
  const [inkText, setInkText] = useState("#082b4a");
  const [verdict, setVerdict] = useState<PhotoVerdict | null>(null);
  const [school, setSchool] = useState<SchoolPick | null>(null);
  const [sport, setSport] = useState("");
  const frameRef = useRef<(() => MapFrame) | null>(null);
  const [fly, setFly] = useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoNote, setGeoNote] = useState("");
  const [err, setErr] = useState("");

  const money = (c: number) =>
    (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

  function onFile(f: File | undefined | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("Please choose an image file."); return; }
    if (/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name)) {
      setErr("iPhone photos in HEIC format can't be read by most browsers. "
        + "On the iPhone, Share the photo and choose JPEG \u2014 or set "
        + "Settings \u2192 Camera \u2192 Formats \u2192 Most Compatible \u2014 "
        + "then upload that copy.");
      return;
    }
    setErr(""); fileRef.current = f;
    const img = new Image();
    img.onerror = () => {
      setErr("That photo couldn't be read by the browser. "
        + "A JPG or PNG version will work.");
    };
    img.onload = () => {
      const v = checkPhoto(img, f.size);
      setVerdict(v);
      setLowRes(null);
      setPhotoUrl(img.src);
      setHasPhoto(true);
    };
    img.src = URL.createObjectURL(f);
  }

  function onLogo(f: File | undefined | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("The logo should be an image file."); return; }
    setErr(""); logoRef.current = f;
    setLogoUrl(URL.createObjectURL(f)); setLogoName(f.name);
  }
  function clearLogo() {
    logoRef.current = null; setLogoUrl(""); setLogoName("");
  }

  async function findPlace() {
    const q = cityName.trim();
    if (q.length < 2) return;
    setGeoBusy(true); setGeoNote("");
    try {
      const r = await fetch("https://photon.komoot.io/api/?limit=1&q="
                            + encodeURIComponent(q));
      const j = await r.json();
      const c = j?.features?.[0]?.geometry?.coordinates;
      if (c) setFly({ lat: c[1], lng: c[0] });
      else setGeoNote("Couldn't find that place — try adding the state.");
    } catch {
      setGeoNote("Couldn't reach the place search — pan the map by hand.");
    }
    setGeoBusy(false);
  }

  const ready = isPhoto
    ? (hasPhoto && verdict?.level !== "reject")
    : cityName.trim().length > 1;

  async function checkout() {
    if (!session || !ready) return;
    setBusy(true); setErr("");
    try {
      const ins = await supabase.from("orders").insert({
        user_id: session.user.id,
        product_key: key,
        product_name: product.name,
        size_label: product.sizes[orient],
        ref_code: (() => { try {
          return localStorage.getItem("gridink_ref"); } catch { return null; }
        })(),
        price_cents: product.priceCents,
        shipping_cents: product.shippingCents,
        ship_method: product.shipMethod,
        shipping_options: product.shippingOptions,
        athlete_name: isPhoto ? (athlete || null) : null,
        line2: isPhoto ? (line2.trim() || null) : null,
        color_mode: isPhoto ? colorMode : null,
        ink_art: isPhoto ? (colorMode === "two" ? inkArt : inkText) : null,
        ink_text: isPhoto ? inkText : null,
        layout: null,
        school_name: school?.name ?? null,
        school_address: school?.address ?? null,
        sport: sport || null,
        photo_quality: verdict?.summary ?? null,
        map_frame: key === "city" && frameRef.current
          ? { v: 2, ...(() => { const f = frameRef.current!();
              return { bbox: f.bbox, center: f.center, zoom: f.zoom }; })(),
              orientation: orient, title: cityName.trim(),
              variant: "white-on-navy" }
          : null,
        city_name: key === "city" ? cityName : null,
        notes: notes || null,
        status: "pending_payment",
      }).select("id").single();
      if (ins.error) throw ins.error;

      if (isPhoto && fileRef.current) {
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

      if (isPhoto && logoRef.current) {
        const ext = logoRef.current.name.split(".").pop() || "png";
        const lpath = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const lup = await supabase.storage.from("customer-photos")
          .upload(lpath, logoRef.current, { upsert: false });
        if (lup.error) throw lup.error;
        const li = await supabase.from("order_images").insert({
          order_id: ins.data.id, storage_path: lpath, kind: "logo",
        });
        if (li.error) throw li.error;
      }

      const fn = await supabase.functions.invoke("create-checkout", {
        body: { orderId: ins.data.id },
      });
      if (fn.error) throw fn.error;
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
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 grid lg:grid-cols-[1fr_380px] gap-10">
      <Seo
        title="Create Your Hand-Plotted Piece — Grid & Ink Co."
        description="Upload a photo or pick a city, choose inks and layout, and we plot your one-of-one line art on archival paper. $98, shipping included."
        path="/create"
      />
      {/* LEFT — the sheet */}
      <div className="flex flex-col items-center">
        {isPhoto ? (
          !hasPhoto ? (
            <label className="w-full max-w-md aspect-[2/3] bg-paper rounded-md
                              shadow-sheet border-2 border-dashed border-ink/25
                              flex flex-col items-center justify-center gap-3
                              cursor-pointer hover:border-ink/60 transition"
                   onDragOver={e => e.preventDefault()}
                   onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}>
              <span className="text-4xl">&#8679;</span>
              <span className="font-semibold text-center px-4">Drop a photo here, or click to choose</span>
              <span className="caption text-center px-6">
                {key === "custom"
                  ? "A clean side or three-quarter view works best. Get the whole subject in frame, nothing cropped."
                  : "Fill the frame with the athlete. Action or posed both work; skip distant, full-field shots."}</span>
              <span className="caption opacity-80 text-center px-6">
                The original photo from your camera roll &mdash; 1500&nbsp;px
                or larger on the short side. Not a screenshot, not a frame
                grabbed from a video, not a zoomed-in crop. We check it
                before you can order.
              </span>
              <input type="file" accept="image/*" className="hidden"
                     onChange={e => onFile(e.target.files?.[0])} />
            </label>
          ) : (
            <>
              <div className="w-full max-w-md">
                <div className="caption">Your photo</div>
                <div className="mt-2 rounded-md overflow-hidden border
                                border-ink/15 bg-paper">
                  <img src={photoUrl} alt="The photo you uploaded"
                       className="block w-full h-auto" draggable={false} />
                </div>

                {verdict && (
                  <div className={"mt-3 rounded-md border px-4 py-3 "
                    + (verdict.level === "reject"
                       ? "border-[#c1121f]/40 bg-[#c1121f]/5"
                       : verdict.level === "warn"
                       ? "border-[#b45309]/40 bg-[#b45309]/5"
                       : "border-ink/15 bg-paper")}>
                    <div className="font-semibold text-sm">
                      {verdict.headline}
                    </div>
                    {verdict.reasons.map((r, i) => (
                      <p key={i} className="caption mt-1">{r}</p>
                    ))}
                    {verdict.level === "reject" && (
                      <p className="caption mt-2">
                        Please upload the original photo from the camera
                        roll &mdash; not a screenshot, not a frame from a
                        video, not a zoomed-in crop.
                      </p>
                    )}
                  </div>
                )}

                <label className="caption mt-3 inline-block cursor-pointer
                                  underline hover:text-ink">
                  Use a different photo
                  <input type="file" accept="image/*" className="hidden"
                         onChange={e => onFile(e.target.files?.[0])} />
                </label>

                <div className="mt-8 border-t border-ink/10 pt-6">
                  <div className="font-semibold text-sm">
                    What the pen makes of it
                  </div>
                  <p className="caption mt-1">
                    We don&rsquo;t show a fake preview &mdash; these are real
                    plotted pieces. Yours is drawn from your photo in the
                    same hand.
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {["/gallery/hero-basketball.jpg",
                      "/gallery/hero-football.jpg",
                      "/gallery/hero-defender.jpg"].map(src => (
                      <div key={src}
                           className="rounded border border-ink/15 bg-white
                                      overflow-hidden">
                        <img src={src} alt="A finished plotted piece"
                             className="block w-full h-28 object-cover"
                             draggable={false} />
                      </div>
                    ))}
                  </div>
                  <p className="caption mt-4">
                    <span className="font-semibold">Before we plot yours,</span>
                    {" "}we send a proof of the actual artwork &mdash; the
                    real line art, your lettering, your logo &mdash; and
                    nothing goes on paper until you approve it.
                  </p>
                </div>
              </div>
            </>
          )
        ) : (
          <div className="flex flex-col items-center">
            <MapPicker frameRef={frameRef} fly={fly} title={cityName}
                       orientation={orient} />
            <p className="caption mt-3 text-center max-w-md">
              Search your place, then drag and zoom until the frame holds
              exactly the streets you want &mdash; the finished piece is
              plotted from real street data in white ink on deep navy
              stock.
            </p>
          </div>
        )}
      </div>

      {/* RIGHT — the order */}
      <div className="bg-paper rounded-lg shadow-sheet border border-ink/10 p-7 h-fit">
        <div className="caption">Your piece</div>
        <h1 className="text-xl font-extrabold mt-1">{product.name}</h1>
        <div className="caption mt-1">
          {product.sizes[orient]} &middot; {product.inkLabel} &middot; {product.framed ? "framed" : "secure tube"}
        </div>

        <div className="mt-5">
          <div className="font-semibold text-sm">Orientation</div>
          <div className="flex gap-2 mt-2">
            {(["portrait", "landscape"] as const).map(o => (
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

        {isPhoto ? (
          <>
          <label className="block mt-6 font-semibold text-sm">
            {key === "custom" ? "Title line" : "Athlete's name"}
            <input className="field mt-1" placeholder={key === "custom" ? "e.g. 1972 FORD BRONCO" : "e.g. TOM KID"}
                   maxLength={24}
                   value={athlete}
                   onChange={e => setAthlete(e.target.value)} />
            <span className="caption block text-right mt-1">
              {athlete.length}/24
            </span>
          </label>
          <label className="block mt-2 font-semibold text-sm">
            School, team, or a short line{" "}
            <span className="caption font-normal">(optional)</span>
            <input className="field mt-1"
                   placeholder={key === "custom" ? "e.g. 302 V8 \u2014 UNCUT" : "e.g. EAGLES — 14U LEAGUE MVP"}
                   maxLength={30}
                   value={line2}
                   onChange={e => setLine2(e.target.value)} />
            <span className="caption block text-right mt-1">
              {line2.length}/30 &middot; drawn in varsity lettering
            </span>
          </label>
          {key === "sports" && (
            <div className="mt-5">
              <div className="font-semibold text-sm">
                School or club{" "}
                <span className="caption font-normal">(optional)</span>
              </div>
              <p className="caption mt-1">
                Tell us which one and we&rsquo;ll source the crest
                ourselves &mdash; you&rsquo;ll see it on the proof before
                anything is plotted.
              </p>
              <SchoolPicker value={school} onPick={setSchool} />
              {school && (
                <label className="block mt-3 font-semibold text-sm">
                  Sport
                  <select className="field mt-1" value={sport}
                          onChange={e => setSport(e.target.value)}>
                    <option value="">Choose a sport…</option>
                    {["Football", "Basketball", "Baseball", "Softball",
                      "Soccer", "Volleyball", "Track & Field",
                      "Cross Country", "Wrestling", "Swimming", "Tennis",
                      "Golf", "Lacrosse", "Hockey", "Cheer", "Other"]
                      .map(x => <option key={x} value={x}>{x}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}

          <div className="mt-5">
            <div className="font-semibold text-sm">
              Your own logo file{" "}
              <span className="caption font-normal">(optional)</span>
            </div>
            {!logoUrl ? (
              <label className="mt-1 flex items-center gap-3 border border-dashed
                                border-ink/25 rounded-md px-4 py-3 cursor-pointer
                                hover:border-ink/60 transition">
                <span className="text-xl leading-none">&#65291;</span>
                <span className="caption">
                  Only if you have one &mdash; PNG or JPG, a simple crest
                  or mascot plots best
                </span>
                <input type="file" accept="image/*" className="hidden"
                       onChange={e => onLogo(e.target.files?.[0])} />
              </label>
            ) : (
              <div className="mt-1 flex items-center gap-3">
                <img src={logoUrl} alt="Logo preview"
                     className="h-12 w-12 object-contain rounded border
                                border-ink/15 bg-white" />
                <span className="caption flex-1 truncate">{logoName}</span>
                <button type="button" className="caption underline"
                        onClick={clearLogo}>
                  Remove
                </button>
              </div>
            )}
          </div>
          <div className="mt-5">
            <div className="font-semibold text-sm">Ink colors</div>
            <div className="mt-2 flex gap-2">
              {(["single", "two"] as const).map(m => (
                <button key={m} type="button"
                        onClick={() => { setColorMode(m);
                          if (m === "single") setInkArt(inkText); }}
                        className={"px-3 py-1.5 rounded-md border text-sm font-semibold transition "
                          + (colorMode === m
                             ? "border-ink bg-ink text-paper"
                             : "border-ink/25 hover:border-ink")}>
                  {m === "single" ? "One color" : "Two colors"}
                </button>
              ))}
            </div>
            <InkRow label={colorMode === "two"
                            ? "Text & logo" : "Everything"}
                    value={inkText}
                    onPick={c => { setInkText(c);
                      if (colorMode === "single") setInkArt(c); }} />
            {colorMode === "two" && (
              <InkRow label="Artwork" value={inkArt} onPick={setInkArt} />
            )}
          </div>
          </>
        ) : (
          <>
            <label className="block mt-6 font-semibold text-sm">City or place
              <input className="field mt-1" placeholder="e.g. Austin, Texas"
                     value={cityName}
                     onChange={e => setCityName(e.target.value)}
                     onKeyDown={e => { if (e.key === "Enter") findPlace(); }} />
            </label>
            <button type="button" className="btn-ink mt-3 !py-2 text-sm"
                    disabled={geoBusy || cityName.trim().length < 2}
                    onClick={findPlace}>
              {geoBusy ? "Finding…" : "Find it on the map"}
            </button>
            {geoNote && <p className="caption mt-2">{geoNote}</p>}
            <p className="caption mt-3">
              Drawn as your title on the piece &middot; white ink on deep
              navy stock
            </p>
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
            <span>Included</span>
          </div>
          <div className="caption">
            US shipping only &middot; international assessed per order
            &mdash; <a className="underline"
                       href={"mailto:" + BRAND.email}>email us first</a>
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
        {session && !ready && (
          <p className="caption mt-2 text-center">
            {isPhoto
              ? (verdict?.level === "reject"
                 ? "Upload a higher-quality photo to unlock checkout."
                 : "Add a photo above to unlock checkout.")
              : "Enter your city above to unlock checkout."}
          </p>
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
