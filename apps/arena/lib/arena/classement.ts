/**
 * Classement esport par POINTS CUMULÉS — logique pure, testée.
 *
 * Barème (feuille de route, décision actée §9) :
 *   Champion du tournoi  : +3
 *   Finaliste (perdant)  : +2
 *   Top 4 (demi-finales) : +1 chacun
 *
 * Pourquoi pas un ELO côté esport : décision actée — les points cumulés
 * récompensent la PARTICIPATION dans la durée (esprit associatif), là où
 * l'ELO mesure une force relative (réservé au module sport).
 *
 * Un tournoi ne compte que si sa finale est VALIDÉE (sinon pas de champion).
 */
import type { MatchRow } from "./types";

export interface LigneClassement {
  joueurId: string;
  points: number;
  titres: number; // nombre de tournois gagnés
  finales: number; // finales jouées (gagnées ou perdues)
  tournoisComptes: number; // tournois où le joueur a marqué au moins 1 point
}

/** Résultat d'UN tournoi : qui marque combien. */
export function pointsDuTournoi(matchs: MatchRow[]): Map<string, number> {
  const points = new Map<string, number>();
  if (matchs.length === 0) return points;

  const nbRounds = Math.max(...matchs.map((m) => m.round));
  const finale = matchs.find((m) => m.round === nbRounds);
  // Pas de finale validée → tournoi non terminé sportivement → 0 point.
  if (!finale || finale.statut !== "VALIDE" || !finale.gagnant_id) return points;

  const ajouter = (joueurId: string | null, pts: number) => {
    if (!joueurId) return;
    points.set(joueurId, (points.get(joueurId) ?? 0) + pts);
  };

  // Champion +3
  ajouter(finale.gagnant_id, 3);
  // Finaliste perdant +2
  const finaliste =
    finale.joueur1_id === finale.gagnant_id ? finale.joueur2_id : finale.joueur1_id;
  ajouter(finaliste, 2);
  // Demi-finales : les PERDANTS validés prennent +1 (les gagnants sont déjà
  // en finale). Sur un bracket à 2 joueurs il n'y a pas de demi → rien.
  if (nbRounds >= 2) {
    for (const m of matchs) {
      if (m.round !== nbRounds - 1 || m.statut !== "VALIDE" || !m.gagnant_id) continue;
      const perdant = m.joueur1_id === m.gagnant_id ? m.joueur2_id : m.joueur1_id;
      // Un bye en demi (perdant null) ne rapporte de point à personne.
      ajouter(perdant, 1);
    }
  }
  return points;
}

/** Agrège plusieurs tournois en classement trié (points ↓ puis titres ↓). */
export function calculerClassement(
  matchsParTournoi: MatchRow[][]
): LigneClassement[] {
  const lignes = new Map<string, LigneClassement>();

  const ligne = (joueurId: string): LigneClassement => {
    let l = lignes.get(joueurId);
    if (!l) {
      l = { joueurId, points: 0, titres: 0, finales: 0, tournoisComptes: 0 };
      lignes.set(joueurId, l);
    }
    return l;
  };

  for (const matchs of matchsParTournoi) {
    const pts = pointsDuTournoi(matchs);
    if (pts.size === 0) continue;

    for (const [joueurId, p] of pts) {
      const l = ligne(joueurId);
      l.points += p;
      l.tournoisComptes += 1;
      if (p >= 3) l.titres += 1;
      if (p >= 2) l.finales += 1; // champion et finaliste ont joué la finale
    }
  }

  return [...lignes.values()].sort(
    (a, b) => b.points - a.points || b.titres - a.titres || b.finales - a.finales
  );
}
