import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { NibMark } from "@/components/NibMark";

export default function NewsletterBand() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const join = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setState("error"); return; }
    setState("busy");
    const { error } = await supabase
      .from("newsletter_signups").insert({ email: email.trim().toLowerCase() });
    if (!error || error.code === "23505") setState("done");  // duplicate = already in
    else setState("error");
  };
  return (
    <section id="newsletter" className="bg-paper border-t border-ink/10">
      <div className="max-w-3xl mx-auto px-5 py-14 text-center">
        <NibMark className="w-10 text-ink/60 mx-auto" />
        <h2 className="font-display text-2xl font-bold mt-3">
          Join the list &mdash; 10% off your first piece
        </h2>
        <p className="text-ink/70 mt-2">
          Launch offers, new lines, and the vote for the next city map.
        </p>
        {state === "done" ? (
          <div className="mt-6 font-mono text-sm text-ink">
            You&rsquo;re on the list. Take 10% off your first piece with
            code <strong>WELCOME10</strong> at checkout.
          </div>
        ) : (
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <input className="field max-w-xs" type="email" value={email}
                   placeholder="you@example.com"
                   onChange={e => { setEmail(e.target.value); setState("idle"); }}
                   onKeyDown={e => e.key === "Enter" && join()} />
            <button className="btn-ink" disabled={state === "busy"} onClick={join}>
              {state === "busy" ? "Joining\u2026" : "Subscribe"}
            </button>
          </div>
        )}
        {state === "error" && (
          <div className="caption !text-accent mt-3">
            That didn&rsquo;t save &mdash; check the address and try again.
          </div>
        )}
      </div>
    </section>
  );
}
