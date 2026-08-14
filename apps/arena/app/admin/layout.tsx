/**
 * Layout de l'espace orga /admin — LE gate d'accès UI.
 *
 * Server Component : on vérifie ici, côté serveur, que l'utilisateur est
 * connecté (session SSO .velito.fr) ET membre staff d'une organisation.
 * Sinon → écran d'accès refusé avec lien vers le login du hub.
 *
 * Les Server Actions re-vérifient de leur côté (requireStaff) : la sécurité
 * ne repose JAMAIS uniquement sur l'UI.
 */
import { configSupabasePresente, getContexteStaff } from "@/lib/arena/auth";

/**
 * ⚠️ NE PAS RETIRER — incident du 12/08/2026.
 *
 * Sans cette ligne, Next.js rend cette page AU MOMENT DU BUILD et met le HTML
 * obtenu en cache. Le premier `if` ci-dessous n'utilise aucune API dynamique
 * (pas de cookies, pas d'en-têtes) : quand il est vrai, la fonction retourne
 * avant même de lire les cookies, donc Next considère la page comme statique
 * et la fige.
 *
 * Ce qui s'est passé en production : au build, Turborepo masquait
 * SUPABASE_ANON_KEY (variable absente de la liste `env` de turbo.json). La
 * vérification échouait, l'écran « application pas reliée à sa base » était
 * prérendu, et il restait servi ENSUITE à chaque visite — alors que la
 * variable était bien présente à l'exécution et que tout le site public
 * fonctionnait. Un symptôme parfaitement trompeur : le message parlait d'une
 * config manquante qui, au moment où on le lisait, ne manquait plus.
 *
 * `force-dynamic` impose un rendu à CHAQUE requête. C'est de toute façon
 * obligatoire pour un espace authentifié : son contenu dépend de qui regarde,
 * il n'a rien à faire dans un cache partagé.
 */
export const dynamic = "force-dynamic";

/** Variables attendues, pour un diagnostic précis à l'écran. */
function variablesManquantes(): string[] {
  const manquantes: string[] = [];
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    manquantes.push("SUPABASE_URL");
  }
  if (!process.env.SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    manquantes.push("SUPABASE_ANON_KEY");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    manquantes.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  return manquantes;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cas 1 — app pas encore branchée à sa base (env absente) : état prévisible,
  // écran explicite. Convention écosystème : messages d'erreur DISTINGUÉS,
  // jamais un écran générique qui rend l'incident indiagnosticable.
  if (!configSupabasePresente()) {
    const manquantes = variablesManquantes();
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-black">
          Espace orga<span className="text-arena-violet">.</span>
        </h1>
        <p className="mt-4 text-arena-muted">
          L&apos;application n&apos;est pas encore reliée à sa base de données.
        </p>
        <p className="mt-2 text-sm text-arena-faint">
          Pour l&apos;administrateur : variables d&apos;environnement Supabase
          manquantes sur ce déploiement (voir <code>.env.example</code>).
        </p>
        {/* On affiche les NOMS des variables absentes, jamais leur valeur.
            Un nom de variable n'est pas un secret, et sans lui le diagnostic
            se fait à l'aveugle. */}
        {manquantes.length > 0 && (
          <ul className="mt-4 inline-block rounded-lg border border-arena-border bg-arena-surface px-4 py-3 text-left text-xs text-arena-muted">
            {manquantes.map((nom) => (
              <li key={nom} className="font-mono">
                {nom}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-arena-faint">
          Dans un monorepo Turborepo, une variable doit aussi figurer dans la
          liste <code>env</code> de <code>turbo.json</code> pour être visible
          pendant le build.
        </p>
      </div>
    );
  }

  const ctx = await getContexteStaff();

  if (!ctx) {
    const hubLogin =
      process.env.NEXT_PUBLIC_HUB_LOGIN_URL ?? "https://hub.velito.fr/login";
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-black">
          Espace orga<span className="text-arena-violet">.</span>
        </h1>
        <p className="mt-4 text-arena-muted">
          Accès réservé au staff. Connecte-toi avec ton compte Velito, puis
          reviens ici.
        </p>
        <a
          href={hubLogin}
          className="mt-6 inline-block rounded-lg bg-arena-violet px-5 py-2.5 font-semibold text-white hover:bg-arena-violet-fonce"
        >
          Se connecter via le hub
        </a>
        <p className="mt-4 text-xs text-arena-faint">
          Connecté mais bloqué ? Ton compte n&apos;est pas encore membre du staff.
          Demande à un admin ARENA de t&apos;ajouter.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-arena-border pb-4">
        <a href="/admin/tournois" className="font-black">
          ARENA{" "}
          <span className="text-arena-faint">
            · {ctx.organisations.map((o) => o.name).join(" · ")}
          </span>
        </a>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/admin/tournois" className="text-arena-muted hover:text-arena-ink">
            Tournois
          </a>
          <a href="/admin/imports" className="text-arena-muted hover:text-arena-ink">
            Palmarès externe
          </a>
          <a href="/" className="text-arena-muted hover:text-arena-ink">
            Site public →
          </a>
        </nav>
      </header>
      {children}
    </div>
  );
}
