/**
 * /api/auth/after-login — Route GET qui decide la destination apres login.
 *
 * Appelee par /login apres signInWithPassword reussi.
 *
 *   - Si user a >= editor sur vea -> redirect /admin
 *   - Sinon                       -> redirect /profil
 *
 * Si pas de session (cas anormal), redirect /login.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, hasPresenceAccess } from "@/lib/supabase/permissions";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { origin } = new URL(request.url);

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const canEdit = await hasPermission("vea", "editor");
  // [28/10/2026] Droit "presences" seul (bénévole) -> liste des événements.
  const target = canEdit ? "/admin" : (await hasPresenceAccess()) ? "/admin/evenements" : "/profil";

  return NextResponse.redirect(`${origin}${target}`);
}
