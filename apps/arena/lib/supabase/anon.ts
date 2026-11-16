/**
 * Supabase ANONYME, sans cookie — pour l'API publique /api/v1 (14/11/2026).
 *
 * Pourquoi pas lib/supabase/server.ts : il lit les cookies de session. Un
 * développeur qui appelle l'API depuis un navigateur où il est connecté en
 * staff aurait alors lu avec SES droits (brouillons compris). Ici, jamais de
 * session : l'API voit exactement ce que voit un visiteur, la RLS publique
 * s'applique, quelle que soit la clé.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getAnonClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cle) {
    throw new Error("Config Supabase manquante (arena) : SUPABASE_URL et SUPABASE_ANON_KEY");
  }
  client = createClient(url, cle, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
