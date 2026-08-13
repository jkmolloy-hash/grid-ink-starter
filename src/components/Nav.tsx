import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/App";
import { BRAND } from "@/config";

export default function Nav() {
  const session = useSession();
  const nav = useNavigate();
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
          <Link to="/create" className="font-semibold hover:underline underline-offset-4">
            Create yours
          </Link>
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
