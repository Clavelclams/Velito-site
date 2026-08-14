/**
 * /admin/imports — palmarès externe (Toornament).
 *
 * Le staff colle un lien de tournoi Toornament, choisit le joueur ARENA, et
 * le résultat vérifié (appariement par pseudo dans le classement Toornament)
 * s'affiche sur le profil public du joueur. Lecture seule : aucun point
 * ARENA n'est distribué (décision actée, migration 006).
 *
 * Server Component + <form> natifs, comme tout l'espace orga : la page
 * fonctionne sans JavaScript, l'action re-vérifie les droits de son côté.
 */
import {
  importerResultatToornament,
  supprimerResultatExterne,
} from "@/lib/arena/actions";
import { getServiceClient } from "@/lib/supabase/service";
import { libelleRang } from "@/lib/toornament";
import type { Joueur, ResultatExterne } from "@/lib/arena/types";
import BandeauErreur from "@/components/BandeauErreur";

const btn =
  "rounded-lg bg-arena-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-arena-violet-fonce";
const champ =
  "w-full rounded-lg border border-arena-border bg-arena-surface px-3 py-2 text-sm focus:border-arena-violet focus:outline-none";

export default async function PageImports({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const db = getServiceClient();

  // Service role : cette page est derrière le gate staff du layout /admin,
  // et les actions re-vérifient avec requireStaff. Les joueurs anonymisés
  // sont exclus du sélecteur : on n'importe rien sur un profil effacé.
  const [{ data: joueursData }, { data: resultatsData }] = await Promise.all([
    db
      .schema("arena")
      .from("joueurs")
      .select("id, pseudo")
      .eq("anonymise", false)
      .order("pseudo", { ascending: true }),
    db
      .schema("arena")
      .from("resultats_externes")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  const joueurs = (joueursData ?? []) as Pick<Joueur, "id" | "pseudo">[];
  const resultats = (resultatsData ?? []) as ResultatExterne[];
  const pseudoDe = new Map(joueurs.map((j) => [j.id, j.pseudo]));

  const cleConfiguree = Boolean(process.env.TOORNAMENT_API_KEY);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-black">
          Palmarès externe<span className="text-arena-violet">.</span>
        </h1>
        <p className="mt-2 text-sm text-arena-muted">
          Importe un résultat Toornament sur le profil d&apos;un joueur. Le
          résultat s&apos;affiche avec son lien source — il ne donne aucun
          point au classement ARENA.
        </p>
      </header>

      <BandeauErreur message={erreur} />

      {!cleConfiguree ? (
        <div className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-6 text-sm text-arena-muted">
          <p className="font-semibold text-arena-ink">
            Import non configuré sur ce déploiement.
          </p>
          <p className="mt-2">
            Pour l&apos;administrateur : ajouter la variable{" "}
            <code>TOORNAMENT_API_KEY</code> (clé gratuite à créer sur{" "}
            <a
              href="https://developer.toornament.com"
              className="underline hover:text-arena-ink"
            >
              developer.toornament.com
            </a>
            ), puis redéployer.
          </p>
        </div>
      ) : (
        <form
          action={importerResultatToornament}
          className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-semibold">
                Lien du tournoi Toornament
              </span>
              <input
                type="url"
                name="url"
                required
                placeholder="https://www.toornament.com/fr/tournaments/…"
                className={champ}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Joueur ARENA</span>
              <select name="joueur_id" required className={champ}>
                <option value="">— choisir —</option>
                {joueurs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.pseudo}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">
                Pseudo sur Toornament{" "}
                <span className="font-normal text-arena-faint">
                  (si différent)
                </span>
              </span>
              <input
                type="text"
                name="nom_participant"
                maxLength={100}
                placeholder="Par défaut : le pseudo ARENA"
                className={champ}
              />
            </label>
          </div>
          <button type="submit" className={`mt-4 ${btn}`}>
            Vérifier et importer
          </button>
          <p className="mt-3 text-xs text-arena-faint">
            L&apos;import est refusé si le pseudo n&apos;apparaît pas dans le
            classement du tournoi : pas de résultat sur parole.
          </p>
        </form>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
          Résultats importés
        </h2>
        {resultats.length === 0 ? (
          <p className="text-sm text-arena-faint">Aucun import pour l&apos;instant.</p>
        ) : (
          <ul className="space-y-2">
            {resultats.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-arena-border bg-arena-surface shadow-carte px-4 py-3"
              >
                <span className="text-sm">
                  <span className="font-bold">{pseudoDe.get(r.joueur_id) ?? "?"}</span>{" "}
                  <span className="text-arena-muted">
                    — {libelleRang(r.rang, r.nb_participants)} ·{" "}
                    <a
                      href={r.url}
                      rel="noopener noreferrer"
                      className="underline hover:text-arena-ink"
                    >
                      {r.nom_tournoi}
                    </a>
                    {r.jeu ? ` · ${r.jeu}` : ""}
                  </span>
                </span>
                <form action={supprimerResultatExterne}>
                  <input type="hidden" name="resultat_id" value={r.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-arena-faint hover:text-red-700"
                  >
                    Retirer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
