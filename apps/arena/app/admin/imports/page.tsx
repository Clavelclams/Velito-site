/**
 * /admin/imports — palmarès externe (Toornament).
 *
 * DEUX chemins d'entrée, un seul affichage public :
 *
 *  1. SAISIE MANUELLE (le chemin par défaut depuis le 15/08/2026) : le staff
 *     colle le lien du tournoi Toornament + le rang. Le lien source est
 *     affiché publiquement — vérifiable par n'importe qui en un clic.
 *     Pivot décidé quand l'accès API Toornament s'est révélé payant
 *     (plan « Arena », 229 €/mois — disproportionné pour de l'affichage).
 *
 *  2. IMPORT VÉRIFIÉ PAR API : ne s'affiche que si TOORNAMENT_API_KEY existe.
 *     Le code reste prêt et se réactive seul si une clé apparaît un jour
 *     (partenariat, changement de pricing).
 *
 * Server Component + <form> natifs, comme tout l'espace orga : la page
 * fonctionne sans JavaScript, les actions re-vérifient les droits.
 */
import {
  importerResultatToornament,
  saisirResultatExterne,
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
          Ajoute un résultat Toornament au profil d&apos;un joueur. Le lien
          source est affiché publiquement — vérifiable par tous — et le
          résultat ne donne aucun point au classement ARENA.
        </p>
      </header>

      <BandeauErreur message={erreur} />

      {/* ---- Saisie manuelle : le chemin par défaut ---- */}
      <form
        action={saisirResultatExterne}
        className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-6"
      >
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-arena-faint">
          Ajouter un résultat
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold">
              Lien du tournoi Toornament{" "}
              <span className="font-normal text-arena-faint">
                (obligatoire — c&apos;est la preuve)
              </span>
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
            <span className="mb-1 block font-semibold">Nom du tournoi</span>
            <input
              type="text"
              name="nom_tournoi"
              required
              maxLength={200}
              placeholder="Ex : Coupe d'hiver Amiens 2026"
              className={champ}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Rang final</span>
            <input
              type="number"
              name="rang"
              required
              min={1}
              placeholder="1 = vainqueur"
              className={champ}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">
              Participants{" "}
              <span className="font-normal text-arena-faint">(optionnel)</span>
            </span>
            <input
              type="number"
              name="nb_participants"
              min={2}
              placeholder="Ex : 16"
              className={champ}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">
              Jeu <span className="font-normal text-arena-faint">(optionnel)</span>
            </span>
            <input
              type="text"
              name="jeu"
              maxLength={100}
              placeholder="Ex : Fifa 23"
              className={champ}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">
              Date de fin{" "}
              <span className="font-normal text-arena-faint">(optionnel)</span>
            </span>
            <input type="date" name="date_fin" className={champ} />
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
          Ajouter au profil
        </button>
        <p className="mt-3 text-xs text-arena-faint">
          Vérifie le résultat sur la page publique du tournoi avant de saisir :
          le lien sera affiché à côté du résultat, tout le monde pourra
          contrôler.
        </p>
      </form>

      {/* ---- Import vérifié par API : seulement si une clé existe ---- */}
      {cleConfiguree && (
        <form
          action={importerResultatToornament}
          className="mt-6 rounded-lg border border-arena-border bg-arena-surface shadow-carte p-6"
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-arena-faint">
            Import vérifié (API Toornament)
          </h2>
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
            classement du tournoi.
          </p>
        </form>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
          Résultats enregistrés
        </h2>
        {resultats.length === 0 ? (
          <p className="text-sm text-arena-faint">Aucun résultat pour l&apos;instant.</p>
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
