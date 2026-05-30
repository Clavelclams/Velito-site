/**
 * /oauth/authorize — Authorization Endpoint (RFC 6749 §4.1.1 + OIDC + PKCE).
 *
 * Flow Authorization Code + PKCE :
 *   1. Le client (ex: interactive.velito.fr) redirige le user navigateur ici
 *      avec en query : client_id, redirect_uri, response_type=code, scope,
 *      state, nonce, code_challenge, code_challenge_method=S256
 *   2. On valide tous les paramètres
 *   3. Si user pas loggé → on redirige vers /login?return=<authorize URL complète>
 *   4. Si user loggé + first-party → on génère un code et redirige vers
 *      redirect_uri?code=...&state=...
 *   5. Si user loggé + tiers-party sans consent valide → redirect /oauth/consent
 *      (Phase 4 implémentée — voir lignes 171-197 + apps/hub/src/app/oauth/consent/)
 *
 * Sécurité — points clés :
 *  - `redirect_uri` doit être dans la whitelist EXACTE du client (pas de glob)
 *  - `code_challenge_method` doit être "S256" (on REFUSE "plain")
 *  - `state` est passé tel quel au callback (anti-CSRF côté client)
 *  - Les codes générés expirent en 60s et sont single-use (DB level)
 *  - On NE log JAMAIS les paramètres OAuth en clair (peuvent contenir des secrets)
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getClient, isValidRedirectUri, areScopesAllowed } from "@/lib/oauth/clients";

export const dynamic = "force-dynamic";

interface SearchParams {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  scope?: string;
  state?: string;
  nonce?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

/**
 * Helper : redirige le user vers son callback avec une erreur OAuth standard
 * (RFC 6749 §4.1.2.1). Le `state` doit être préservé pour que le client
 * puisse matcher la réponse à sa request initiale.
 */
function redirectWithError(
  redirectUri: string,
  error: string,
  errorDescription: string,
  state?: string
): never {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", errorDescription);
  if (state) url.searchParams.set("state", state);
  redirect(url.toString());
}

/**
 * Erreur fatale AVANT validation du redirect_uri : on N'A PAS le droit de
 * rediriger vers une URL non validée (anti open-redirect). On affiche une
 * page d'erreur basique.
 */
function FatalError({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center text-white">
      <h1 className="text-2xl font-bold text-red-300">{title}</h1>
      <p className="mt-3 text-sm text-white/60">{message}</p>
      <p className="mt-6 text-xs text-white/40">
        Si tu es un développeur d&apos;app cliente : vérifie que ton{" "}
        <code>client_id</code> et <code>redirect_uri</code> sont enregistrés sur
        hub.velito.fr.
      </p>
    </main>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // ----- 1. Validations préalables (avant tout redirect) -----

  if (!params.client_id) {
    return <FatalError title="Paramètre manquant" message="client_id requis." />;
  }
  if (!params.redirect_uri) {
    return <FatalError title="Paramètre manquant" message="redirect_uri requis." />;
  }

  // Lookup du client
  const client = await getClient(params.client_id);
  if (!client) {
    return (
      <FatalError
        title="Client inconnu"
        message={`Aucune app n'est enregistrée avec le client_id "${params.client_id}".`}
      />
    );
  }

  // Validation du redirect_uri (MATCH EXACT, anti open-redirect)
  if (!isValidRedirectUri(client, params.redirect_uri)) {
    return (
      <FatalError
        title="redirect_uri invalide"
        message="Cette URL de redirection n'est pas enregistrée pour ce client."
      />
    );
  }

  // À partir d'ici, redirect_uri est validé → on peut renvoyer les erreurs via redirect

  // ----- 2. Validations OAuth (avec redirect d'erreur) -----

  if (params.response_type !== "code") {
    redirectWithError(
      params.redirect_uri,
      "unsupported_response_type",
      "Seul response_type=code est supporté.",
      params.state
    );
  }

  if (!params.code_challenge) {
    redirectWithError(
      params.redirect_uri,
      "invalid_request",
      "code_challenge requis (PKCE obligatoire).",
      params.state
    );
  }

  if (params.code_challenge_method !== "S256") {
    redirectWithError(
      params.redirect_uri,
      "invalid_request",
      "code_challenge_method doit être S256 (plain refusé).",
      params.state
    );
  }

  const scopes = (params.scope ?? "openid").split(/\s+/).filter(Boolean);
  if (!areScopesAllowed(client, scopes)) {
    redirectWithError(
      params.redirect_uri,
      "invalid_scope",
      "Un ou plusieurs scopes demandés ne sont pas autorisés pour ce client.",
      params.state
    );
  }

  // ----- 3. Auth check : user loggé ? -----

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Pas loggé → /login avec returnTo = URL authorize complète
    // (l'user revient ici après login, et on enchaîne)
    const returnTo = new URL("/oauth/authorize", "http://x"); // base ignored, on serialise les params
    Object.entries(params).forEach(([k, v]) => {
      if (v) returnTo.searchParams.set(k, v);
    });
    redirect(`/login?return=${encodeURIComponent(returnTo.pathname + returnTo.search)}`);
  }

  // ----- 4. Consent screen (Phase 4) -----
  // First-party (hub, interactive, arena, prevention, vena) : skip toujours.
  // Tiers-party : check si l'user a déjà consenti aux scopes demandés.
  //   - Oui ET scope ⊆ déjà consentis → skip, on génère le code direct
  //   - Non OU nouveau scope demandé → redirect /oauth/consent
  if (!client.is_first_party) {
    const consentClient = getServiceClient();
    const { data: existingConsent } = await consentClient
      .from("oauth_consents")
      .select("scope")
      .eq("user_id", user.id)
      .eq("client_id", client.client_id)
      .maybeSingle();

    const grantedScopes = existingConsent?.scope ?? [];
    const allRequestedAlreadyGranted = scopes.every((s) => grantedScopes.includes(s));

    if (!existingConsent || !allRequestedAlreadyGranted) {
      // Pas encore consenti OU nouveau scope demandé → consent screen
      // On préserve TOUS les params via query pour que /consent re-valide.
      const consentUrl = new URL("/oauth/consent", "http://x");
      Object.entries(params).forEach(([k, v]) => {
        if (v) consentUrl.searchParams.set(k, v);
      });
      redirect(consentUrl.pathname + consentUrl.search);
    }
    // Sinon : consent valide existant → on continue normalement (génère le code)
  }

  // ----- 5. Génération du code d'autorisation -----

  const serviceClient = getServiceClient();
  const { data: codeRow, error: codeError } = await serviceClient
    .from("oauth_authorization_codes")
    .insert({
      client_id: client.client_id,
      user_id: user.id,
      redirect_uri: params.redirect_uri,
      scope: scopes,
      code_challenge: params.code_challenge!,
      code_challenge_method: "S256",
      nonce: params.nonce ?? null,
    })
    .select("code")
    .single();

  if (codeError || !codeRow) {
    console.error("[oauth/authorize] code insert error:", codeError?.message);
    redirectWithError(
      params.redirect_uri,
      "server_error",
      "Erreur interne lors de la génération du code.",
      params.state
    );
  }

  // ----- 6. Redirect vers le callback du client avec ?code=...&state=... -----

  const callbackUrl = new URL(params.redirect_uri);
  callbackUrl.searchParams.set("code", codeRow!.code as string);
  if (params.state) callbackUrl.searchParams.set("state", params.state);
  redirect(callbackUrl.toString());
}
