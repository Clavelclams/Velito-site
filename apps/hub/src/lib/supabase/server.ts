/**
 * Supabase client — SERVEUR (login central du hub).
 *
 * Leçon du bug devis VENA : on lit SUPABASE_URL / SUPABASE_ANON_KEY (runtime)
 * EN PRIORITÉ, fallback NEXT_PUBLIC_* (dev local). En prod sur Vercel,
 * les NEXT_PUBLIC_* marquées Sensitive arrivent vides au runtime.
 *
 * SSO cross-subdomain (.velito.fr) :
 *   On lit la variable d'env `COOKIE_DOMAIN`. En PROD on la pose à ".velito.fr"
 *   sur Vercel (hub ET sur chaque app qui veut consommer la session : interactive,
 *   arena, prevention…). En dev local on la laisse vide → le cookie reste sur
 *   `localhost` (les sous-domaines ne sont pas testables tels quels en local,
 *   c'est documenté dans la task SSO #4).
 *
 *   Le `.` initial est CRITIQUE : il dit au navigateur "cookie partagé entre
 *   velito.fr et TOUS ses sous-domaines". Sans le `.`, le cookie reste uniquement
 *   sur le domaine exact qui l'a posé.
 *
 *   Sécurité : on garde sameSite="lax" + secure (en prod) hérités de @supabase/ssr.
 *   On ne baisse JAMAIS ces flags pour faire marcher le SSO — on étend juste
 *   le scope au sous-domaine parent.
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
      "Config Supabase manquante (hub) : définis SUPABASE_URL et SUPABASE_ANON_KEY"
    );
  }

  // Domaine du cookie de session — étend la portée au-delà du sous-domaine courant.
  // En prod : ".velito.fr" (lu depuis Vercel env). En dev : undefined.
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
          // Server Component sans response writer — ignoré.
        }
      },
    },
  });
}
