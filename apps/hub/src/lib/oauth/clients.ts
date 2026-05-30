/**
 * OAuth — lookup et validation des clients enregistrés.
 *
 * Source de vérité : table `shared.oauth_clients` (server-only via service_role).
 *
 * Sécurité :
 *  - `redirect_uri` est validé par MATCH EXACT (pas de wildcard) — c'est la
 *    règle anti open-redirect. Si l'attaquant envoie une URL différente d'un
 *    pixel de celle enregistrée, on rejette.
 *  - On supporte les clients publics (client_secret = NULL) parce qu'on est en
 *    flow PKCE — pas besoin de secret partagé pour les SPA/mobile.
 */
import { getServiceClient } from "@/lib/supabase/service";

export interface OAuthClient {
  client_id: string;
  client_secret: string | null;
  name: string;
  description: string | null;
  logo_url: string | null;
  redirect_uris: string[];
  allowed_scopes: string[];
  is_first_party: boolean;
  created_at: string;
}

/**
 * Lookup d'un client par son ID. Retourne null si inconnu.
 */
export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("oauth_clients")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    console.error("[oauth/clients] getClient error:", error.message);
    return null;
  }
  return data as OAuthClient | null;
}

/**
 * Vérifie qu'un `redirect_uri` envoyé par le client correspond exactement à
 * une URL enregistrée. C'est la défense anti open-redirect : aucun glob,
 * aucun préfixe, MATCH EXACT.
 */
export function isValidRedirectUri(
  client: OAuthClient,
  redirectUri: string
): boolean {
  return client.redirect_uris.includes(redirectUri);
}

/**
 * Vérifie qu'un scope demandé par le client est autorisé pour ce client.
 * Le scope OAuth est une string "openid email profile" — on split sur espaces.
 */
export function areScopesAllowed(
  client: OAuthClient,
  requestedScopes: string[]
): boolean {
  return requestedScopes.every((s) => client.allowed_scopes.includes(s));
}
