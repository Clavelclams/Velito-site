/**
 * /auth/callback — gere le retour de Supabase apres click sur lien email.
 *
 * Quand un user clique le lien dans son email (invitation, password recovery,
 * email change), Supabase redirige vers cette route avec un parametre `code`
 * en query string. On l echange contre une session via exchangeCodeForSession.
 *
 * Ensuite redirect vers `next` (par defaut /admin).
 *
 * En cas d erreur (code expire, invalide, etc.), redirect vers /admin/login
 * avec un parametre d erreur visible dans l UI.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Défaut : /api/auth/after-login qui route intelligemment selon les droits
  // (admin -> /admin, membre lambda -> /profil). Avant on forçait /admin, ce
  // qui envoyait les nouveaux membres confirmés sur une page admin interdite.
  const next = searchParams.get("next") ?? "/api/auth/after-login";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=missing_code`
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[/auth/callback] exchange failed:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=auth_exchange_failed`
    );
  }

  // Session etablie. On redirige vers la destination demandee.
  return NextResponse.redirect(`${origin}${next}`);
}
