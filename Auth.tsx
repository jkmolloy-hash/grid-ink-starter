import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/App";

export default function Auth() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";
  const session = useSession();
  /* The moment this browser has a session — whether they signed in here or
     clicked the verification email in another tab — carry them back. */
  useEffect(() => { if (session) nav(next); }, [session, nav, next]);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true); setMsg("");
    const { data, error } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    if (mode === "signup" && !data.session) {
      setMsg("Almost done \u2014 we just emailed you a verification link. "
        + "Click it to activate your account. Everything you were working "
        + "on is saved and will be right where you left it.");
      setMode("signin");
      return;
    }
    nav(next);
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
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
