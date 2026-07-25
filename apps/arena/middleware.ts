/**
 * Middleware Next.js — ARENA.
 *
 * MÊME PATTERN QUE LE HUB (apps/hub/src/middleware.ts) :
 * à chaque requête, on rafraîchit la session Supabase si besoin, et on pose
 * le cookie avec Domain=.velito.fr (env COOKIE_DOMAIN) → un utilisateur
 * connecté sur hub.velito.fr est automatiquement connecté sur arena.velito.fr.
 *
 * Pas de logique de redirect ici : c'est /admin (layout) qui vérifie les droits.
 */
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const cookieDomain = process.env.COOKIE_DOMAIN;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          })
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf|eot|css|js|map)$).*)",
  ],
};
