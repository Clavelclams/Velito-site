/**
 * Supabase server client pour VENA.
 *
 * Utilise les mêmes credentials que les autres apps Velito (même projet
 * Supabase). Le schema 'vena' est celui qui contient demandes_contact.
 *
 * En V1, on n'utilise Supabase QUE pour l'INSERT public via le formulaire
 * contact. Pas d'auth utilisateur côté VENA pour l'instant.
 */
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  // Fix 23/05 : sur Vercel, une variable NEXT_PUBLIC_* marquee "Sensitive" n'est
  // PAS injectee au build -> elle arrive vide au runtime, et Supabase plante
  // ("Your project's URL and Key are required..."). On lit donc EN PRIORITE des
  // variables SERVEUR classiques (SUPABASE_URL / SUPABASE_ANON_KEY) qui, elles,
  // sont lues au runtime par la fonction (meme en Sensitive). Fallback sur les
  // NEXT_PUBLIC_* pour le dev local (.env.local) ou elles fonctionnent.
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Config Supabase manquante : definis SUPABASE_URL et SUPABASE_ANON_KEY " +
        "(ou NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY) dans l'environnement Vercel."
    );
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component sans response cookie writer — pas grave.
          }
        },
      },
    }
  );
}
