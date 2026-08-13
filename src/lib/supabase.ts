import { createClient } from "@supabase/supabase-js";

/* Hardcoded on purpose. The publishable key class is DESIGNED to ship
   in the client bundle — row-level security is the wall, not key
   secrecy. We deliberately do NOT read environment variables here:
   the hosting platform injects stale credentials from an old
   integration at build time, and any env-override logic lets those
   stale values win, breaking auth with "Invalid API key". Hardcoding
   makes the connection deterministic on every host. */
export const supabase = createClient(
  "https://gljzhupmbjoyphrtglbz.supabase.co",
  "sb_publishable_3jHI3Rv9CICRHqItyzHfwQ_lws6dxU3",
);
