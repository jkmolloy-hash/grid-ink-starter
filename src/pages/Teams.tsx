/* The pitch page — aimed at the one person who can say yes: a coach,
   a booster parent, a team mom. Not a store. One example, the deal in
   plain words, and a short form. Individual team pages stay unlisted. */
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Seo from "@/components/Seo";

export default function Teams() {
  const [team, setTeam] = useState("");
  const [sport, setSport] = useState("");
  const [season, setSeason] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const ready = team.trim().length > 1 && email.trim().includes("@")
                && name.trim().length > 1;

  async function send() {
    if (!ready || state === "sending") return;
    setState("sending");
    const body = [
      `TEAM ENQUIRY`,
      `Team: ${team.trim()}`,
      `Sport: ${sport.trim() || "—"}`,
      `Season / record: ${season.trim() || "—"}`,
      ``,
      message.trim() || "(no message)",
    ].join("\n");
    const r = await supabase.from("contact_messages").insert({
      name: name.trim(), email: email.trim().toLowerCase(),
      message: body.slice(0, 2000),
    });
    setState(r.error ? "error" : "sent");
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-14">
      <Seo title="For Teams | Grid & Ink Co." description="A hand-plotted team piece every family wants — and the team earns 20%. No upfront cost, no unsold merchandise. Start a team run." path="/teams" />
      <div className="caption">Grid & Ink Co. · for teams</div>
      <h1 className="font-display text-3xl font-bold mt-1">
        A team piece every family wants — and the team earns 20%
      </h1>
      <p className="mt-3 text-ink/70 max-w-2xl">
        We draw your team once: the players in line art, the whole roster
        lettered by hand, the record and the title. Then every family can
        order their own copy from a page made just for your team. No
        upfront cost, no boxes of unsold merchandise, nothing for the
        coach to manage.
      </p>

      <div className="mt-10">
        <div className="bg-[#17191c] p-[10px] rounded shadow-sheet">
          <div className="bg-white p-4">
            <img src="/gallery/sports-example.jpg"
                 alt="Example team line-art piece"
                 className="block w-full h-auto" draggable={false} />
          </div>
        </div>
        <p className="caption mt-3">
          An 8-0 season, twenty-four names, two pens. Plotted, not printed.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {[
          ["1. We draw the team",
           "Send a photo or two and the roster. We plot the piece and "
           + "send you a proof before anything goes out."],
          ["2. Families order",
           "Your team gets its own page with a link you share in the "
           + "group chat. It stays open for a set window, then closes."],
          ["3. The team gets paid",
           "20% of every piece sold comes back to the team or booster "
           + "club, paid after the run closes."],
        ].map(([h, p]) => (
          <div key={h}>
            <div className="font-display font-bold text-lg">{h}</div>
            <p className="mt-2 text-ink/70">{p}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-paper rounded-lg border border-ink/10 shadow-sheet p-7">
        <div className="font-display font-bold text-xl">
          What families get
        </div>
        <p className="mt-2 text-ink/70">
          A hand-plotted piece at $98, framed, US shipping included
          — in portrait or landscape. Every name on the roster is
          lettered by hand, so every family&rsquo;s copy has their player
          on it.
        </p>
      </div>

      <h2 className="font-display text-2xl font-bold mt-14">
        Start a team run
      </h2>

      {state === "sent" ? (

        <p className="mt-4 text-ink/75">

          Got it &mdash; thank you. We&rsquo;ll be in touch shortly to talk

          through the artwork and set your dates.

        </p>

      ) : (

        <div className="mt-4 grid gap-4 sm:grid-cols-2 max-w-2xl">

          <label className="block font-semibold text-sm">

            Team

            <input className="field mt-1" maxLength={80} value={team}

                   placeholder="e.g. CRMS Football — Blue"

                   onChange={e => setTeam(e.target.value)} />

          </label>

          <label className="block font-semibold text-sm">

            Sport

            <input className="field mt-1" maxLength={40} value={sport}

                   placeholder="e.g. Football"

                   onChange={e => setSport(e.target.value)} />

          </label>

          <label className="block font-semibold text-sm">

            Season or record

            <input className="field mt-1" maxLength={60} value={season}

                   placeholder="e.g. 25/26 — 8-0, district champions"

                   onChange={e => setSeason(e.target.value)} />

          </label>

          <label className="block font-semibold text-sm">

            Your name

            <input className="field mt-1" maxLength={60} value={name}

                   onChange={e => setName(e.target.value)} />

          </label>

          <label className="block font-semibold text-sm sm:col-span-2">

            Email

            <input className="field mt-1" maxLength={120} value={email}

                   onChange={e => setEmail(e.target.value)} />

          </label>

          <label className="block font-semibold text-sm sm:col-span-2">

            Anything else

            <textarea className="field mt-1 h-28" maxLength={1200}

                      value={message}

                      placeholder={"Roster size, when your season ends, "

                        + "what you have in mind"}

                      onChange={e => setMessage(e.target.value)} />

          </label>

          <div className="sm:col-span-2">

            <button className="btn" disabled={!ready || state === "sending"}

                    onClick={send}>

              {state === "sending" ? "Sending…" : "Send enquiry"}

            </button>

            {!ready && (

              <span className="caption ml-3">

                Team, your name and email unlock the button.

              </span>

            )}

            {state === "error" && (

              <p className="caption mt-2 text-[#c1121f]">

                That didn&rsquo;t send. Try again, or email the studio.

              </p>

            )}

          </div>

        </div>

      )}
    </div>
  );
}
