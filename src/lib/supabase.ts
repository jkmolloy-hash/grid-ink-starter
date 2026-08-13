import { createClient } from "@supabase/supabase-js";

/* The publishable key class is DESIGNED to ship in the client bundle —
   row-level security is the wall, not key secrecy. Environment values
   still override these defaults when a host provides them. */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  || "https://gljzhupmbjoyphrtglbz.supabase.co";
const anon = ((import.meta.env.VITE_SUPABASE_ANON_KEY
  ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined)
  || "sb_publishable_3jHI3Rv9CICRHqItyzHfwQ_lws6dxU3";

export const supabase = createClient(url, anon);
