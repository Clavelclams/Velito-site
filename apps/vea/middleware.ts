/**
 * Middleware Next.js — Contrôle d'accès aux routes
 *
 * 👉 CE QUE C'EST :
 * Le middleware s'exécute AVANT chaque requête sur les routes listées dans `matcher`.
 * C'est comme un vigile à l'entrée : il vérifie si tu as le droit d'entrer.
 *
 * 👉 CE QU'IL FAIT :
 * - Routes /membre/* → vérifie le cookie "user_session"
 *   Si pas connecté → redirige vers /login
 * - Routes /admin/* → vérifie le cookie "admin_auth"
 *   Si pas connecté → redirige vers /admin/login
 * - Routes /login et /register → si DÉJÀ connecté, redirige vers /membre
 *   (pas besoin de se reconnecter)
 *
 * 👉 IMPORTANT :
 * Le middleware ne peut PAS accéder à la BDD directement (il tourne en Edge Runtime).
 * Il se contente de vérifier la PRÉSENCE du cookie, pas sa validité.
 * La route /api/auth/me fait la vraie vérification en BDD.
 */

import { NextRequest, NextResponse } from "next/server";

// 👉 Nom des cookies (doit matcher avec lib/auth.ts)
const USER_COOKIE = "user_session";
const ADMIN_COOKIE = "admin_auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasUserSession = request.cookies.has(USER_COOKIE);
  const hasAdminSession = request.cookies.has(ADMIN_COOKIE);

  // ===== PROTECTION ESPACE MEMBRE =====
  // 👉 Si quelqu'un essaie d'aller sur /membre sans être connecté → /login
  if (pathname.startsWith("/membre")) {
    if (!hasUserSession) {
      const loginUrl = new URL("/login", request.url);
      // 👉 On ajoute ?redirect=/membre/... pour rediriger après login
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ===== PROTECTION ADMIN =====
  // 👉 /admin/login est accessible à tous (c'est la page de connexion admin)
  // Les autres pages /admin/* nécessitent le cookie admin
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!hasAdminSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // ===== REDIRECT SI DÉJÀ CONNECTÉ =====
  // 👉 Un user déjà connecté qui va sur /login ou /register → on le renvoie sur /membre
  // Pas besoin de se reconnecter !
  if (pathname === "/login" || pathname === "/register") {
    if (hasUserSession) {
      return NextResponse.redirect(new URL("/membre", request.url));
    }
  }

  // 👉 Tout est OK → on laisse passer
  return NextResponse.next();
}

// 👉 `matcher` dit à Next.js sur quelles routes exécuter ce middleware
// Sans ça, il tournerait sur TOUTES les requêtes (y compris les images, CSS, etc.)
export const config = {
  matcher: [
    "/membre/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
