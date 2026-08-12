import { describe, expect, it } from "vitest";
import {
  classementPoule,
  genererCalendrierPoule,
  genererMatchsPoules,
  ordonnerQualifies,
  pouleTerminee,
  repartirEnPoules,
  type ResultatPoule,
} from "./poules";

const rngFixe = () => 0.5;

/** Raccourci pour écrire un résultat de poule validé. */
function res(j1: string, j2: string, s1: number, s2: number, valide = true): ResultatPoule {
  return { joueur1Id: j1, joueur2Id: j2, scoreJ1: s1, scoreJ2: s2, valide };
}

describe("repartirEnPoules", () => {
  it("équilibre les poules à un joueur près", () => {
    const joueurs = Array.from({ length: 11 }, (_, i) => `J${i}`);
    const poules = repartirEnPoules(joueurs, 3, rngFixe);
    expect(poules).toHaveLength(3);
    const tailles = poules.map((p) => p.length).sort();
    expect(tailles[tailles.length - 1]! - tailles[0]!).toBeLessThanOrEqual(1);
    // Aucun joueur perdu, aucun dupliqué.
    expect(new Set(poules.flat()).size).toBe(11);
  });

  it("refuse un effectif qui ne remplit pas les poules (2 joueurs minimum chacune)", () => {
    expect(() => repartirEnPoules(["A", "B", "C"], 2, rngFixe)).toThrow(/insuffisant/);
  });
});

describe("genererCalendrierPoule", () => {
  it("chaque joueur affronte tous les autres exactement une fois (4 joueurs)", () => {
    const matchs = genererCalendrierPoule(["A", "B", "C", "D"], 1);
    expect(matchs).toHaveLength(6); // 4*3/2

    const paires = matchs.map((m) => [m.joueur1Id, m.joueur2Id].sort().join("-"));
    expect(new Set(paires).size).toBe(6); // aucune rencontre en double
  });

  it("effectif impair : chaque joueur se repose une journée, total n(n-1)/2", () => {
    const matchs = genererCalendrierPoule(["A", "B", "C", "D", "E"], 2);
    expect(matchs).toHaveLength(10); // 5*4/2
    // 5 journées, et chaque journée compte 2 matchs (1 joueur au repos).
    const journees = new Set(matchs.map((m) => m.journee));
    expect(journees.size).toBe(5);
    for (const j of journees) {
      expect(matchs.filter((m) => m.journee === j)).toHaveLength(2);
    }
    // Personne n'est jamais opposé à lui-même.
    for (const m of matchs) expect(m.joueur1Id).not.toBe(m.joueur2Id);
  });

  it("un joueur ne joue jamais deux fois dans la même journée", () => {
    const matchs = genererCalendrierPoule(["A", "B", "C", "D", "E", "F"], 1);
    const journees = new Set(matchs.map((m) => m.journee));
    for (const j of journees) {
      const duJour = matchs.filter((m) => m.journee === j);
      const joueurs = duJour.flatMap((m) => [m.joueur1Id, m.joueur2Id]);
      expect(new Set(joueurs).size).toBe(joueurs.length);
    }
  });

  it("refuse une poule à moins de 2 joueurs", () => {
    expect(() => genererCalendrierPoule(["A"], 1)).toThrow();
  });

  it("genererMatchsPoules numérote les poules à partir de 1", () => {
    const tous = genererMatchsPoules([
      ["A", "B", "C"],
      ["D", "E", "F"],
    ]);
    expect(tous).toHaveLength(6); // 3 + 3
    expect(new Set(tous.map((m) => m.poule))).toEqual(new Set([1, 2]));
  });
});

describe("classementPoule", () => {
  const joueurs = ["A", "B", "C", "D"];

  it("classe par victoires puis différence de score", () => {
    const matchs = [
      res("A", "B", 2, 0),
      res("A", "C", 2, 1),
      res("A", "D", 2, 0),
      res("B", "C", 2, 0),
      res("B", "D", 2, 1),
      res("C", "D", 2, 0),
    ];
    const classement = classementPoule(joueurs, matchs);
    expect(classement.map((l) => l.joueurId)).toEqual(["A", "B", "C", "D"]);
    expect(classement[0]!.victoires).toBe(3);
    expect(classement[0]!.difference).toBe(6 - 1);
    expect(classement[3]!.victoires).toBe(0);
  });

  it("départage deux ex aequo par la confrontation directe", () => {
    // Construit pour créer DEUX égalités parfaites (victoires + différence) :
    //   A et B : 1 victoire, différence -1 → B a battu A, B passe devant.
    //   C et D : 2 victoires, différence +1 → C a battu D, C passe devant.
    const matchs = [
      res("A", "B", 0, 1), // B bat A
      res("A", "C", 2, 1), // A bat C
      res("A", "D", 0, 1), // D bat A
      res("B", "C", 0, 1), // C bat B
      res("B", "D", 0, 1), // D bat B
      res("C", "D", 1, 0), // C bat D
    ];
    const classement = classementPoule(joueurs, matchs);
    const pos = (j: string) => classement.findIndex((l) => l.joueurId === j);
    const ligne = (j: string) => classement.find((l) => l.joueurId === j)!;

    // Égalité stricte sur les deux premiers critères…
    expect(ligne("A").victoires).toBe(ligne("B").victoires);
    expect(ligne("A").difference).toBe(ligne("B").difference);
    expect(ligne("C").victoires).toBe(ligne("D").victoires);
    expect(ligne("C").difference).toBe(ligne("D").difference);

    // …tranchée par le duel direct dans les deux cas.
    expect(pos("B")).toBeLessThan(pos("A"));
    expect(pos("C")).toBeLessThan(pos("D"));
    expect(classement.map((l) => l.joueurId)).toEqual(["C", "D", "B", "A"]);
  });

  it("ignore les matchs non validés (le classement ne bouge qu'à la validation)", () => {
    const classement = classementPoule(joueurs, [res("A", "B", 2, 0, false)]);
    expect(classement.every((l) => l.joues === 0)).toBe(true);
  });

  it("ignore un match dont un joueur n'appartient pas à la poule", () => {
    const classement = classementPoule(joueurs, [res("A", "ETRANGER", 2, 0)]);
    expect(classement.find((l) => l.joueurId === "A")!.joues).toBe(0);
  });
});

describe("pouleTerminee", () => {
  it("exige toutes les rencontres validées", () => {
    const complets = [res("A", "B", 1, 0), res("A", "C", 1, 0), res("B", "C", 1, 0)];
    expect(pouleTerminee(3, complets)).toBe(true);
    expect(pouleTerminee(3, complets.slice(0, 2))).toBe(false);
    expect(pouleTerminee(3, [...complets.slice(0, 2), res("B", "C", 1, 0, false)])).toBe(
      false
    );
  });
});

describe("ordonnerQualifies", () => {
  it("1 qualifié par poule : ordre naturel", () => {
    const ordre = ordonnerQualifies([["A1", "A2"], ["B1", "B2"], ["C1", "C2"], ["D1", "D2"]], 1);
    expect(ordre).toEqual(["A1", "B1", "C1", "D1"]);
  });

  it("2 qualifiés : croise les poules pour éviter les retrouvailles au 1er tour", () => {
    const ordre = ordonnerQualifies(
      [
        ["A1", "A2"],
        ["B1", "B2"],
      ],
      2
    );
    expect(ordre).toEqual(["A1", "B2", "B1", "A2"]);
    // Le bracket apparie (0,1) et (2,3) → aucune paire de la même poule.
    const paire1 = [ordre[0]![0], ordre[1]![0]];
    const paire2 = [ordre[2]![0], ordre[3]![0]];
    expect(paire1[0]).not.toBe(paire1[1]);
    expect(paire2[0]).not.toBe(paire2[1]);
  });

  it("4 poules : aucune paire du 1er tour ne contient deux joueurs d'une même poule", () => {
    const ordre = ordonnerQualifies(
      [
        ["A1", "A2"],
        ["B1", "B2"],
        ["C1", "C2"],
        ["D1", "D2"],
      ],
      2
    );
    expect(ordre).toHaveLength(8);
    for (let i = 0; i < ordre.length; i += 2) {
      expect(ordre[i]![0]).not.toBe(ordre[i + 1]![0]); // lettre de poule différente
    }
  });

  it("refuse plus de 2 qualifiés par poule (décision V1)", () => {
    expect(() => ordonnerQualifies([["A1", "A2", "A3"]], 3)).toThrow(/1 ou 2/);
  });
});
