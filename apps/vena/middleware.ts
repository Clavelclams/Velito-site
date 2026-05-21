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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
