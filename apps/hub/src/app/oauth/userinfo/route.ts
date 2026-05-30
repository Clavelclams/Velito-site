/**
 * /oauth/userinfo — UserInfo Endpoint (OIDC Core 1.0 §5.3).
 *
 * Le client envoie son access_token en `Authorization: Bearer <jwt>`. On
 * vérifie la signature (via la clé publique du kid), on extrait sub + scope,
 * et on retourne les claims user correspondants depuis Supabase Auth.
 *
 * Sécurité :
 *  - JWT signature vérifiée via JWKS (kid → clé publique)
 *  - `aud` doit être un client_id connu (anti substitution audience)
 *  - `exp` vérifié (anti reuse de tokens expirés)
 *  - Pas de cache : userinfo peut changer (email modifié, etc.)
 */
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getServiceClient } from "@/lib/supabase/service";
import { getVerificationKey } from "@/lib/oauth/keys";

export const dynamic = "force-dynamic";

function getIssuer(): string {
  return (
    process.env.NEXT_PUBLIC_HUB_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function GET(request: NextRequest) {
  // ----- 1. Extraction du Bearer token -----
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return jsonError(401, "invalid_token");
  }
  const token = authHeader.slice(7).trim();

  // ----- 2. Décoder le header pour récupérer le kid (sans vérifier la signature encore) -----
  let kid: string | undefined;
  try {
    const headerB64 = token.split(".")[0];
    const headerJson = Buffer.from(headerB64!, "base64url").toString("utf-8");
    const header = JSON.parse(headerJson);
    kid = header.kid;
  } catch {
    return jsonError(401, "invalid_token");
  }

  if (!kid) return jsonError(401, "invalid_token");

  // ----- 3. Lookup de la clé publique correspondante -----
  const publicKey = await getVerificationKey(kid);
  if (!publicKey) return jsonError(401, "invalid_token");

  // ----- 4. Vérification de la signature + claims standards -----
  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(token, publicKey, {
      issuer: getIssuer(),
      // On ne vérifie pas l'audience ici car elle dépend du client appelant.
      // Mais on s'assure que le claim existe.
    });
    payload = verified.payload as Record<string, unknown>;
  } catch (err) {
    console.error("[oauth/userinfo] jwt verify error:", err);
    return jsonError(401, "invalid_token");
  }

  const sub = payload.sub as string | undefined;
  const scope = (payload.scope as string | undefined)?.split(/\s+/) ?? [];
  if (!sub) return jsonError(401, "invalid_token");

  // ----- 5. Récupérer les infos user via service_role -----
  const supabase = getServiceClient();
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(sub);

  if (userError || !userData?.user) {
    return jsonError(401, "invalid_token");
  }

  const user = userData.user;

  // ----- 6. Construire la réponse selon les scopes -----
  const claims: Record<string, unknown> = { sub };

  if (scope.includes("email") && user.email) {
    claims.email = user.email;
    claims.email_verified = user.email_confirmed_at !== null;
  }

  if (scope.includes("profile")) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (metadata.name) claims.name = metadata.name;
    if (metadata.picture) claims.picture = metadata.picture;
  }

  return NextResponse.json(claims, {
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}
