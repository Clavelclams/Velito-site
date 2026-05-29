/**
 * Supabase client — SERVEUR (Server Components / Server Actions).
 *
 * NOTE (leçon du bug VENA, 28/05/2026) : on lit EN PRIORITÉ les variables
 * serveur SUPABASE_URL / SUPABASE_ANON_KEY (lues au runtime, OK même en
 * "Sensitive" sur Vercel), puis fallback sur les NEXT_PUBLIC_* (dev local).
 * Les NEXT_PUBLIC_* sont gelées au build : si elles sont "Sensitive" sur
 * Vercel elles arrivent vides au runtime → c'est ce qui avait cassé le devis.
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
      "Config Supabase manquante : définis SUPABASE_URL et SUPABASE_ANON_KEY " +
        "(ou NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY) dans l'environnement."
    );
  }

  // SSO cross-subdomain : on injecte Domain=.velito.fr en prod (env COOKIE_DOMAIN)
  // pour que la session posée par hub.velito.fr soit visible ici (interactive.velito.fr).
  // Voir apps/hub/src/lib/supabase/server.ts pour le commentaire détaillé.
  const cookieDomain = process.env.COOKIE_DOMAIN;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
          );
        } catch {
          // Server Component sans response cookie writer — ignoré.
        }
      },
    },
  });
}
