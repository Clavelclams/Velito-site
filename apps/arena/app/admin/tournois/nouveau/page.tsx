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
          <label htmlFor="titre" className="mb-1 block text-sm text-gray-400">
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
          <label htmlFor="jeu" className="mb-1 block text-sm text-gray-400">
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
          <label htmlFor="format" className="mb-1 block text-sm text-gray-400">
            Format *
          </label>
          <select id="format" name="format" required className={inputCls}>
            <option value="ELIMINATION_SIMPLE">
              Élimination simple (tout effectif)
            </option>
            <option value="DOUBLE_ELIMINATION">
              Double élimination (exactement 4, 8, 16 ou 32 joueurs)
            </option>
          </select>
          <p className="mt-1 text-xs text-gray-600">
            Double élimination : une défaite ne sort pas du tournoi — le
            rattrapage offre une seconde chance jusqu&apos;en grande finale.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="date_debut"
              className="mb-1 block text-sm text-gray-400"
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
              className="mb-1 block text-sm text-gray-400"
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
          <label htmlFor="lieu" className="mb-1 block text-sm text-gray-400">
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
            className="rounded-lg bg-arena-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-arena-violet/80"
          >
            Créer (en brouillon)
          </button>
          <a
            href="/admin/tournois"
            className="rounded-lg border border-arena-border px-5 py-2.5 text-sm text-gray-400 hover:text-white"
          >
            Annuler
          </a>
        </div>
        <p className="text-xs text-gray-600">
          Le tournoi est créé en BROUILLON : il n&apos;apparaît pas sur le site
          public tant que tu n&apos;ouvres pas les inscriptions.
        </p>
      </form>
    </div>
  );
}
