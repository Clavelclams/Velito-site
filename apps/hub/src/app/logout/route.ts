/**
 * /logout — Endpoint POST de déconnexion centralisée.
 *
 * Toutes les apps Velito (Interactive, VEA, Arena, etc.) appellent CET endpoint
 * pour déconnecter l'utilisateur. Pourquoi centralisé sur le hub :
 *
 *  - Le cookie de session est posé par hub.velito.fr avec Domain=.velito.fr
 *    (cf. apps/hub/src/lib/supabase/server.ts + middleware). Pour le supprimer
 *    proprement, il faut appeler `supabase.auth.signOut()` sur le hub, qui
 *    va clear les cookies AVEC le même Domain.
 *  - Si on essayait de signOut depuis interactive.velito.fr, le cookie poserait
 *    Domain=interactive.velito.fr (le sous-domaine), pas .velito.fr → on
 *    n'effacerait que la VUE locale, le cookie root resterait. L'utilisateur
 *    apparaîtrait "déconnecté" sur Interactive mais TOUJOURS connecté sur les
 *    autres apps. Bug classique de SSO cross-subdomain.
 *
 * Flow :
 *  1. App cliente POST {form-data: return=URL} vers https://hub.velito.fr/logout
 *  2. Hub valide que `return` est dans la whitelist des origines Velito
 *     (anti open-redirect — sinon attaquant pourrait rediriger vers evil.com)
 *  3. Hub fait supabase.auth.signOut() → clear cookies sb-* avec Domain=.velito.fr
 *  4. Hub redirige le navigateur vers `return` → user revient sur l'app
 *     d'origine, déconnecté partout
 *
 * Sécurité :
 *  - POST only (GET refusé — pas de mutation via lien malveillant)
 *  - return URL whitelist (origines .velito.fr + localhost dev)
 *  - SameSite=Lax cookies → la requête cross-subdomain depuis Interactive
 *    arrive bien avec le cookie de session (sinon signOut ne ferait rien)
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Origines autorisées comme `return` après logout.
 * Tout ce qui n'est pas dans cette liste → fallback vers / du hub.
 */
const ALLOWED_RETURN_ORIGINS = new Set([
  "https://hub.velito.fr",
  "https://velito.fr",
  "https://vea.velito.fr",
  "https://interactive.velito.fr",
  "https://arena.velito.fr",
  "https://prevention.velito.fr",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:3005",
]);

/**
 * Valide une URL `return` envoyée par le client.
 * Retourne l'URL si OK, ou null si invalide.
 */
function validateReturnUrl(returnTo: string | null): string | null {
  if (!returnTo) return null;
  try {
    const url = new URL(returnTo);
    if (!ALLOWED_RETURN_ORIGINS.has(url.origin)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  // Form-encoded body (HTML form classique) OU JSON.
  let returnTo: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    returnTo = (form.get("return") as string | null) ?? null;
  } else if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      returnTo = body?.return ?? null;
    } catch {
      returnTo = null;
    }
  } else {
    // Fallback : query string
    returnTo = new URL(request.url).searchParams.get("return");
  }

  // SignOut côté serveur → clear cookies sb-* avec Domain=.velito.fr
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Redirige vers l'app d'origine ou fallback hub
  const validated = validateReturnUrl(returnTo);
  const redirectTo = validated ?? new URL("/", request.url).toString();
  return NextResponse.redirect(redirectTo, { status: 303 });
}

/**
 * GET interdit : on refuse la déconnexion via lien GET (CSRF protection).
 * Si t'arrives ici via un lien direct, on te redirige vers la home.
 */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
