/**
 * /oauth/token — Token Endpoint (RFC 6749 §4.1.3 + §6).
 *
 * Body : application/x-www-form-urlencoded (spec OAuth, PAS du JSON).
 *
 * 2 grant_types supportés :
 *  - authorization_code : échange un code (de /authorize) contre access+id+refresh
 *  - refresh_token : échange un ancien refresh contre un nouveau pair (rotation)
 *
 * Sécurité :
 *  - PKCE check : SHA256(code_verifier) === code_challenge stocké
 *  - redirect_uri DOIT matcher exactement celui de /authorize (anti substitution)
 *  - Code single-use : on marque consumed_at après validation (réutilisation = rejet)
 *  - Refresh token rotation + family revoke en cas de replay détecté
 */
import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getClient } from "@/lib/oauth/clients";
import { verifyPkceChallenge } from "@/lib/oauth/pkce";
import { generateTokens, rotateRefreshToken } from "@/lib/oauth/tokens";

export const dynamic = "force-dynamic";

function jsonError(status: number, error: string, error_description: string) {
  return NextResponse.json({ error, error_description }, { status });
}

function getIssuer(): string {
  return (
    process.env.NEXT_PUBLIC_HUB_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export async function POST(request: NextRequest) {
  // OAuth body est x-www-form-urlencoded (RFC compliant)
  let body: URLSearchParams;
  try {
    const text = await request.text();
    body = new URLSearchParams(text);
  } catch {
    return jsonError(400, "invalid_request", "Body invalide.");
  }

  const grantType = body.get("grant_type");
  if (!grantType) {
    return jsonError(400, "invalid_request", "grant_type requis.");
  }

  // ============================================================================
  // GRANT : authorization_code (premier échange après /authorize)
  // ============================================================================
  if (grantType === "authorization_code") {
    const code = body.get("code");
    const redirectUri = body.get("redirect_uri");
    const clientId = body.get("client_id");
    const codeVerifier = body.get("code_verifier");

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      return jsonError(
        400,
        "invalid_request",
        "code, redirect_uri, client_id, code_verifier sont requis."
      );
    }

    // 1. Lookup du client
    const client = await getClient(clientId);
    if (!client) {
      return jsonError(400, "invalid_client", "Client inconnu.");
    }

    // 2. Lookup du code en DB
    const supabase = getServiceClient();
    const { data: codeRow } = await supabase
      .from("oauth_authorization_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!codeRow) {
      return jsonError(400, "invalid_grant", "Code invalide ou inconnu.");
    }

    // 3. Vérifs : non consumé, non expiré, redirect_uri match, client match
    if (codeRow.consumed_at) {
      return jsonError(400, "invalid_grant", "Code déjà utilisé.");
    }
    if (new Date(codeRow.expires_at as string).getTime() < Date.now()) {
      return jsonError(400, "invalid_grant", "Code expiré (60 secondes max).");
    }
    if (codeRow.client_id !== clientId) {
      return jsonError(400, "invalid_grant", "Code émis pour un autre client.");
    }
    if (codeRow.redirect_uri !== redirectUri) {
      return jsonError(
        400,
        "invalid_grant",
        "redirect_uri ne correspond pas à celui de l'authorize."
      );
    }

    // 4. PKCE check : SHA256(verifier) === challenge stocké
    if (
      !verifyPkceChallenge(codeVerifier, codeRow.code_challenge as string)
    ) {
      return jsonError(400, "invalid_grant", "PKCE verification failed.");
    }

    // 5. Marquer le code comme consumé (single-use)
    await supabase
      .from("oauth_authorization_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("code", code);

    // 6. Récupérer les claims user via service_role
    const { data: userData } = await supabase.auth.admin.getUserById(
      codeRow.user_id as string
    );
    const user = userData?.user;

    // 7. Générer les tokens
    try {
      const tokens = await generateTokens(
        {
          userId: codeRow.user_id as string,
          clientId,
          scope: codeRow.scope as string[],
          nonce: (codeRow.nonce as string | null) ?? undefined,
          email: user?.email,
          name: (user?.user_metadata?.name as string) ?? null,
          picture: (user?.user_metadata?.picture as string) ?? null,
        },
        getIssuer()
      );

      return NextResponse.json(tokens, {
        headers: {
          "Cache-Control": "no-store", // jamais cacher des tokens
          Pragma: "no-cache",
        },
      });
    } catch (err) {
      console.error("[oauth/token] generateTokens error:", err);
      return jsonError(500, "server_error", "Erreur génération tokens.");
    }
  }

  // ============================================================================
  // GRANT : refresh_token (rotation)
  // ============================================================================
  if (grantType === "refresh_token") {
    const refreshToken = body.get("refresh_token");
    const clientId = body.get("client_id");

    if (!refreshToken || !clientId) {
      return jsonError(
        400,
        "invalid_request",
        "refresh_token et client_id requis."
      );
    }

    const client = await getClient(clientId);
    if (!client) {
      return jsonError(400, "invalid_client", "Client inconnu.");
    }

    try {
      const newTokens = await rotateRefreshToken(
        refreshToken,
        clientId,
        getIssuer()
      );
      if (!newTokens) {
        return jsonError(
          400,
          "invalid_grant",
          "Refresh token invalide, expiré ou déjà utilisé."
        );
      }
      return NextResponse.json(newTokens, {
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
    } catch (err) {
      console.error("[oauth/token] refresh error:", err);
      return jsonError(500, "server_error", "Erreur rotation refresh.");
    }
  }

  return jsonError(
    400,
    "unsupported_grant_type",
    `grant_type "${grantType}" non supporté.`
  );
}
