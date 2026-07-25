/**
 * Supabase service_role — SERVER-ONLY (écritures staff ARENA).
 *
 * Pourquoi : le cadrage V1 (§ RLS) a choisi de faire passer les écritures
 * sensibles (création de joueurs jour J, insertion du bracket, scores, logs)
 * par des Server Actions avec service_role, APRÈS vérification explicite que
 * l'utilisateur est bien membre staff de l'organisation (lib/arena/auth.ts).
 * C'est plus simple à auditer que des policies RLS d'écriture complexes.
 *
 * ⚠️ RÈGLES ABSOLUES (mêmes que le hub) :
 *  - Jamais importé depuis un composant "use client"
 *  - SUPABASE_SERVICE_ROLE_KEY = secret absolu (env Sensitive sur Vercel)
 *  - Toute action qui utilise ce client DOIT vérifier les droits AVANT d'écrire
 */
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Config Supabase manquante : SUPABASE_URL non défini");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Config Supabase manquante : SUPABASE_SERVICE_ROLE_KEY non défini (requis pour les écritures staff ARENA)."
    );
  }

  cachedClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return cachedClient;
}
