import { createClient } from "@supabase/supabase-js";

/* Lovable injects these automatically once you connect Supabase in
   the Lovable project settings; nothing to edit here. */
const url = import.meta.env.VITE_SUPABASE_URL as string;
// Accept either key name: our original, or the one Lovable's scaffold
// writes (Supabase's newer "publishable" naming). Same key class —
// public by design, guarded by row-level security.
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

if (!url || !anon) {
  // Never white-screen the storefront over configuration: browsing must
  // survive; only auth/checkout fail, loudly, when actually attempted.
  console.warn(
    "Supabase env missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) — "
    + "connect Supabase in Lovable's settings. Auth is disabled until then.");
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "public-anon-key-placeholder");
