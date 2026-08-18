import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/App";
import { BRAND } from "@/config";

export default function Nav() {
  const session = useSession();
  const nav = useNavigate();
  const [studio, setStudio] = useState(false);
  useEffect(() => {
    if (!session) { setStudio(false); return; }
    supabase.rpc("is_studio").then(r => setStudio(!!r.data));
  }, [session]);
  const [shopOpen, setShopOpen] = useState(false);
  const shopRef = useRef<HTMLDivElement>(null);
  const hoverT = useRef<number | null>(null);
  /* Only devices with a real hover (mouse/trackpad) get hover-to-open;
     on touch the menu keeps working by tap. */
  const canHover =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(hover: hover)").matches;
  useEffect(() => () => {
    if (hoverT.current) window.clearTimeout(hoverT.current);
  }, []);
  useEffect(() => {
    if (!shopOpen) return;
    const close = (e: MouseEvent) => {
      if (shopRef.current && !shopRef.current.contains(e.target as Node)) {
        setShopOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [shopOpen]);
  return (
    <>
    <div className="bg-ink text-paper">
      <div className="max-w-6xl mx-auto px-5 py-2 flex flex-wrap gap-x-8 gap-y-1
                      justify-center font-mono text-[11px] tracking-[0.14em] uppercase">
        <span>Plotted to order</span>
        <span className="opacity-40">&middot;</span>
        <span>Archival paper &amp; inks</span>
        <span className="opacity-40 hidden sm:inline">&middot;</span>
        <span className="hidden sm:inline">Every piece one of one</span>
      </div>
    </div>
    <header className="bg-paper border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-9 w-auto rounded-[6px]" />
          <span className="font-display font-bold tracking-tight text-lg">{BRAND.name}</span>
          <span className="caption hidden sm:inline">{BRAND.tagline}</span>
        </Link>
        <nav className="flex items-center gap-5">
          <div className="relative" ref={shopRef}
               onMouseEnter={() => {
                 if (!canHover) return;
                 if (hoverT.current) window.clearTimeout(hoverT.current);
                 setShopOpen(true);
               }}
               onMouseLeave={() => {
                 if (!canHover) return;
                 hoverT.current = window.setTimeout(
                   () => setShopOpen(false), 180);
               }}>
            <button
              className="font-semibold hover:underline underline-offset-4
                         flex items-center gap-1"
              aria-haspopup="true" aria-expanded={shopOpen}
              onClick={() => setShopOpen(v => !v)}
            >
              Create yours
              <span className={"text-xs transition-transform " +
                               (shopOpen ? "rotate-180" : "")}>&#9662;</span>
            </button>
            {shopOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-lg
                              border border-ink/10 bg-paper shadow-sheet z-50 py-2">
                {[
                  { to: "/create?product=sports", label: "Sports Line Art",
                    note: "The main event" },
                  { to: "/create?product=city", label: "City Maps",
                    note: "Any place on earth" },
                  { to: "/create?product=custom", label: "Custom",
                    note: "Bring us your idea" },
                ].map(p => (
                  <Link key={p.label} to={p.to}
                        onClick={() => setShopOpen(false)}
                        className="block px-4 py-2 hover:bg-ink/5">
                    <div className="font-semibold">{p.label}</div>
                    <div className="caption">{p.note}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link to="/contact" className="font-semibold hover:underline underline-offset-4">
            Contact
          </Link>
          {studio && (
            <Link to="/studio"
                  className="font-semibold hover:underline underline-offset-4">
              Studio
            </Link>
          )}
          {session ? (
            <>
              <Link to="/account" className="font-semibold hover:underline underline-offset-4">
                My orders
              </Link>
              <button
                className="caption hover:text-ink"
                onClick={async () => { await supabase.auth.signOut(); nav("/"); }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-ghost !px-4 !py-2">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
    </>
  );
}
