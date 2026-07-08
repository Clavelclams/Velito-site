/**
 * Client Supabase — NAVIGATEUR.
 * Même pattern que apps/hub/src/lib/supabase/client.ts.
 *
 * Utilisé uniquement dans les composants "use client" qui ont besoin de
 * parler à Supabase depuis le navigateur. La clé anon est publique par
 * conception : la sécurité repose sur les policies RLS, pas sur son secret.
 *
 * Le `!` après les env : on affirme à TypeScript qu'elles existent (elles
 * sont vérifiées au démarrage — sans elles l'app ne peut rien faire).
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
