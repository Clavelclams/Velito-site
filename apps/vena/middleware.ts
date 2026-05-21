/**
 * Middleware Next.js VENA — Supabase Auth, protège /admin.
 *
 * Edge Runtime : ne lit que les cookies + redirects. La vérif fine des
 * permissions (org "vena") se fait dans les Server Components via hasPermission.
 */
import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// On ne fait tourner le middleware QUE sur les routes protégées et /login.
// Les pages publiques (home, contact, etc.) ne touchent jamais Supabase :
// si l'auth n'est pas configurée, le site public reste en ligne.
export const config = {
  matcher: ["/admin/:path*", "/login"],
};
