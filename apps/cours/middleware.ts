/**
 * Middleware — Velito Cours (espace de révision CDA).
 *
 * Même philosophie "default deny" que Compta : ce site contient MES fiches
 * qui citent MON code (chemins de fichiers, extraits, décisions internes) —
 * ce n'est pas public. Toute route sans session → /login, et comme
 * auth.users est partagé avec tout Velito, une LISTE BLANCHE d'emails
 * transforme "authentifié" en "autorisé" (deux notions différentes).
 *
 * Pattern intégralement repris de apps/compta/middleware.ts — voir ses
 * commentaires pour le détail de la danse des cookies @supabase/ssr.
 */
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROUTES_PUBLIQUES = ["/login"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const estRoutePublique = ROUTES_PUBLIQUES.some(
    (route) => request.nextUrl.pathname === route,
  );

  // Liste blanche : authentifié ≠ autorisé (auth.users partagé Velito).
  const emailsAutorises = (process.env.COURS_EMAILS_AUTORISES ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (
    user &&
    emailsAutorises.length > 0 &&
    !emailsAutorises.includes(user.email?.toLowerCase() ?? "")
  ) {
    return new NextResponse(
      "Accès restreint — espace de révision personnel.",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  if (!user && !estRoutePublique) {
    const urlLogin = request.nextUrl.clone();
    urlLogin.pathname = "/login";
    return NextResponse.redirect(urlLogin);
  }

  if (user && estRoutePublique) {
    const urlAccueil = request.nextUrl.clone();
    urlAccueil.pathname = "/";
    return NextResponse.redirect(urlAccueil);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf|eot|css|js|map)$).*)",
  ],
};
