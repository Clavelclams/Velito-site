import { describe, expect, it } from "vitest";
import { calculerClassement, pointsDuTournoi } from "./classement";
import type { MatchRow } from "./types";

/** Petit constructeur de match pour garder les tests lisibles. */
function match(p: Partial<MatchRow> & Pick<MatchRow, "round" | "position">): MatchRow {
  return {
    id: `${p.round}-${p.position}`,
    tournoi_id: "t1",
    joueur1_id: null,
    joueur2_id: null,
    score_j1: null,
    score_j2: null,
    is_bye: false,
    gagnant_id: null,
    statut: "A_JOUER",
    ...p,
  };
}

// Tournoi à 4 joueurs terminé : A bat B en finale ; C et D perdent en demi.
const TOURNOI_4 = [
  match({ round: 1, position: 1, joueur1_id: "A", joueur2_id: "C", gagnant_id: "A", statut: "VALIDE" }),
  match({ round: 1, position: 2, joueur1_id: "B", joueur2_id: "D", gagnant_id: "B", statut: "VALIDE" }),
  match({ round: 2, position: 1, joueur1_id: "A", joueur2_id: "B", gagnant_id: "A", statut: "VALIDE" }),
];

describe("pointsDuTournoi", () => {
  it("applique le barème 3/2/1 sur un tournoi à 4", () => {
    const pts = pointsDuTournoi(TOURNOI_4);
    expect(pts.get("A")).toBe(3); // champion
    expect(pts.get("B")).toBe(2); // finaliste
    expect(pts.get("C")).toBe(1); // demi
    expect(pts.get("D")).toBe(1); // demi
  });

  it("ne donne AUCUN point si la finale n'est pas validée", () => {
    const enCours = TOURNOI_4.map((m) =>
      m.round === 2 ? { ...m, statut: "TERMINE" as const, gagnant_id: null } : m
    );
    expect(pointsDuTournoi(enCours).size).toBe(0);
  });

  it("bracket à 2 joueurs : champion +3, finaliste +2, pas de demi", () => {
    const duel = [
      match({ round: 1, position: 1, joueur1_id: "A", joueur2_id: "B", gagnant_id: "B", statut: "VALIDE" }),
    ];
    const pts = pointsDuTournoi(duel);
    expect(pts.get("B")).toBe(3);
    expect(pts.get("A")).toBe(2);
    expect(pts.size).toBe(2);
  });

  it("double élimination : barème calé sur la Grande finale et le rattrapage", () => {
    // 4 joueurs : A bat B et C en W ; B remonte le rattrapage, perd la GF.
    const double: MatchRow[] = [
      match({ round: 1, position: 1, bracket: "W", joueur1_id: "A", joueur2_id: "B", gagnant_id: "A", statut: "VALIDE" }),
      match({ round: 1, position: 2, bracket: "W", joueur1_id: "C", joueur2_id: "D", gagnant_id: "C", statut: "VALIDE" }),
      match({ round: 2, position: 1, bracket: "W", joueur1_id: "A", joueur2_id: "C", gagnant_id: "A", statut: "VALIDE" }),
      match({ round: 1, position: 1, bracket: "L", joueur1_id: "B", joueur2_id: "D", gagnant_id: "B", statut: "VALIDE" }),
      match({ round: 2, position: 1, bracket: "L", joueur1_id: "B", joueur2_id: "C", gagnant_id: "B", statut: "VALIDE" }),
      match({ round: 1, position: 1, bracket: "GF", joueur1_id: "A", joueur2_id: "B", gagnant_id: "A", statut: "VALIDE" }),
    ];
    const pts = pointsDuTournoi(double);
    expect(pts.get("A")).toBe(3); // champion (GF)
    expect(pts.get("B")).toBe(2); // finaliste (GF)
    expect(pts.get("C")).toBe(1); // 3e : perdant de la finale du rattrapage
    expect(pts.get("D")).toBe(1); // 4e : perdant de la demi du rattrapage
  });

  it("ignore les matchs de poule (régression du 12/08/2026)", () => {
    // Reproduit le tournoi « Test poules 8 joueurs » joué en prod : 3 journées
    // de poules (bracket 'P', round = numéro de JOURNÉE) puis une phase finale
    // à élimination directe (bracket 'W', rounds 1 et 2).
    // Avant correctif : Math.max(round) valait 3 (journée 3 de poule), la
    // « finale » détectée était un match de poule, et la vraie championne
    // n'apparaissait pas du tout au classement.
    const avecPoules: MatchRow[] = [
      match({ bracket: "P", poule: 1, round: 3, position: 0, joueur1_id: "Elias", joueur2_id: "Fanny", gagnant_id: "Fanny", statut: "VALIDE" }),
      match({ bracket: "P", poule: 1, round: 3, position: 1, joueur1_id: "Dina", joueur2_id: "FannyG", gagnant_id: "Dina", statut: "VALIDE" }),
      match({ bracket: "P", poule: 2, round: 3, position: 0, joueur1_id: "Aya", joueur2_id: "Hugo", gagnant_id: "Aya", statut: "VALIDE" }),
      match({ bracket: "W", round: 1, position: 0, joueur1_id: "Fanny", joueur2_id: "Hugo", gagnant_id: "Fanny", statut: "VALIDE" }),
      match({ bracket: "W", round: 1, position: 1, joueur1_id: "Aya", joueur2_id: "Elias", gagnant_id: "Aya", statut: "VALIDE" }),
      match({ bracket: "W", round: 2, position: 0, joueur1_id: "Fanny", joueur2_id: "Aya", gagnant_id: "Aya", statut: "VALIDE" }),
    ];
    const pts = pointsDuTournoi(avecPoules);
    expect(pts.get("Aya")).toBe(3); // championne
    expect(pts.get("Fanny")).toBe(2); // finaliste
    expect(pts.get("Hugo")).toBe(1); // demi-finaliste
    expect(pts.get("Elias")).toBe(1); // demi-finaliste
    expect(pts.size).toBe(4); // aucun point pour les éliminés en poule
  });

  it("un bye en demi ne crédite personne", () => {
    const avecBye = [
      match({ round: 1, position: 1, joueur1_id: "A", joueur2_id: null, is_bye: true, gagnant_id: "A", statut: "VALIDE" }),
      match({ round: 1, position: 2, joueur1_id: "B", joueur2_id: "C", gagnant_id: "B", statut: "VALIDE" }),
      match({ round: 2, position: 1, joueur1_id: "A", joueur2_id: "B", gagnant_id: "A", statut: "VALIDE" }),
    ];
    const pts = pointsDuTournoi(avecBye);
    expect(pts.get("A")).toBe(3);
    expect(pts.get("B")).toBe(2);
    expect(pts.get("C")).toBe(1);
    expect(pts.size).toBe(3);
  });
});

describe("calculerClassement", () => {
  it("agrège plusieurs tournois et trie par points puis titres", () => {
    // Tournoi 2 : B bat A en finale (2 joueurs).
    const t2 = [
      match({ round: 1, position: 1, joueur1_id: "A", joueur2_id: "B", gagnant_id: "B", statut: "VALIDE" }),
    ];
    const classement = calculerClassement([TOURNOI_4, t2]);
    // A : 3 + 2 = 5 pts, 1 titre — B : 2 + 3 = 5 pts, 1 titre → égalité
    // parfaite points/titres, départage aux finales (2 partout) → ordre stable.
    expect(classement[0]!.points).toBe(5);
    expect(classement[1]!.points).toBe(5);
    const c = classement.find((l) => l.joueurId === "C")!;
    expect(c.points).toBe(1);
    expect(c.tournoisComptes).toBe(1);
  });

  it("sport par équipes : les points vont à chaque membre de la paire", () => {
    // Tournoi de padel à 4 paires. Les camps sont des ÉQUIPES : les colonnes
    // joueur* restent nulles (contrainte matchs_camps_homogenes).
    const eq = (p: {
      round: number;
      position: number;
      e1: string;
      e2: string;
      gagnante: string;
    }): MatchRow =>
      match({
        round: p.round,
        position: p.position,
        equipe1_id: p.e1,
        equipe2_id: p.e2,
        equipe_gagnante_id: p.gagnante,
        statut: "VALIDE",
      });

    const padel = [
      eq({ round: 1, position: 0, e1: "EQ_A", e2: "EQ_B", gagnante: "EQ_A" }),
      eq({ round: 1, position: 1, e1: "EQ_C", e2: "EQ_D", gagnante: "EQ_C" }),
      eq({ round: 2, position: 0, e1: "EQ_A", e2: "EQ_C", gagnante: "EQ_A" }),
    ];

    const membres = new Map([
      ["EQ_A", ["clavel", "aya"]],
      ["EQ_B", ["bilal", "cyril"]],
      ["EQ_C", ["dina", "elias"]],
      ["EQ_D", ["fanny", "gaspard"]],
    ]);

    const classement = calculerClassement([padel], membres);
    const points = (id: string) =>
      classement.find((l) => l.joueurId === id)?.points ?? 0;

    // Les DEUX joueurs de la paire victorieuse marquent 3 points chacun.
    expect(points("clavel")).toBe(3);
    expect(points("aya")).toBe(3);
    // Paire finaliste : 2 points chacun.
    expect(points("dina")).toBe(2);
    expect(points("elias")).toBe(2);
    // Paire éliminée en demi-finale : 1 point chacun.
    expect(points("bilal")).toBe(1);
    expect(points("gaspard")).toBe(1);
    // Aucun identifiant d'ÉQUIPE ne doit apparaître dans un classement de joueurs.
    expect(classement.some((l) => l.joueurId.startsWith("EQ_"))).toBe(false);
    expect(classement).toHaveLength(8);
  });

  it("ignore les tournois sans finale validée", () => {
    const enCours = TOURNOI_4.map((m) =>
      m.round === 2 ? { ...m, statut: "A_JOUER" as const, gagnant_id: null } : m
    );
    expect(calculerClassement([enCours])).toHaveLength(0);
  });
});
