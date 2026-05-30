/**
 * OAuth JWKS — lookup et import des clés RSA pour signer/vérifier les JWT.
 *
 * Source : table `shared.oauth_jwks` (server-only). On lit la clé ACTIVE
 * (rotated_at IS NULL) la plus récente pour signer. Pour la vérification,
 * on accepte toute clé non révoquée (utile pendant une rotation : les JWT
 * émis avec l'ancien `kid` doivent encore être vérifiables tant qu'ils sont
 * valides).
 *
 * Cache mémoire : les clés ne changent pas souvent (rotation manuelle), on
 * peut les cacher 5 minutes. Si on rotate, on attend que le cache expire OU
 * on redéploie.
 */
import { importPKCS8, importJWK, type KeyLike } from "jose";
import { getServiceClient } from "@/lib/supabase/service";

export interface JwksRow {
  kid: string;
  alg: string;
  use_for: string;
  private_pem: string;
  public_jwk: Record<string, unknown>;
  created_at: string;
  rotated_at: string | null;
}

interface CachedSigningKey {
  kid: string;
  alg: string;
  privateKey: KeyLike;
  cachedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
let cachedSigningKey: CachedSigningKey | null = null;

/**
 * Récupère la clé privée ACTIVE (rotated_at IS NULL) la plus récente pour signer.
 * Importée au format CryptoKey via jose (à partir du PEM PKCS8 stocké en DB).
 */
export async function getSigningKey(): Promise<{
  kid: string;
  alg: string;
  privateKey: KeyLike;
}> {
  if (
    cachedSigningKey &&
    Date.now() - cachedSigningKey.cachedAt < CACHE_TTL_MS
  ) {
    return {
      kid: cachedSigningKey.kid,
      alg: cachedSigningKey.alg,
      privateKey: cachedSigningKey.privateKey,
    };
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("oauth_jwks")
    .select("*")
    .is("rotated_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`[oauth/keys] getSigningKey DB error: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      "[oauth/keys] Aucune clé de signature active dans shared.oauth_jwks. " +
        "Bootstrap via scripts/generate-oauth-jwks.mjs requis."
    );
  }

  const row = data as JwksRow;
  const privateKey = await importPKCS8(row.private_pem, row.alg);
  cachedSigningKey = {
    kid: row.kid,
    alg: row.alg,
    privateKey,
    cachedAt: Date.now(),
  };

  return { kid: row.kid, alg: row.alg, privateKey };
}

/**
 * Récupère TOUTES les clés (actives + récemment rotées) au format JWK public,
 * pour le endpoint /.well-known/jwks.json.
 *
 * On expose AUSSI les clés rotées récemment (< 24h) pour que les JWT en
 * circulation restent vérifiables après une rotation. Au-delà : la clé
 * disparaît de la JWKS publique, les JWT signés avec elle sont rejetés.
 */
export async function getPublicJwks(): Promise<{
  keys: Record<string, unknown>[];
}> {
  const supabase = getServiceClient();
  const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("oauth_jwks")
    .select("public_jwk, rotated_at")
    .or(`rotated_at.is.null,rotated_at.gt.${dayAgoIso}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[oauth/keys] getPublicJwks error:", error.message);
    return { keys: [] };
  }

  const keys = (data ?? []).map((row) => row.public_jwk as Record<string, unknown>);
  return { keys };
}

/**
 * Vérifie un JWT en cherchant la bonne clé publique via son `kid` dans la table.
 * Utilisé par /oauth/userinfo pour valider le Bearer access_token.
 */
export async function getVerificationKey(kid: string): Promise<KeyLike | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("oauth_jwks")
    .select("public_jwk, alg")
    .eq("kid", kid)
    .maybeSingle();

  if (error || !data) return null;

  return await importJWK(
    data.public_jwk as Record<string, unknown>,
    data.alg as string
  ) as KeyLike;
}
