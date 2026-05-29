/**
 * Middleware Next.js — Velito Interactive.
 *
 * Même rôle que le middleware du hub : refresh la session Supabase à chaque
 * request HTTP. Permet à l'app de DÉTECTER quand le user est loggé via le
 * cookie posé par hub.velito.fr (Domain=.velito.fr) — c'est le SSO.
 *
 * Code voulu identique à apps/hub/src/middleware.ts (même Supabase, même
 * cookie domain) — c'est la garantie que la session soit lue de la même
 * façon partout. Si on doit changer le pattern, on change les deux.
 */
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return response;

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
