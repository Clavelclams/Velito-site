/**
 * Format JSON « arena-export-v2 » d'un tournoi — construit à UN seul endroit
 * (14/11/2026), utilisé par l'export public /api/export/[token] et par l'API
 * /api/v1/tournois/[token]. Les deux disent donc toujours la même chose.
 *
 * v2 (09/09/2026) : équipes et leurs membres, nom du tour, terrain, camps
 * résolus joueurs OU équipes. Champs de la v1 conservés (compatibilité).
 * 14/11/2026 : champ `sets` ajouté sur chaque match (compatible : null si
 * pas de détail).
 */
import type { TournoiPublic } from "./chargement-public";
import { libelleTour } from "./mon-match";
import { lireSets } from "./sets";

export function construireExportV2(donnees: TournoiPublic) {
  const { tournoi, participants, matchs, equipes, nom, nbRounds } = donnees;
  const parEquipes = (tournoi.taille_equipe ?? 1) > 1;

  return {
    format: "arena-export-v2",
    exporte_le: new Date().toISOString(),
    tournoi: {
      titre: tournoi.titre,
      jeu: tournoi.jeu,
      discipline: tournoi.discipline ?? "ESPORT",
      format: tournoi.format,
      taille_equipe: tournoi.taille_equipe ?? 1,
      statut: tournoi.statut,
      date_debut: tournoi.date_debut,
      lieu: tournoi.lieu,
    },
    participants: participants.map((p) => ({
      pseudo: p.pseudo,
      check_in: p.check_in,
    })),
    // Vide en esport individuel : le champ existe quand même, pour qu'un
    // consommateur n'ait pas deux formats à gérer.
    equipes: equipes.map((e) => ({ nom: e.nom, membres: e.membres })),
    matchs: matchs
      // Les byes sont un artefact du bracket, pas un résultat.
      .filter((m) => !m.is_bye)
      .map((m) => {
        const c1 = parEquipes ? m.equipe1_id : m.joueur1_id;
        const c2 = parEquipes ? m.equipe2_id : m.joueur2_id;
        const g = parEquipes ? m.equipe_gagnante_id : m.gagnant_id;
        return {
          tour: libelleTour(m, nbRounds),
          round: m.round,
          position: m.position,
          bracket: m.bracket ?? "W",
          poule: m.poule ?? null,
          camp1: c1 ? nom(c1) : null,
          camp2: c2 ? nom(c2) : null,
          score_camp1: m.score_j1,
          score_camp2: m.score_j2,
          sets: lireSets(m.sets),
          gagnant: g ? nom(g) : null,
          terrain: m.terrain ?? null,
          statut: m.statut,
          // Champs v1 conservés (esport individuel uniquement).
          joueur1: m.joueur1_id ? nom(m.joueur1_id) : null,
          joueur2: m.joueur2_id ? nom(m.joueur2_id) : null,
          score_j1: m.score_j1,
          score_j2: m.score_j2,
        };
      }),
  };
}
