/**
 * Supabase client — usage SERVEUR avec gestion des cookies d'auth.
 *
 * Cle utilisee : NEXT_PUBLIC_SUPABASE_ANON_KEY + cookies de session.
 * Lit l'utilisateur Supabase Auth actuellement connecte (si admin connecte
 * via /admin/login).
 *
 * Quand l'utiliser :
 *   - Server Component qui doit savoir QUI est connecte (ex: app/admin/page.tsx)
 *   - Route Handler qui valide une session admin avant d'agir
 *   - Server Action authenticated
 *
 * Quand NE PAS l'utiliser :
 *   - Cote navigateur -> utilise client.ts
 *   - Pour bypass RLS et ecrire en service_role -> utilise admin.ts
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
            // setAll appele depuis un Server Component sans Server Action -> ignore.
            // Le middleware se chargera de rafraichir la session a la requete suivante.
          }
        },
      },
    }
  );
}
