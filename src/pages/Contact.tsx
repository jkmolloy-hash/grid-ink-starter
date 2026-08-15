/* Contact — a small form whose submissions land in the Studio inbox,
   with a plain-email fallback for people who prefer their own client. */
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { BRAND } from "@/config";
import Seo from "@/components/Seo";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function send() {
    if (name.trim().length < 1 ||
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
        message.trim().length < 1) { setState("error"); return; }
    setState("busy");
    const r = await supabase.from("contact_messages").insert({
      name: name.trim(), email: email.trim().toLowerCase(),
      message: message.trim().slice(0, 2000),
    });
    setState(r.error ? "error" : "sent");
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-14">
      <Seo title="Contact the Studio | Grid & Ink Co." description="Questions about a commission, sizing, or an order in progress? Message the Grid & Ink Co. studio and we'll reply from the bench." path="/contact" />
      <div className="caption">Grid &amp; Ink Co.</div>
      <h1 className="font-display text-3xl font-bold mt-1">Contact the studio</h1>
      <p className="mt-3 text-ink/70">
        Questions about a piece, an order, international shipping, or a
        custom idea &mdash; write it here and it lands straight on the
        studio bench.
      </p>

      {state === "sent" ? (
        <div className="mt-8 bg-paper rounded-lg border border-ink/10
                        shadow-sheet p-7">
          <div className="font-display font-bold text-lg">
            Message received.
          </div>
          <p className="mt-2 text-ink/70">
            We read everything and reply from {BRAND.email} &mdash;
            usually within a day.
          </p>
        </div>
      ) : (
        <div className="mt-8 bg-paper rounded-lg border border-ink/10
                        shadow-sheet p-7">
          <label className="block font-semibold text-sm">Your name
            <input className="field mt-1" value={name}
                   maxLength={120}
                   onChange={e => setName(e.target.value)} />
          </label>
          <label className="block mt-4 font-semibold text-sm">Email
            <input className="field mt-1" type="email" value={email}
                   maxLength={200}
                   onChange={e => setEmail(e.target.value)} />
          </label>
          <label className="block mt-4 font-semibold text-sm">Message
            <textarea className="field mt-1 w-full" rows={5} value={message}
                      maxLength={2000}
                      onChange={e => setMessage(e.target.value)} />
          </label>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button className="btn-ink" disabled={state === "busy"}
                    onClick={send}>
              {state === "busy" ? "Sending\u2026" : "Send to the studio"}
            </button>
            <a className="caption underline"
               href={"mailto:" + BRAND.email}>
              Prefer email? {BRAND.email}
            </a>
          </div>
          {state === "error" && (
            <p className="mt-3 text-sm" style={{ color: "#b00020" }}>
              Check the fields and try again &mdash; or use the email link.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
