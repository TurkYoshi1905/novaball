import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  console.error(
    "[NovaBall] VITE_SUPABASE_URL veya VITE_SUPABASE_ANON_KEY eksik.\n" +
    "Replit Secrets bölümünde bu değişkenleri ekleyin."
  );
}

export const supabase = createClient(url ?? "", key ?? "");
