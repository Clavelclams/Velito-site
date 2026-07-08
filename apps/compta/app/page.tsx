/**
 * Accueil — Server Component. Premier écran réel du Lot 1.
 *
 * Démontre la chaîne complète en une page :
 *   middleware (session) → page (présentation) → repository (accès données)
 *   → Postgres + RLS (cloisonnement).
 *
 * Les données sont chargées CÔTÉ SERVEUR avant l'envoi du HTML : pas de
 * spinner, pas de requête visible dans le navigateur, et la clé de session
 * ne quitte pas le serveur.
 */
import Link from "next/link";
import { listerEntites } from "@/lib/repositories/entites";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecterAction } from "./login/actions";

export default async function AccueilPage() {
  const supabase = await createClient();

  // Le middleware a déjà bloqué les non-connectés ; on relit l'utilisateur
  // pour afficher son email (et par défense en profondeur).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const entites = await listerEntites(supabase);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* ---- En-tête : identité + déconnexion ---- */}
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Velito Compta</h1>
          <p className="text-sm text-compta-text-muted">{user?.email}</p>
        </div>
        {/* Une server action peut être l'action d'un <form> : zéro JS client
            nécessaire pour se déconnecter. */}
        <form action={seDeconnecterAction}>
          <button
            type="submit"
            className="rounded-md border border-compta-border px-3 py-1.5 text-sm transition-colors hover:bg-compta-surface"
          >
            Se déconnecter
          </button>
        </form>
      </header>

      {/* ---- Sélecteur d'entité ---- */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Mes structures</h2>

        {entites.length === 0 ? (
          <div className="rounded-md border border-compta-border bg-compta-surface p-6 text-sm text-compta-text-muted">
            Aucune entité pour l&apos;instant. Exécute le seed commenté en bas
            de <code>sql/01_schema_noyau.sql</code> (Supabase &gt; SQL Editor)
            pour créer VEA et VENA.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {entites.map((entite) => (
              <li key={entite.id}>
                {/* La carte est un LIEN vers l'espace de l'entité
                    (/[entiteId]). Le layout de cette route chargera l'entité
                    et affichera sa navigation. */}
                <Link
                  href={`/${entite.id}`}
                  className="block rounded-lg border border-compta-border bg-compta-surface p-5 transition-colors hover:border-compta-accent hover:bg-compta-bg"
                >
                  <p className="text-xl font-bold">{entite.nom}</p>
                  <p className="mt-1 text-sm text-compta-text-muted">
                    {entite.type_juridique === "association"
                      ? "Association loi 1901"
                      : "Société (SASU)"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
