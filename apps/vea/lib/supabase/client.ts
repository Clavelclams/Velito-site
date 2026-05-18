/**
 * Supabase client — usage NAVIGATEUR (cote 'use client').
 *
 * Cle utilisee : NEXT_PUBLIC_SUPABASE_ANON_KEY (publique, OK expose).
 * Respecte les Row Level Security policies definies dans le SQL migration.
 *
 * Quand l'utiliser :
 *   - Dans un composant React 'use client' qui doit lire / s'abonner a Supabase
 *   - Pour gerer une session auth cote client (login form, hook useSession)
 *   - Pour des operations qui doivent passer par la RLS (donc lecture publique
 *     de la table `evenements`, et c'est tout pour VEA)
 *
 * Quand NE PAS l'utiliser :
 *   - Cote server (route handler, server component) -> utilise server.ts
 *   - Pour ecrire dans participants/presences/evenements -> utilise admin.ts
 *     (les ecritures passent par /api/* qui valide + utilise service_role)
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
