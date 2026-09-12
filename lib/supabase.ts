import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://yrrlbjzidjuvxpyvdrye.supabase.co";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_y9OQPouGZnEERdvj24E5BA_QtxqNIdy";

export const supabase = createClient(url, anonKey);
