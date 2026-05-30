/**
 * Supabase service_role client — SERVER-ONLY.
 *
 * Pourquoi ce client séparé : les tables `shared.oauth_*` ont RLS activée sans
 * AUCUNE policy (server-only par design). Donc le client anon/authenticated NE
 * peut RIEN lire. Pour les opérations OAuth (lookup client, vérifier code,
 * écrire refresh token, lire JWKS), il faut un client avec `service_role` key
 * qui bypass RLS.
 *
 * ⚠️ SÉCURITÉ — RÈGLES ABSOLUES :
 *  - Ce module NE doit JAMAIS être importé depuis du code client ("use client")
 *  - Ce module NE doit JAMAIS être inclus dans le bundle navigateur
 *  - `SUPABASE_SERVICE_ROLE_KEY` est un secret absolu (équivalent root de la DB)
 *  - À configurer comme env "Sensitive" sur Vercel (pas NEXT_PUBLIC_*)
 *
 * Si un attaquant met la main sur cette clé : il peut tout lire, tout écrire,
 * tout supprimer dans la DB Supabase. Il faut la rotater immédiatement si fuite.
 *
 * Usage : uniquement dans les Route Handlers et Server Components des endpoints
 * OAuth (lib/oauth/*, app/oauth/*, app/.well-known/*).
 */
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Type alias : SupabaseClient typé avec NOTRE Database, schema "shared" par défaut.
 * Pour le jury : ça permet à TS d'inférer le shape de chaque row dès qu'on appelle
 * .from("oauth_clients") — plus besoin d'annoter chaque .maybeSingle<T>().
 */
type ServiceClient = SupabaseClient<Database, "shared">;

let cachedClient: ServiceClient | null = null;

/**
 * Retourne un client Supabase configuré avec service_role + Database type.
 * Cache le client pour éviter de re-créer à chaque call (perf).
 */
export function getServiceClient(): ServiceClient {
  if (cachedClient) return cachedClient;

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Config Supabase manquante : SUPABASE_URL non défini");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Config Supabase manquante : SUPABASE_SERVICE_ROLE_KEY non défini. " +
        "Ce secret est requis pour les opérations OAuth (RLS bypass). " +
        "À ajouter dans .env.local (dev) et dans Vercel env Sensitive (prod)."
    );
  }

  cachedClient = createSupabaseClient<Database, "shared">(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        // Pas de session côté server : on est en mode admin, pas de user.
        autoRefreshToken: false,
        persistSession: false,
      },
      // Toutes les opérations sur le schéma `shared` (pas public).
      db: { schema: "shared" },
    }
  );

  return cachedClient;
}
