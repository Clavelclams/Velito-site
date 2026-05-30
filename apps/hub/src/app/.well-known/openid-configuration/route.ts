/**
 * OIDC Discovery — /.well-known/openid-configuration
 *
 * Spec : OpenID Connect Discovery 1.0 §3.
 *
 * Ce endpoint permet aux apps clientes de découvrir AUTOMATIQUEMENT les URLs
 * et capacités de notre Authorization Server, sans hardcoder. Une lib OIDC
 * standard (oidc-client-ts, openid-client, etc.) lit ce JSON et configure
 * tout toute seule.
 *
 * À NOTER :
 *  - `issuer` DOIT correspondre exactement à celui mis dans les JWT signés
 *    (claim `iss`). Sinon les apps clientes rejettent les tokens.
 *  - Si on change l'issuer plus tard, les tokens en cours deviennent invalides.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-static"; // Cacheable, ne change pas en runtime

function getIssuer(): string {
  return (
    process.env.NEXT_PUBLIC_HUB_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export async function GET() {
  const issuer = getIssuer();

  const metadata = {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    // Pas encore implémenté :
    // revocation_endpoint: `${issuer}/oauth/revoke`,
    // end_session_endpoint: `${issuer}/oauth/logout`,

    // Capacités du flow Authorization Code + PKCE
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    token_endpoint_auth_methods_supported: ["none"], // clients publics PKCE
    code_challenge_methods_supported: ["S256"], // PAS "plain" — refusé en SQL

    scopes_supported: ["openid", "email", "profile"],
    claims_supported: [
      "sub",
      "iss",
      "aud",
      "exp",
      "iat",
      "nonce",
      "email",
      "email_verified",
      "name",
      "picture",
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=3600", // 1h cache CDN
    },
  });
}
