/**
 * Tests des stats maison. Chaque cas correspond à une réalité de tournoi :
 * un duel esport, une paire de padel, un bye, un score non validé.
 */
import { describe, expect, it } from "vitest";
import { calculerStatsJoueur, type TournoiJoue } from "./stats";
import type { MatchRow } from "./types";

function m(p: Partial<MatchRow>): MatchRow {
  return {
    id: p.id ?? "m",
    tournoi_id: "t",
    bracket: p.bracket ?? "W",
    poule: p.poule ?? null,
    round: p.round ?? 1,
    position: p.position ?? 0,
    joueur1_id: p.joueur1_id ?? null,
    joueur2_id: p.joueur2_id ?? null,
    score_j1: p.score_j1 ?? null,
    score_j2: p.score_j2 ?? null,
    is_bye: p.is_bye ?? false,
    gagnant_id: p.gagnant_id ?? null,
    statut: p.statut ?? "VALIDE",
    equipe1_id: p.equipe1_id ?? null,
    equipe2_id: p.equipe2_id ?? null,
    equipe_gagnante_id: p.equipe_gagnante_id ?? null,
  };
}

function tournoi(p: Partial<TournoiJoue>): TournoiJoue {
  return { jeu: p.jeu ?? "Jeu", matchs: p.matchs ?? [], mesIds: p.mesIds ?? ["moi"], membresParEquipe: p.membresParEquipe };
}

describe("calculerStatsJoueur", () => {
  it("compte victoires, défaites et winrate sur un duel esport", () => {
    const s = calculerStatsJoueur([
      tournoi({
        jeu: "Street Fighter 6",
        matchs: [
          m({ id: "1", joueur1_id: "moi", joueur2_id: "a", gagnant_id: "moi" }),
          m({ id: "2", joueur1_id: "moi", joueur2_id: "b", gagnant_id: "b" }),
        ],
      }),
    ]);
    expect(s.matchsJoues).toBe(2);
    expect(s.victoires).toBe(1);
    expect(s.defaites).toBe(1);
    expect(s.winrate).toBe(50);
    expect(s.parJeu).toEqual([
      { jeu: "Street Fighter 6", joues: 2, victoires: 1, defaites: 1, winrate: 50 },
    ]);
  });

  it("winrate = null (pas 0 %) quand aucun match n'est joué", () => {
    const s = calculerStatsJoueur([tournoi({ matchs: [] })]);
    expect(s.winrate).toBeNull();
    expect(s.matchsJoues).toBe(0);
  });

  it("ignore les byes et les scores non validés", () => {
    const s = calculerStatsJoueur([
      tournoi({
        matchs: [
          m({ id: "bye", joueur1_id: "moi", is_bye: true, gagnant_id: "moi" }),
          m({ id: "saisi", joueur1_id: "moi", joueur2_id: "a", statut: "TERMINE" }),
        ],
      }),
    ]);
    expect(s.matchsJoues).toBe(0);
  });

  it("résout l'équipe adverse en JOUEURS au padel", () => {
    // Ma paire (moi+part) bat la paire adverse (x+y) : x et y comptent
    // chacun comme un adversaire affronté et battu.
    const membres = new Map<string, readonly string[]>([
      ["eqA", ["moi", "part"]],
      ["eqB", ["x", "y"]],
    ]);
    const s = calculerStatsJoueur([
      tournoi({
        jeu: "Padel",
        mesIds: ["moi", "eqA"],
        membresParEquipe: membres,
        matchs: [m({ equipe1_id: "eqA", equipe2_id: "eqB", equipe_gagnante_id: "eqA" })],
      }),
    ]);
    expect(s.victoires).toBe(1);
    expect(s.adversaires).toEqual([
      { joueurId: "x", rencontres: 1, victoires: 1 },
      { joueurId: "y", rencontres: 1, victoires: 1 },
    ]);
    // Mon coéquipier n'est PAS un adversaire, c'est un partenaire.
    expect(s.partenaires).toEqual([{ joueurId: "part", tournois: 1 }]);
  });

  it("compte les partenaires en TOURNOIS partagés, pas en matchs", () => {
    const membres = new Map<string, readonly string[]>([["eqA", ["moi", "part"]], ["eqB", ["x", "y"]]]);
    const s = calculerStatsJoueur([
      tournoi({
        mesIds: ["moi", "eqA"],
        membresParEquipe: membres,
        // 3 matchs dans le même tournoi avec le même partenaire → 1 tournoi.
        matchs: [
          m({ id: "1", equipe1_id: "eqA", equipe2_id: "eqB", equipe_gagnante_id: "eqA" }),
          m({ id: "2", equipe1_id: "eqA", equipe2_id: "eqB", equipe_gagnante_id: "eqB" }),
          m({ id: "3", equipe1_id: "eqA", equipe2_id: "eqB", equipe_gagnante_id: "eqA" }),
        ],
      }),
    ]);
    expect(s.partenaires).toEqual([{ joueurId: "part", tournois: 1 }]);
    // Mais les adversaires, eux, comptent bien match par match.
    expect(s.adversaires[0]).toEqual({ joueurId: "x", rencontres: 3, victoires: 2 });
  });

  it("agrège l'adversaire à travers esport ET sport", () => {
    // Paul affronté une fois en duel SF6, une fois via sa paire de padel.
    const membres = new Map<string, readonly string[]>([["eqA", ["moi", "part"]], ["eqB", ["paul", "z"]]]);
    const s = calculerStatsJoueur([
      tournoi({
        jeu: "Street Fighter 6",
        matchs: [m({ joueur1_id: "moi", joueur2_id: "paul", gagnant_id: "paul" })],
      }),
      tournoi({
        jeu: "Padel",
        mesIds: ["moi", "eqA"],
        membresParEquipe: membres,
        matchs: [m({ equipe1_id: "eqA", equipe2_id: "eqB", equipe_gagnante_id: "eqA" })],
      }),
    ]);
    const paul = s.adversaires.find((a) => a.joueurId === "paul");
    expect(paul).toEqual({ joueurId: "paul", rencontres: 2, victoires: 1 });
  });

  it("trie les jeux du plus joué au moins joué", () => {
    const s = calculerStatsJoueur([
      tournoi({ jeu: "Padel", matchs: [m({ id: "1", joueur1_id: "moi", joueur2_id: "a", gagnant_id: "moi" })] }),
      tournoi({
        jeu: "Tekken 8",
        matchs: [
          m({ id: "2", joueur1_id: "moi", joueur2_id: "a", gagnant_id: "a" }),
          m({ id: "3", joueur1_id: "moi", joueur2_id: "b", gagnant_id: "moi" }),
        ],
      }),
    ]);
    expect(s.parJeu.map((l) => l.jeu)).toEqual(["Tekken 8", "Padel"]);
  });

  it("ignore un tournoi où je n'apparais dans aucun match", () => {
    const s = calculerStatsJoueur([
      tournoi({ matchs: [m({ joueur1_id: "a", joueur2_id: "b", gagnant_id: "a" })] }),
    ]);
    expect(s.matchsJoues).toBe(0);
    expect(s.adversaires).toEqual([]);
  });
});
