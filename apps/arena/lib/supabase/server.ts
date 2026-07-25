/**
 * Supabase client — SERVEUR (session utilisateur).
 * Même pattern que le hub : env runtime en priorité, COOKIE_DOMAIN pour le SSO.
 * Utilisé pour : savoir QUI est connecté + lectures soumises à RLS.
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
      "Config Supabase manquante (arena) : définis SUPABASE_URL et SUPABASE_ANON_KEY"
    );
  }

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
