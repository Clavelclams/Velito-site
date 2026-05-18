/**
 * Supabase admin client — usage SERVEUR uniquement avec SERVICE_ROLE.
 *
 * Cle utilisee : SUPABASE_SERVICE_ROLE_KEY (SECRETE, jamais exposer cote client).
 * Bypass TOTAL des Row Level Security policies.
 *
 * Quand l'utiliser :
 *   - Route Handler admin qui cree un evenement (apres avoir verifie l'auth)
 *   - Route Handler /api/scan qui cree participant + presence (anon mais
 *     on veut controler les inserts cote serveur pour eviter les abus)
 *   - Rapports admin qui lisent participants + presences (RLS bloque anon
 *     en SELECT, seul service_role peut tout lire)
 *
 * Quand NE PAS l'utiliser :
 *   - JAMAIS cote navigateur (la cle fuirait dans le bundle JS)
 *   - JAMAIS dans un Server Component qui render du HTML pour l'user
 *     (utilise server.ts pour respecter les permissions de l'user)
 *   - JAMAIS sans avoir d'abord verifie via server.ts que l'appelant
 *     a les droits (pour les routes admin)
 *
 * Securite : ce fichier importe une env var SECRETE. Verifier que `next.config.js`
 * ne l'expose pas en `env: {}`, et que la cle n'est jamais reference dans un
 * fichier 'use client'.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "[supabase/admin] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante dans .env.local"
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      // Pas de persistance de session cote admin -- ce client est sans etat.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
