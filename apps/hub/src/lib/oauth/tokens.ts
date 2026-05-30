/**
 * OAuth — génération des tokens (access_token, id_token, refresh_token).
 *
 * - **access_token** : JWT RS256, durée 1h. Claims OAuth standards (iss, sub,
 *   aud, exp, iat, scope). Vérifié via /jwks.json par les apps clientes.
 * - **id_token** : JWT RS256, durée 1h. Claims OIDC (sub, iss, aud, exp, iat,
 *   nonce, email, name, picture si scope permet). Signe l'identité.
 * - **refresh_token** : opaque UUID, durée 30 jours, stocké en DB (table
 *   oauth_refresh_tokens). Single-use + family_id pour rotation anti-replay.
 *
 * Pourquoi JWT pour access_token : les apps clientes peuvent le vérifier en
 * appelant /jwks.json une seule fois et en cachant la clé publique. Pas besoin
 * d'aller chercher chaque token en DB → scale horizontal.
 *
 * Pourquoi opaque pour refresh : sécurité. Le refresh est plus sensible (long
 * lived), on contrôle son cycle de vie via la DB (revoke, family kill, etc.).
 */
import { SignJWT } from "jose";
import { getServiceClient } from "@/lib/supabase/service";
import { getSigningKey } from "./keys";

/**
 * Claims à intégrer dans access_token + id_token.
 * Exporté pour que les call-sites (Route Handlers, server actions) puissent
 * référencer ce shape sans re-déclarer.
 */
export interface TokenPayload {
  userId: string;
  clientId: string;
  scope: string[];
  nonce?: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}

/**
 * Response shape OAuth-spec compliant pour /oauth/token (RFC 6749 §5.1).
 * Exporté car le Route Handler POST retourne ce type via NextResponse.json,
 * et TypeScript a besoin de pouvoir nommer le type dans les déclarations
 * publiques de la bundle Next.
 */
export interface GeneratedTokens {
  access_token: string;
  id_token?: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number; // secondes
  scope: string;
}

const ACCESS_TOKEN_TTL_SEC = 60 * 60; // 1 heure
const REFRESH_TOKEN_TTL_DAYS = 30;

/**
 * Génère access_token + id_token (si openid) + refresh_token pour un user
 * autorisé. Insère le refresh_token dans la DB pour qu'on puisse le révoquer
 * et détecter les replay.
 */
export async function generateTokens(
  payload: TokenPayload,
  issuer: string
): Promise<GeneratedTokens> {
  const { kid, alg, privateKey } = await getSigningKey();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ACCESS_TOKEN_TTL_SEC;

  // -----------------------------------------------------------------------
  // 1. Access token (JWT RS256)
  // -----------------------------------------------------------------------
  // Claims OAuth standards. Le `aud` est le client_id, le `sub` est le user_id.
  const access_token = await new SignJWT({
    scope: payload.scope.join(" "),
  })
    .setProtectedHeader({ alg, kid, typ: "JWT" })
    .setIssuer(issuer)
    .setSubject(payload.userId)
    .setAudience(payload.clientId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(privateKey);

  // -----------------------------------------------------------------------
  // 2. ID token (JWT RS256) — uniquement si scope contient "openid"
  // -----------------------------------------------------------------------
  let id_token: string | undefined;
  if (payload.scope.includes("openid")) {
    const idTokenBuilder = new SignJWT({
      nonce: payload.nonce,
      ...(payload.scope.includes("email") && payload.email
        ? { email: payload.email, email_verified: true }
        : {}),
      ...(payload.scope.includes("profile") && payload.name
        ? { name: payload.name }
        : {}),
      ...(payload.scope.includes("profile") && payload.picture
        ? { picture: payload.picture }
        : {}),
    })
      .setProtectedHeader({ alg, kid, typ: "JWT" })
      .setIssuer(issuer)
      .setSubject(payload.userId)
      .setAudience(payload.clientId)
      .setIssuedAt(now)
      .setExpirationTime(exp);

    id_token = await idTokenBuilder.sign(privateKey);
  }

  // -----------------------------------------------------------------------
  // 3. Refresh token (opaque UUID stocké en DB)
  // -----------------------------------------------------------------------
  const supabase = getServiceClient();
  const refreshExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: insertedRefresh, error: insertError } = await supabase
    .from("oauth_refresh_tokens")
    .insert({
      client_id: payload.clientId,
      user_id: payload.userId,
      scope: payload.scope,
      expires_at: refreshExpiresAt,
    })
    .select("token")
    .single();

  if (insertError || !insertedRefresh) {
    throw new Error(
      `[oauth/tokens] Échec insertion refresh_token: ${insertError?.message ?? "no row"}`
    );
  }

  return {
    access_token,
    id_token,
    refresh_token: insertedRefresh.token as string,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SEC,
    scope: payload.scope.join(" "),
  };
}

/**
 * Échange un refresh_token contre un nouveau access_token + nouveau refresh_token
 * (ROTATION single-use). Détecte les replay : si le refresh_token est déjà
 * révoqué/utilisé, on révoque TOUTE la family (kill switch).
 */
export async function rotateRefreshToken(
  oldToken: string,
  clientId: string,
  issuer: string
): Promise<GeneratedTokens | null> {
  const supabase = getServiceClient();

  // 1. Lookup
  const { data: row } = await supabase
    .from("oauth_refresh_tokens")
    .select("*")
    .eq("token", oldToken)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!row) return null;

  // 2. Détection replay : si déjà révoqué OU expiré, on tue TOUTE la family
  const isExpired = new Date(row.expires_at).getTime() < Date.now();
  const isRevoked = row.revoked_at !== null;
  if (isExpired || isRevoked) {
    await supabase
      .from("oauth_refresh_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("family_id", row.family_id)
      .is("revoked_at", null);
    return null;
  }

  // 3. Marquer l'ancien comme révoqué
  await supabase
    .from("oauth_refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", oldToken);

  // 4. Récupérer les claims user pour le nouveau token
  const supabaseAuth = getServiceClient();
  const { data: userData } = await supabaseAuth.auth.admin.getUserById(
    row.user_id as string
  );
  const user = userData?.user;

  // 5. Émettre nouveau pair, en conservant la family_id (chaîne de rotation)
  const newTokens = await generateTokens(
    {
      userId: row.user_id as string,
      clientId,
      scope: row.scope as string[],
      email: user?.email,
      name: (user?.user_metadata?.name as string) ?? null,
      picture: (user?.user_metadata?.picture as string) ?? null,
    },
    issuer
  );

  // 6. Patch la family_id du nouveau token pour qu'il appartienne à la même chaîne
  await supabase
    .from("oauth_refresh_tokens")
    .update({ family_id: row.family_id })
    .eq("token", newTokens.refresh_token);

  return newTokens;
}
