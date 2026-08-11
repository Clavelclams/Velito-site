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

  it("ignore les tournois sans finale validée", () => {
    const enCours = TOURNOI_4.map((m) =>
      m.round === 2 ? { ...m, statut: "A_JOUER" as const, gagnant_id: null } : m
    );
    expect(calculerClassement([enCours])).toHaveLength(0);
  });
});
