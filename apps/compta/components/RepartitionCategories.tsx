/**
 * Répartition par catégorie sous forme de barres — composant SERVEUR.
 *
 * Chaque ligne : nom, barre proportionnelle (largeur = pourcentage), montant.
 * La largeur est un style INLINE (et non une classe Tailwind) car la valeur
 * est dynamique : Tailwind ne génère que des classes connues à la compilation.
 */
import type { LigneRepartition } from "@/lib/services/tableau-de-bord";
import { formaterCentimes } from "@/lib/services/montants";

export function RepartitionCategories({
  titre,
  lignes,
  couleurBarre,
}: {
  titre: string;
  lignes: LigneRepartition[];
  /** Classe de fond de la barre, ex : "bg-compta-depense". */
  couleurBarre: string;
}) {
  return (
    <div className="rounded-lg border border-compta-border bg-compta-surface p-5">
      <h3 className="mb-4 text-sm font-semibold">{titre}</h3>

      {lignes.length === 0 ? (
        <p className="text-sm text-compta-text-muted">Aucun mouvement.</p>
      ) : (
        <ul className="space-y-3">
          {lignes.map((l) => (
            <li key={l.nom}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span>{l.nom}</span>
                <span className="tabular-nums text-compta-text-muted">
                  {formaterCentimes(l.total)}
                  <span className="ml-2 text-xs">{l.pourcentage} %</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-compta-bg">
                <div
                  className={`h-full rounded-full ${couleurBarre}`}
                  style={{ width: `${l.pourcentage}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
