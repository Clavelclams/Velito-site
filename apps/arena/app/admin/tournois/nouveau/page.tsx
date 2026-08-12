/**
 * Création d'un tournoi — formulaire HTML natif branché sur la Server Action
 * `creerTournoi`. Pas de useState, pas de fetch : le <form action={...}>
 * envoie le FormData directement à la fonction serveur, qui valide, insère
 * en base et redirige vers la page du tournoi.
 */
import { creerTournoi } from "@/lib/arena/actions";
import { JEUX_SUGGERES } from "@/lib/arena/jeux";
import BandeauErreur from "@/components/BandeauErreur";

const inputCls =
  "w-full rounded-lg border border-arena-border bg-arena-bg px-3 py-2 text-sm focus:border-arena-violet focus:outline-none";

export default async function NouveauTournoi({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-black">Nouveau tournoi</h1>
      <BandeauErreur message={erreur} />

      <form action={creerTournoi} className="space-y-4">
        <div>
          <label htmlFor="titre" className="mb-1 block text-sm text-arena-muted">
            Titre *
          </label>
          <input
            id="titre"
            name="titre"
            required
            minLength={3}
            placeholder="Tournoi de la rentrée VEA"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="jeu" className="mb-1 block text-sm text-arena-muted">
            Jeu *
          </label>
          {/* datalist = autocomplétion native (zéro JS) adossée à une liste
              maîtrisée → données propres, mais saisie libre toujours possible
              pour un jeu hors liste. Normalisation finale côté serveur. */}
          <input
            id="jeu"
            name="jeu"
            required
            list="jeux-suggeres"
            placeholder="Street Fighter 6, Rocket League…"
            className={inputCls}
          />
          <datalist id="jeux-suggeres">
            {JEUX_SUGGERES.map((j) => (
              <option key={j} value={j} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="format" className="mb-1 block text-sm text-arena-muted">
            Format *
          </label>
          <select id="format" name="format" required className={inputCls}>
            <option value="ELIMINATION_SIMPLE">
              Élimination simple (tout effectif)
            </option>
            <option value="DOUBLE_ELIMINATION">
              Double élimination (exactement 4, 8, 16 ou 32 joueurs)
            </option>
            <option value="POULES_FINALE">
              Poules + phase finale (tout le monde joue plusieurs matchs)
            </option>
          </select>
          <p className="mt-1 text-xs text-arena-faint">
            Double élimination : une défaite ne sort pas du tournoi. Le rattrapage
            offre une seconde chance jusqu&apos;en grande finale.
            Poules : chacun affronte tous les joueurs de sa poule, puis les
            meilleurs disputent une phase finale à élimination directe.
          </p>
        </div>

        {/* Config poules — toujours visible (zéro JS) mais ignorée par le
            serveur si un autre format est choisi. */}
        <fieldset className="rounded-lg border border-arena-border p-4">
          <legend className="px-2 text-xs uppercase tracking-widest text-arena-faint">
            Si format « poules »
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="nb_poules"
                className="mb-1 block text-sm text-arena-muted"
              >
                Nombre de poules
              </label>
              <input
                id="nb_poules"
                name="nb_poules"
                type="number"
                min={1}
                max={16}
                defaultValue={2}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-arena-faint">
                Un nombre pair évite que deux joueurs d&apos;une même poule se
                croisent dès le premier tour.
              </p>
            </div>
            <div>
              <label
                htmlFor="nb_qualifies_par_poule"
                className="mb-1 block text-sm text-arena-muted"
              >
                Qualifiés par poule
              </label>
              <select
                id="nb_qualifies_par_poule"
                name="nb_qualifies_par_poule"
                defaultValue="2"
                className={inputCls}
              >
                <option value="1">1er de chaque poule</option>
                <option value="2">2 premiers de chaque poule</option>
              </select>
            </div>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="date_debut"
              className="mb-1 block text-sm text-arena-muted"
            >
              Date et heure *
            </label>
            <input
              id="date_debut"
              name="date_debut"
              type="datetime-local"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label
              htmlFor="max_joueurs"
              className="mb-1 block text-sm text-arena-muted"
            >
              Joueurs max
            </label>
            <input
              id="max_joueurs"
              name="max_joueurs"
              type="number"
              min={2}
              max={128}
              placeholder="32"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label htmlFor="lieu" className="mb-1 block text-sm text-arena-muted">
            Lieu
          </label>
          <input
            id="lieu"
            name="lieu"
            placeholder="Local VEA, Amiens"
            className={inputCls}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg bg-arena-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-arena-violet-fonce"
          >
            Créer (en brouillon)
          </button>
          <a
            href="/admin/tournois"
            className="rounded-lg border border-arena-border px-5 py-2.5 text-sm text-arena-muted hover:text-arena-ink"
          >
            Annuler
          </a>
        </div>
        <p className="text-xs text-arena-faint">
          Le tournoi est créé en BROUILLON : il n&apos;apparaît pas sur le site
          public tant que tu n&apos;ouvres pas les inscriptions.
        </p>
      </form>
    </div>
  );
}
