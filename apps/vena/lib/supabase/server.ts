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

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
