import { useEffect, useState, createContext, useContext } from "react";
import { Routes, Route } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Index from "@/pages/Index";
import Create from "@/pages/Create";
import Auth from "@/pages/Auth";
import Account from "@/pages/Account";
import Studio from "@/pages/Studio";
import Contact from "@/pages/Contact";

const SessionCtx = createContext<Session | null>(null);
export const useSession = () => useContext(SessionCtx);

// Referral capture: a visit via /?ref=rashad is remembered for 90 days
// and stamped on any order this browser places. No code, no discount —
// pure attribution for commission sellers.
(() => {
  try {
    const r = new URLSearchParams(window.location.search).get("ref");
    if (r) {
      localStorage.setItem("gridink_ref",
        r.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40));
      localStorage.setItem("gridink_ref_at", String(Date.now()));
    } else {
      const at = +(localStorage.getItem("gridink_ref_at") ?? 0);
      if (at && Date.now() - at > 90 * 864e5) {
        localStorage.removeItem("gridink_ref");
        localStorage.removeItem("gridink_ref_at");
      }
    }
  } catch { /* private browsing: attribution just doesn't persist */ }
})();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e, s) => setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return (
    <SessionCtx.Provider value={session}>
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/create" element={<Create />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/account" element={<Account />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </SessionCtx.Provider>
  );
}
