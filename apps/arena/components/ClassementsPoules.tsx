/**
 * Tableaux de classement des poules — Server Component pur (aucun état).
 * Utilisé par l'admin ET par la page publique : un seul rendu, une seule
 * vérité. Le calcul vient de lib/poules.ts (pur et testé).
 */
import { classementPoule, pouleTerminee, type ResultatPoule } from "@/lib/poules";
import { lettrePoule } from "@/lib/arena/affichage";
import type { MatchRow } from "@/lib/arena/types";

interface Props {
  matchs: MatchRow[];
  pseudo: (id: string | null) => string;
  /** Nombre de qualifiés par poule — surligne la zone de qualification. */
  nbQualifies: number;
}

export default function ClassementsPoules({ matchs, pseudo, nbQualifies }: Props) {
  const matchsPoules = matchs.filter((m) => (m.bracket ?? "W") === "P");
  if (matchsPoules.length === 0) return null;

  const numeros = [...new Set(matchsPoules.map((m) => m.poule ?? 1))].sort(
    (a, b) => a - b
  );

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-arena-faint">
        Classements des poules
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {numeros.map((numero) => {
          const deLaPoule = matchsPoules.filter((m) => (m.poule ?? 1) === numero);
          const joueurs = [
            ...new Set(deLaPoule.flatMap((m) => [m.joueur1_id, m.joueur2_id])),
          ].filter((j): j is string => j !== null);

          const resultats: ResultatPoule[] = deLaPoule.map((m) => ({
            joueur1Id: m.joueur1_id,
            joueur2Id: m.joueur2_id,
            scoreJ1: m.score_j1,
            scoreJ2: m.score_j2,
            valide: m.statut === "VALIDE",
          }));

          const lignes = classementPoule(joueurs, resultats);
          const terminee = pouleTerminee(joueurs.length, resultats);

          return (
            <div
              key={numero}
              className="rounded-lg border border-arena-border bg-arena-surface shadow-carte p-4"
            >
              <h3 className="mb-2 flex items-center justify-between text-sm font-bold text-arena-lilac">
                Poule {lettrePoule(numero)}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    terminee
                      ? "bg-arena-green-pale text-arena-green"
                      : "bg-arena-surface text-arena-faint"
                  }`}
                >
                  {terminee ? "Terminée" : "En cours"}
                </span>
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-arena-faint">
                    <th className="pb-1 text-left font-medium">Joueur</th>
                    <th className="pb-1 text-right font-medium" title="Matchs joués">
                      J
                    </th>
                    <th className="pb-1 text-right font-medium" title="Victoires">
                      V
                    </th>
                    <th
                      className="pb-1 text-right font-medium"
                      title="Différence de score"
                    >
                      Diff
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, i) => (
                    <tr
                      key={l.joueurId}
                      className={
                        i < nbQualifies
                          ? "border-l-2 border-arena-green"
                          : "opacity-70"
                      }
                    >
                      <td className="py-1 pl-2 font-semibold">
                        {pseudo(l.joueurId)}
                      </td>
                      <td className="py-1 text-right text-arena-muted">{l.joues}</td>
                      <td className="py-1 text-right font-bold">{l.victoires}</td>
                      <td className="py-1 text-right text-arena-muted">
                        {l.difference > 0 ? `+${l.difference}` : l.difference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-arena-faint">
                Les {nbQualifies} premiers sont qualifiés.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
