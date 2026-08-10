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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cas 1 — app pas encore branchée à sa base (env absente) : état prévisible,
  // écran explicite. Convention écosystème : messages d'erreur DISTINGUÉS,
  // jamais un écran générique qui rend l'incident indiagnosticable.
  if (!configSupabasePresente()) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-black">
          Espace orga<span className="text-arena-violet">.</span>
        </h1>
        <p className="mt-4 text-gray-400">
          L&apos;application n&apos;est pas encore reliée à sa base de données.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Pour l&apos;administrateur : variables d&apos;environnement Supabase
          manquantes sur ce déploiement (voir <code>.env.example</code>).
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
        <p className="mt-4 text-gray-400">
          Accès réservé au staff. Connecte-toi avec ton compte Velito, puis
          reviens ici.
        </p>
        <a
          href={hubLogin}
          className="mt-6 inline-block rounded-lg bg-arena-violet px-5 py-2.5 font-semibold text-white hover:bg-arena-violet/80"
        >
          Se connecter via le hub
        </a>
        <p className="mt-4 text-xs text-gray-600">
          Connecté mais bloqué ? Ton compte n&apos;est pas encore membre staff —
          demande à un admin ARENA.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between border-b border-arena-border pb-4">
        <a href="/admin/tournois" className="font-black">
          ARENA <span className="text-gray-500">· {ctx.organisation.nom}</span>
        </a>
        <a href="/" className="text-sm text-gray-400 hover:text-white">
          Site public →
        </a>
      </header>
      {children}
    </div>
  );
}
