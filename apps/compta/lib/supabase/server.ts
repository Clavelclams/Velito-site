/**
 * Client Supabase — SERVEUR (Server Components, server actions, routes API).
 * Adapté de apps/hub/src/lib/supabase/server.ts, avec DEUX simplifications
 * volontaires par rapport au hub :
 *
 * 1. PAS de COOKIE_DOMAIN : le hub pose son cookie sur `.velito.fr` pour le
 *    SSO cross-sous-domaines. Compta est un outil interne ISOLÉ : sa session
 *    reste sur compta.velito.fr, personne d'autre ne la lit. Le jour où
 *    Compta rejoint le SSO, on réintroduit cette option — un seul fichier
 *    à toucher, c'est tout l'intérêt d'avoir isolé la création du client.
 *
 * 2. Leçon héritée du hub (bug devis VENA) conservée : on lit SUPABASE_URL /
 *    SUPABASE_ANON_KEY (runtime) en priorité, avec fallback NEXT_PUBLIC_*
 *    (dev local) — sur Vercel, les NEXT_PUBLIC_* marquées "Sensitive"
 *    arrivent vides au runtime serveur.
 *
 * Pourquoi un client PAR REQUÊTE et pas un singleton ? Chaque requête HTTP
 * appartient à UN utilisateur : son JWT, ses cookies. Un client partagé
 * entre requêtes mélangerait les sessions de deux visiteurs.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Config Supabase manquante (compta) : renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local (voir .env.example).",
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Appelé depuis un Server Component pur (pas de réponse HTTP à
          // modifier) : le middleware se charge du refresh des cookies.
        }
      },
    },
  });
}
