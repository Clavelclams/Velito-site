/**
 * /oauth/consent — Consent screen RGPD-friendly.
 *
 * Affiche : "L'application X demande accès à : ton email, ton profil"
 * + boutons "Autoriser" / "Refuser".
 *
 * Defense jury CDA :
 *  - Page minimale, claire, en français
 *  - Liste les scopes demandés AVEC descriptions humaines
 *  - On garde la trace du consentement (RGPD : preuve de l'accord explicite)
 *  - Le user peut refuser → on respecte sa décision, zéro insistance, zéro
 *    dark pattern
 *  - Pas de "cookies analytics" sournois sur cette page (focus consent OAuth)
 *
 * Sécurité :
 *  - On revalide tous les params côté serveur (anti-tampering DevTools)
 *  - Le `redirect_uri` est validé MATCH EXACT contre la whitelist du client
 *  - L'user DOIT être loggé (redirect /login sinon)
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getClient, isValidRedirectUri, areScopesAllowed } from "@/lib/oauth/clients";
import { approveConsentAction, denyConsentAction } from "./actions";

export const dynamic = "force-dynamic";

interface SearchParams {
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  nonce?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

/**
 * Descriptions humaines des scopes (FR). Ce que l'user voit dans la liste.
 * Si on ajoute un scope plus tard (ex: "memberships.read") faut l'ajouter ici.
 */
const SCOPE_DESCRIPTIONS: Record<string, { title: string; detail: string }> = {
  openid: {
    title: "Identifier ton compte",
    detail: "L'app saura qui tu es (identifiant unique).",
  },
  email: {
    title: "Voir ton adresse email",
    detail: "L'app peut lire l'email associé à ton compte.",
  },
  profile: {
    title: "Voir ton profil public",
    detail: "L'app peut lire ton nom et ta photo si tu en as une.",
  },
};

function FatalError({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center text-white">
      <h1 className="text-2xl font-bold text-red-300">{title}</h1>
      <p className="mt-3 text-sm text-white/60">{message}</p>
      <Link
        href="/"
        className="mt-6 text-xs text-white/50 underline-offset-4 hover:text-white hover:underline"
      >
        Retour à l&apos;accueil Velito
      </Link>
    </main>
  );
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // ----- 1. Re-validation des params (paranoia : on ne fait pas confiance à la query) -----
  if (
    !params.client_id ||
    !params.redirect_uri ||
    !params.code_challenge ||
    params.code_challenge_method !== "S256"
  ) {
    return (
      <FatalError
        title="Demande invalide"
        message="Des paramètres OAuth sont manquants ou invalides."
      />
    );
  }

  const client = await getClient(params.client_id);
  if (!client) {
    return <FatalError title="Application inconnue" message="Aucune app n'est enregistrée avec cet identifiant." />;
  }

  if (!isValidRedirectUri(client, params.redirect_uri)) {
    return (
      <FatalError
        title="redirect_uri invalide"
        message="Cette URL de redirection n'est pas enregistrée pour ce client."
      />
    );
  }

  const requestedScopes = (params.scope ?? "openid").split(/\s+/).filter(Boolean);
  if (!areScopesAllowed(client, requestedScopes)) {
    return (
      <FatalError
        title="Scope non autorisé"
        message="Un ou plusieurs scopes demandés ne sont pas autorisés pour ce client."
      />
    );
  }

  // ----- 2. User doit être loggé -----
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Préserve les params dans le returnTo pour qu'on revienne ici après login
    const consentUrl = new URL("/oauth/consent", "http://x");
    Object.entries(params).forEach(([k, v]) => {
      if (v) consentUrl.searchParams.set(k, v);
    });
    const returnTo = consentUrl.pathname + consentUrl.search;
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center text-white">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Connexion requise</p>
        <h1 className="mt-3 text-2xl font-bold">Connecte-toi pour continuer</h1>
        <p className="mt-3 text-sm text-white/60">
          L&apos;app <strong>{client.name}</strong> demande l&apos;accès à ton compte Velito.
          Tu dois te connecter d&apos;abord pour décider.
        </p>
        <Link
          href={`/login?return=${encodeURIComponent(returnTo)}`}
          className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#04040e] transition hover:bg-white/90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  // ----- 3. Affichage du consent screen -----
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="w-full">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Autorisation</p>
          <h1 className="mt-3 text-2xl font-bold text-white md:text-3xl">
            {client.name} demande l&apos;accès
          </h1>
          {client.description && (
            <p className="mt-2 text-sm text-white/60">{client.description}</p>
          )}
          <p className="mt-4 text-xs text-white/40">
            Connecté en tant que <span className="text-white/70">{user.email}</span>
          </p>
        </header>

        {/* Liste des scopes demandés */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-3 text-xs uppercase tracking-wider text-white/50">
            Cette app pourra :
          </p>
          <ul className="space-y-3">
            {requestedScopes.map((scope) => {
              const meta = SCOPE_DESCRIPTIONS[scope] ?? {
                title: scope,
                detail: "Scope personnalisé.",
              };
              return (
                <li key={scope} className="flex items-start gap-3 text-sm">
                  <span aria-hidden="true" className="mt-0.5 text-emerald-300">✓</span>
                  <div>
                    <p className="font-semibold text-white">{meta.title}</p>
                    <p className="text-xs text-white/50">{meta.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Forms : approve & deny — 2 forms séparés parce que 2 actions distinctes */}
        <div className="mt-6 space-y-3">
          <form action={approveWithParams.bind(null, params, requestedScopes)}>
            <button
              type="submit"
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#04040e] transition hover:bg-white/90"
            >
              Autoriser {client.name}
            </button>
          </form>

          <form action={denyWithParams.bind(null, params)}>
            <button
              type="submit"
              className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              Refuser
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/40">
          En autorisant, tu acceptes que cette app accède aux données ci-dessus.
          Tu peux révoquer cet accès à tout moment depuis ton{" "}
          <Link href="/account" className="underline-offset-4 hover:underline">
            compte Velito
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

/**
 * Wrappers qui adaptent la signature des actions au pattern form-action de Next.js.
 * Next attend `(formData: FormData) => void` — on bind les params en amont.
 */
async function approveWithParams(
  params: SearchParams,
  requestedScopes: string[],
  _formData: FormData
) {
  "use server";
  await approveConsentAction({
    client_id: params.client_id!,
    redirect_uri: params.redirect_uri!,
    scope: params.scope ?? "openid",
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.code_challenge!,
    code_challenge_method: params.code_challenge_method!,
    // MVP : on approuve TOUS les scopes demandés. Plus tard on pourra
    // ajouter des checkboxes par scope dans le form.
    approved_scopes: requestedScopes.join(" "),
  });
}

async function denyWithParams(params: SearchParams, _formData: FormData) {
  "use server";
  await denyConsentAction({
    client_id: params.client_id!,
    redirect_uri: params.redirect_uri!,
    state: params.state,
  });
}
