/**
 * Middleware Next.js — refondu 17/05/2026 pour Supabase Auth.
 *
 * Avant : verification simple presence cookies maison (admin_auth, user_session).
 * Apres :
 *   - /admin/* -> Supabase Auth (via lib/supabase/middleware.ts qui refresh la session)
 *   - /membre/* + /login + /register -> ancien systeme Prisma (en attendant migration)
 *
 * Note : le middleware tourne en Edge Runtime. Il ne peut pas acceder a la BDD
 * directement, juste verifier les cookies et faire des redirects.
 */
import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match toutes les requetes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon, icons, images publiques
     * - fichiers avec extension (sauf .html)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
