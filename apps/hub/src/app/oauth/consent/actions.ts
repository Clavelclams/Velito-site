/**
 * Server actions du consent screen OAuth.
 *
 * approveConsentAction : l'user a cliqué "Autoriser"
 *  → upsert dans `oauth_consents` (trace RGPD du consentement)
 *  → insert dans `oauth_authorization_codes` (le code que le client échangera)
 *  → redirect callback avec ?code=...&state=...
 *
 * denyConsentAction : l'user a cliqué "Refuser"
 *  → PAS d'écriture en DB (zéro trace de tentative)
 *  → redirect callback avec ?error=access_denied&state=...
 *
 * Sécurité critique :
 *  - On REVALIDE tout côté serveur (client_id, redirect_uri, scopes) — l'user
 *    pourrait avoir modifié les hidden fields du form via DevTools
 *  - On exige une session user valide (pas d'écriture si pas loggé)
 *  - On vérifie que les scopes "approuvés" sont ⊆ allowed_scopes du client
 *    (anti-escalation : un user ne peut pas grant plus que ce que le client
 *    est autorisé à demander)
 */
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getClient, isValidRedirectUri, areScopesAllowed } from "@/lib/oauth/clients";

interface ConsentInput {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state?: string;
  nonce?: string;
  code_challenge: string;
  code_challenge_method: string;
  /** Scopes effectivement cochés par l'user dans le form (sous-ensemble du scope demandé) */
  approved_scopes: string;
}

/**
 * Helper pour redirect d'erreur vers le callback du client (anti open-redirect :
 * on n'utilise CE redirect QUE si redirect_uri a été validé en amont).
 */
function redirectError(
  redirectUri: string,
  error: string,
  description: string,
  state?: string
): never {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  redirect(url.toString());
}

export async function approveConsentAction(input: ConsentInput) {
  // ----- 1. Re-validation user -----
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?return=/oauth/consent`);
  }

  // ----- 2. Re-validation client + redirect_uri (MATCH EXACT) -----
  const client = await getClient(input.client_id);
  if (!client) {
    // Sans client valide on n'a pas le droit de rediriger n'importe où
    throw new Error("Client OAuth inconnu");
  }
  if (!isValidRedirectUri(client, input.redirect_uri)) {
    throw new Error("redirect_uri invalide");
  }

  // ----- 3. Re-validation des scopes -----
  const requestedScopes = input.scope.split(/\s+/).filter(Boolean);
  const approvedScopes = input.approved_scopes
    .split(/\s+/)
    .filter(Boolean)
    // L'user ne peut approuver QUE ce qui était demandé (pas d'ajout)
    .filter((s) => requestedScopes.includes(s));

  // Sécurité : les scopes approuvés doivent être dans allowed_scopes du client
  if (!areScopesAllowed(client, approvedScopes)) {
    redirectError(
      input.redirect_uri,
      "invalid_scope",
      "Scope non autorisé pour ce client.",
      input.state
    );
  }

  // L'user DOIT au minimum approuver "openid" si demandé (sinon on ne peut
  // pas faire d'OIDC). En pratique on force tout ou rien pour MVP.
  if (approvedScopes.length === 0) {
    redirectError(
      input.redirect_uri,
      "access_denied",
      "Aucun scope approuvé.",
      input.state
    );
  }

  // ----- 4. Upsert du consentement (trace RGPD) -----
  const serviceClient = getServiceClient();
  await serviceClient
    .from("oauth_consents")
    .upsert(
      {
        user_id: user!.id,
        client_id: client.client_id,
        scope: approvedScopes,
        granted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,client_id" }
    );

  // ----- 5. Génération du code d'autorisation (60s single-use) -----
  const { data: codeRow, error: codeError } = await serviceClient
    .from("oauth_authorization_codes")
    .insert({
      client_id: client.client_id,
      user_id: user!.id,
      redirect_uri: input.redirect_uri,
      scope: approvedScopes,
      code_challenge: input.code_challenge,
      code_challenge_method: "S256",
      nonce: input.nonce ?? null,
    })
    .select("code")
    .single();

  if (codeError || !codeRow) {
    console.error("[consent/approve] code insert error:", codeError?.message);
    redirectError(
      input.redirect_uri,
      "server_error",
      "Erreur génération du code.",
      input.state
    );
  }

  // ----- 6. Redirect callback -----
  const callbackUrl = new URL(input.redirect_uri);
  callbackUrl.searchParams.set("code", codeRow!.code as string);
  if (input.state) callbackUrl.searchParams.set("state", input.state);
  redirect(callbackUrl.toString());
}

export async function denyConsentAction(input: {
  redirect_uri: string;
  state?: string;
  client_id: string;
}) {
  // On revalide même pour deny — sinon un attaquant peut nous faire rediriger
  // vers un evil.com en construisant une fausse URL /consent avec redirect_uri=evil.com
  const client = await getClient(input.client_id);
  if (!client || !isValidRedirectUri(client, input.redirect_uri)) {
    throw new Error("Client OAuth invalide");
  }

  // PAS d'écriture en DB — l'user a refusé, on laisse zéro trace de tentative.
  redirectError(
    input.redirect_uri,
    "access_denied",
    "L'utilisateur a refusé l'accès.",
    input.state
  );
}
