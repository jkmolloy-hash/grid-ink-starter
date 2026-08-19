import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Seo from "@/components/Seo";

export default function Auth() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true); setMsg("");
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    if (mode === "signup") setMsg("Account created \u2014 you're signed in.");
    nav(next);
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <Seo title="Sign in — Grid & Ink Co." description="Sign in to your Grid & Ink Co. account to follow your piece from proof to shipped." path="/auth" noindex />
      <div className="bg-paper rounded-lg shadow-sheet border border-ink/10 p-8">
        <div className="caption">Grid &amp; Ink account</div>
        <h1 className="text-2xl font-extrabold mt-1">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <label className="block mt-6 font-semibold text-sm">Email
          <input className="field mt-1" type="email" value={email}
                 onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="block mt-4 font-semibold text-sm">Password
<div className="relative">
                      <input className="field mt-1 pr-16" type={showPw ? "text" : "password"} value={password}
                 onChange={e => setPassword(e.target.value)} />
            <button type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               caption underline"
                    onClick={() => setShowPw(v => !v)}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        {msg && <div className="mt-4 text-sm font-semibold text-accent">{msg}</div>}
        <button className="btn-ink w-full mt-6" disabled={busy || !email || !password}
                onClick={go}>
          {busy ? "One moment\u2026" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button className="caption mt-4 underline underline-offset-4"
                onClick={() => setMode(m => m === "signin" ? "signup" : "signin")}>
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
