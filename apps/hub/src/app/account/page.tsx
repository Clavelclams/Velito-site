/**
 * /account — Page de compte (Server Component).
 *
 * Lit la session Supabase côté serveur. Si pas loggé → redirect /login?return=/account
 * (le returnTo est ensuite consommé par signInAction → safeReturnTo).
 *
 * Affiche :
 *  - Identité : email + date création + id raccourci (debug)
 *  - Apps activées : liste depuis shared.app_memberships (RLS self_select)
 *  - Apps disponibles : celles qui n'apparaissent PAS encore dans memberships
 *  - Bouton Se déconnecter (réutilise signOutAction)
 *
 * Défense jury CDA : Server Component + RLS auth.uid()=user_id sur memberships
 * = le user ne peut voir QUE ses propres lignes (pas besoin de filtre WHERE
 * explicite, c'est Postgres qui filtre). Si on était en mode admin / vue cross-user,
 * il faudrait une vue/RPC SECURITY DEFINER dédiée.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";

/**
 * Catalogue des apps Velito (slug aligné avec le CHECK sur shared.app_memberships.app).
 * Sert à 2 usages : afficher les "activées" (intersection avec memberships) et lister
 * les "à découvrir" (différence).
 *
 * URLs : tous les sous-domaines sont en prod (au moins placeholder).
 *  - hub        → "/" (on est déjà sur le hub)
 *  - vea        → vea.velito.fr (prod live, site complet)
 *  - vena       → velito.fr (racine du domaine, PAS un sous-domaine — la SASU "porte" Velito)
 *  - interactive→ interactive.velito.fr (prod live, landing + dashboard)
 *  - arena      → arena.velito.fr (placeholder "bientôt disponible")
 *  - prevention → prevention.velito.fr (placeholder "coming soon")
 */
const APPS: { key: string; label: string; description: string; href: string }[] = [
  { key: "hub", label: "Hub Velito", description: "Point d'entrée de l'écosystème.", href: "/" },
  { key: "vea", label: "VEA", description: "Velito Esport Amiens (association).", href: "https://vea.velito.fr" },
  { key: "vena", label: "VENA", description: "Velito Expertise Numérique Amiens (agence).", href: "https://velito.fr" },
  { key: "interactive", label: "Interactive", description: "Jeux interactifs pour bars & lieux.", href: "https://interactive.velito.fr" },
  { key: "arena", label: "Arena", description: "Tournois & compétitions esport.", href: "https://arena.velito.fr" },
  { key: "prevention", label: "Prévention", description: "Sensibilisation & ateliers numériques.", href: "https://prevention.velito.fr" },
];

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();

  // 1. Session — si pas loggé, retour login avec returnTo
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?return=/account");
  }

  // 2. Apps activées par cet user (RLS filtre déjà à auth.uid())
  // .schema("shared") nécessite que "shared" soit dans Exposed schemas (Supabase Data API).
  const { data: memberships, error: membershipsError } = await supabase
    .schema("shared")
    .from("app_memberships")
    .select("app, role, joined_at")
    .order("joined_at", { ascending: true });

  if (membershipsError) {
    console.error("[/account] memberships fetch error :", membershipsError.message);
  }

  const activeApps = (memberships ?? []) as { app: string; role: string; joined_at: string }[];
  const activeKeys = new Set(activeApps.map((m) => m.app));
  const discoverApps = APPS.filter((a) => !activeKeys.has(a.key));

  // 3. Formatage email + dates (côté serveur — pas d'hydration mismatch)
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—";
  const shortId = user.id.slice(0, 8);

  return (
    <main className="min-h-screen bg-[#04040e] text-white pt-[110px] pb-20 px-4 md:px-[15%]">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-[Orbitron] text-3xl md:text-4xl font-black mb-2">
          Mon compte
        </h1>
        <p className="text-white/60 text-sm mb-10">
          Un seul compte pour toutes les apps de l&apos;écosystème Velito.
        </p>

        {/* ===== Identité ===== */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 mb-8">
          <h2 className="text-sm uppercase tracking-wider text-white/50 mb-4">
            Identité
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
            <dt className="text-white/50">Email</dt>
            <dd className="sm:col-span-2 break-all">{user.email}</dd>

            <dt className="text-white/50">Compte créé</dt>
            <dd className="sm:col-span-2">{createdAt}</dd>

            <dt className="text-white/50">Identifiant</dt>
            <dd className="sm:col-span-2 font-mono text-white/70">{shortId}…</dd>
          </dl>
        </section>

        {/* ===== Apps activées ===== */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 mb-8">
          <h2 className="text-sm uppercase tracking-wider text-white/50 mb-4">
            Apps activées
          </h2>
          {activeApps.length === 0 ? (
            <p className="text-sm text-white/60">
              Aucune app activée pour l&apos;instant. Ouvre une app ci-dessous, elle
              sera enregistrée automatiquement à ta première visite.
            </p>
          ) : (
            <ul className="space-y-3">
              {activeApps.map((m) => {
                const meta = APPS.find((a) => a.key === m.app);
                if (!meta) return null;
                return (
                  <li
                    key={m.app}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/5 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{meta.label}</p>
                      <p className="text-xs text-white/50">
                        Activée le {new Date(m.joined_at).toLocaleDateString("fr-FR")} ·
                        Rôle : {m.role}
                      </p>
                    </div>
                    <Link
                      href={meta.href}
                      className="shrink-0 text-sm px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
                    >
                      Ouvrir →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ===== Apps à découvrir ===== */}
        {discoverApps.length > 0 && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 mb-8">
            <h2 className="text-sm uppercase tracking-wider text-white/50 mb-4">
              À découvrir
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {discoverApps.map((a) => (
                <li
                  key={a.key}
                  className="rounded-xl border border-white/5 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                >
                  <p className="font-semibold">{a.label}</p>
                  <p className="text-xs text-white/50 mb-2">{a.description}</p>
                  <Link
                    href={a.href}
                    className="text-xs text-[#a78bfa] hover:text-white transition-colors"
                  >
                    Découvrir →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ===== Zone sensible : déconnexion ===== */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6">
          <h2 className="text-sm uppercase tracking-wider text-white/50 mb-2">
            Session
          </h2>
          <p className="text-sm text-white/60 mb-4">
            La déconnexion ferme ta session sur toutes les apps Velito qui
            partagent ce compte.
          </p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="bg-white text-[#04040e] text-sm px-4 py-2 rounded-full font-medium hover:bg-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              Se déconnecter
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
