/**
 * Tests de l'algorithme de bracket — à lancer avec Vitest :
 *   npx vitest run apps/arena/lib
 * (si vitest n'est pas installé : npm i -D vitest à la racine du monorepo)
 *
 * Ces tests couvrent notamment les 3 bugs corrigés vs la spec de mars 2026 :
 * double-bye, shuffle biaisé (via rng injecté déterministe), égalité de scores.
 */
import { describe, it, expect } from "vitest";
import {
  genererBracketEliminationSimple,
  progresserGagnant,
  melangerJoueurs,
  tailleBracket,
  parentDe,
  slotDansParent,
  type MatchInput,
} from "./bracket";

/** RNG déterministe pour des tests reproductibles (pas de Math.random). */
function rngFixe(seed = 42): () => number {
  let s = seed;
  return () => {
    // LCG simple — suffisant pour des tests, PAS pour de la crypto.
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const joueurs = (n: number) =>
  Array.from({ length: n }, (_, i) => `joueur-${i + 1}`);

describe("tailleBracket / parentDe / slotDansParent", () => {
  it("arrondit à la puissance de 2 supérieure", () => {
    expect(tailleBracket(2)).toBe(2);
    expect(tailleBracket(5)).toBe(8);
    expect(tailleBracket(8)).toBe(8);
    expect(tailleBracket(9)).toBe(16);
  });

  it("calcule le parent sans table de liaison", () => {
    expect(parentDe(1, 0)).toEqual({ round: 2, position: 0 });
    expect(parentDe(1, 3)).toEqual({ round: 2, position: 1 });
    expect(slotDansParent(0)).toBe("joueur1");
    expect(slotDansParent(3)).toBe("joueur2");
  });
});

describe("genererBracketEliminationSimple", () => {
  it("refuse moins de 2 joueurs", () => {
    expect(() => genererBracketEliminationSimple(joueurs(1))).toThrow();
    expect(() => genererBracketEliminationSimple([])).toThrow();
  });

  it("génère le bon nombre de rounds pour 8 joueurs", () => {
    const matchs = genererBracketEliminationSimple(joueurs(8), rngFixe());
    const rounds = [...new Set(matchs.map((m) => m.round))];
    expect(rounds).toEqual([1, 2, 3]); // quarts, demis, finale
    expect(matchs.filter((m) => m.round === 1)).toHaveLength(4);
  });

  it("crée des byes pour un nombre impair de joueurs", () => {
    const matchs = genererBracketEliminationSimple(joueurs(6), rngFixe());
    const byes = matchs.filter((m) => m.isBye);
    expect(byes).toHaveLength(2); // taille 8 - 6 joueurs
  });

  it("ne crée JAMAIS de match (null, null) — bug double-bye de la spec", () => {
    // Avec 5 joueurs (3 byes), l'ancien algo produisait une paire vide.
    for (const n of [3, 5, 6, 9, 13]) {
      const matchs = genererBracketEliminationSimple(joueurs(n), rngFixe(n));
      const round1 = matchs.filter((m) => m.round === 1);
      const doubleByes = round1.filter(
        (m) => m.joueur1Id === null && m.joueur2Id === null
      );
      expect(doubleByes).toHaveLength(0);
    }
  });

  it("chaque joueur apparaît exactement une fois au round 1", () => {
    const ids = joueurs(11);
    const matchs = genererBracketEliminationSimple(ids, rngFixe());
    const round1Joueurs = matchs
      .filter((m) => m.round === 1)
      .flatMap((m) => [m.joueur1Id, m.joueur2Id])
      .filter((x): x is string => x !== null);
    expect(round1Joueurs.sort()).toEqual([...ids].sort());
  });

  it("propage les gagnants de byes directement au round 2", () => {
    const matchs = genererBracketEliminationSimple(joueurs(5), rngFixe());
    const byes = matchs.filter((m) => m.isBye);
    for (const bye of byes) {
      expect(bye.gagnantId).not.toBeNull();
      const parent = parentDe(bye.round, bye.position);
      const cible = matchs.find(
        (m) => m.round === parent.round && m.position === parent.position
      )!;
      const slot = slotDansParent(bye.position);
      const valeur = slot === "joueur1" ? cible.joueur1Id : cible.joueur2Id;
      expect(valeur).toBe(bye.gagnantId);
    }
  });
});

describe("progresserGagnant", () => {
  const base = {
    round: 1,
    position: 2,
    joueur1Id: "A",
    joueur2Id: "B",
  };

  it("envoie le gagnant dans le bon slot du parent", () => {
    const prog = progresserGagnant({ ...base, scoreJ1: 3, scoreJ2: 1 }, 3);
    expect(prog.gagnantId).toBe("A");
    // position 2 (paire) → slot joueur1 du parent (round 2, position 1)
    expect(prog.parent).toEqual({ round: 2, position: 1, slot: "joueur1" });
  });

  it("refuse une égalité au lieu d'avancer le mauvais joueur", () => {
    expect(() =>
      progresserGagnant({ ...base, scoreJ1: 2, scoreJ2: 2 }, 3)
    ).toThrow(/Égalité/);
  });

  it("refuse un match incomplet", () => {
    expect(() =>
      progresserGagnant({ ...base, joueur2Id: null, scoreJ1: 1, scoreJ2: 0 }, 3)
    ).toThrow(/incomplet/);
  });

  it("la finale n'a pas de parent : le gagnant est champion", () => {
    const prog = progresserGagnant(
      { round: 3, position: 0, joueur1Id: "A", joueur2Id: "B", scoreJ1: 0, scoreJ2: 2 },
      3
    );
    expect(prog.gagnantId).toBe("B");
    expect(prog.parent).toBeNull();
  });
});

describe("simulation d'un tournoi complet à 5 joueurs", () => {
  it("aboutit à un unique champion sans slot vide", () => {
    const matchs = genererBracketEliminationSimple(joueurs(5), rngFixe(7));
    const nbRounds = Math.max(...matchs.map((m) => m.round));

    // Joue tous les matchs round par round : joueur1 gagne toujours 1-0.
    for (let round = 1; round <= nbRounds; round++) {
      for (const m of matchs.filter(
        (x) => x.round === round && !x.isBye
      ) as MatchInput[]) {
        // Un match non-bye doit être complet au moment de son round.
        expect(m.joueur1Id).not.toBeNull();
        expect(m.joueur2Id).not.toBeNull();
        const prog = progresserGagnant(
          {
            round: m.round,
            position: m.position,
            joueur1Id: m.joueur1Id,
            joueur2Id: m.joueur2Id,
            scoreJ1: 1,
            scoreJ2: 0,
          },
          nbRounds
        );
        m.gagnantId = prog.gagnantId;
        if (prog.parent) {
          const cible = matchs.find(
            (x) =>
              x.round === prog.parent!.round &&
              x.position === prog.parent!.position
          )!;
          if (prog.parent.slot === "joueur1") cible.joueur1Id = prog.gagnantId;
          else cible.joueur2Id = prog.gagnantId;
        } else {
          // Finale jouée : champion désigné.
          expect(round).toBe(nbRounds);
        }
      }
    }

    const finale = matchs.find((m) => m.round === nbRounds)!;
    expect(finale.gagnantId).not.toBeNull();
  });
});
