import { describe, expect, it } from "vitest";
import {
  genererBracketDoubleElimination,
  profondeurW,
  progresserDouble,
  type MatchDoubleGenere,
} from "./bracket-double";

const rngFixe = () => 0.5; // mélange déterministe pour les tests

/**
 * Simulateur : résout tous les matchs jouables jusqu'à épuisement.
 * `vainqueur` décide qui gagne chaque match (par défaut : joueur1).
 */
function simuler(
  joueurs: string[],
  vainqueur: (j1: string, j2: string) => string = (j1) => j1
) {
  const k = profondeurW(joueurs.length);
  const matchs = genererBracketDoubleElimination(joueurs, rngFixe);
  const cle = (b: string, r: number, p: number) => `${b}-${r}-${p}`;
  const parCle = new Map(matchs.map((m) => [cle(m.bracket, m.round, m.position), m]));
  const defaites = new Map<string, number>();

  let champion: string | null = null;
  let finaliste: string | null = null;
  let bouge = true;
  while (bouge) {
    bouge = false;
    for (const m of matchs) {
      if (m.gagnantId || !m.joueur1Id || !m.joueur2Id) continue;
      const g = vainqueur(m.joueur1Id, m.joueur2Id);
      const s1 = g === m.joueur1Id ? 1 : 0;
      const prog = progresserDouble(
        { ...m, joueur1Id: m.joueur1Id, joueur2Id: m.joueur2Id, scoreJ1: s1, scoreJ2: 1 - s1 },
        k
      );
      m.gagnantId = prog.gagnantId;
      defaites.set(prog.perdantId, (defaites.get(prog.perdantId) ?? 0) + 1);
      if (prog.destGagnant) {
        const dest = parCle.get(cle(prog.destGagnant.bracket, prog.destGagnant.round, prog.destGagnant.position))!;
        if (prog.destGagnant.slot === "joueur1") dest.joueur1Id = prog.gagnantId;
        else dest.joueur2Id = prog.gagnantId;
      } else {
        champion = prog.gagnantId;
        finaliste = prog.perdantId;
      }
      if (prog.destPerdant) {
        const dest = parCle.get(cle(prog.destPerdant.bracket, prog.destPerdant.round, prog.destPerdant.position))!;
        if (prog.destPerdant.slot === "joueur1") dest.joueur1Id = prog.perdantId;
        else dest.joueur2Id = prog.perdantId;
      }
      bouge = true;
    }
  }
  return { matchs, champion, finaliste, defaites };
}

describe("genererBracketDoubleElimination", () => {
  it("refuse tout effectif hors 4/8/16/32 (décision V1 : pas de byes en rattrapage)", () => {
    for (const n of [2, 3, 5, 6, 7, 9, 12, 64]) {
      expect(() =>
        genererBracketDoubleElimination(Array.from({ length: n }, (_, i) => `J${i}`))
      ).toThrow();
    }
  });

  it("produit exactement 2N-2 matchs (propriété mathématique de la double élim)", () => {
    for (const n of [4, 8, 16, 32]) {
      const joueurs = Array.from({ length: n }, (_, i) => `J${i}`);
      expect(genererBracketDoubleElimination(joueurs, rngFixe)).toHaveLength(2 * n - 2);
    }
  });

  it("structure 8 joueurs : W=7, L=6, GF=1, et tout le monde joue au round 1", () => {
    const matchs = genererBracketDoubleElimination(
      ["A", "B", "C", "D", "E", "F", "G", "H"],
      rngFixe
    );
    const parBracket = (b: string) => matchs.filter((m) => m.bracket === b);
    expect(parBracket("W")).toHaveLength(7);
    expect(parBracket("L")).toHaveLength(6);
    expect(parBracket("GF")).toHaveLength(1);
    const r1 = matchs.filter((m) => m.bracket === "W" && m.round === 1);
    const joueursR1 = r1.flatMap((m) => [m.joueur1Id, m.joueur2Id]);
    expect(new Set(joueursR1).size).toBe(8);
  });
});

describe("simulation complète", () => {
  it("8 joueurs : un champion, un finaliste, personne à plus de 2 défaites", () => {
    const joueurs = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const { matchs, champion, finaliste, defaites } = simuler(joueurs);

    expect(champion).not.toBeNull();
    expect(finaliste).not.toBeNull();
    expect(champion).not.toBe(finaliste);
    // Tous les matchs sont joués, aucun slot vide.
    for (const m of matchs) {
      expect(m.gagnantId, `${m.bracket}-R${m.round}-P${m.position}`).not.toBeNull();
    }
    // Le champion n'a AU PLUS qu'une défaite ; tous les autres en ont 1 ou 2.
    expect(defaites.get(champion!) ?? 0).toBeLessThanOrEqual(1);
    for (const j of joueurs) {
      if (j === champion) continue;
      expect(defaites.get(j), `défaites de ${j}`).toBeGreaterThanOrEqual(1);
      expect(defaites.get(j), `défaites de ${j}`).toBeLessThanOrEqual(2);
    }
    // Exactement N-2 joueurs éliminés avec 2 défaites (tous sauf champion + finaliste...
    // le finaliste GF compte 2 défaites s'il vient du rattrapage, 1 s'il vient de W).
    const deuxDefaites = joueurs.filter((j) => (defaites.get(j) ?? 0) === 2);
    expect(deuxDefaites.length).toBeGreaterThanOrEqual(joueurs.length - 2);
  });

  it("8 joueurs : un perdant du round 1 peut remonter tout le rattrapage jusqu'en grande finale", () => {
    // Scénario : "B" perd son TOUT PREMIER match (W round 1), puis gagne tout —
    // rattrapage complet + grande finale. C'est l'essence de la double élim.
    let premierMatchDeB = true;
    const { champion, defaites } = simuler(
      ["A", "B", "C", "D", "E", "F", "G", "H"],
      (j1, j2) => {
        if (j1 === "B" || j2 === "B") {
          if (premierMatchDeB) {
            premierMatchDeB = false;
            return j1 === "B" ? j2 : j1; // B perd son 1er match
          }
          return "B"; // puis B gagne tout
        }
        return j1;
      }
    );
    expect(champion).toBe("B");
    expect(defaites.get("B")).toBe(1); // une seule défaite malgré le titre
  });

  it("4 joueurs : structure minimale (6 matchs) cohérente de bout en bout", () => {
    const { matchs, champion, defaites } = simuler(["A", "B", "C", "D"]);
    expect(matchs).toHaveLength(6);
    expect(champion).toBe("A"); // joueur1 gagne toujours, A est tête de série
    for (const j of ["B", "C", "D"]) {
      expect(defaites.get(j)).toBeGreaterThanOrEqual(1);
    }
  });

  it("32 joueurs : la machine tient à l'échelle max autorisée", () => {
    const joueurs = Array.from({ length: 32 }, (_, i) => `J${String(i).padStart(2, "0")}`);
    const { matchs, champion } = simuler(joueurs);
    expect(matchs).toHaveLength(62);
    expect(champion).not.toBeNull();
    for (const m of matchs) expect(m.gagnantId).not.toBeNull();
  });
});

describe("progresserDouble — règles unitaires", () => {
  const base = { joueur1Id: "X", joueur2Id: "Y", scoreJ1: 2, scoreJ2: 1 };

  it("refuse l'égalité et les matchs incomplets", () => {
    expect(() =>
      progresserDouble({ bracket: "W", round: 1, position: 0, ...base, scoreJ2: 2 }, 3)
    ).toThrow(/Égalité/);
    expect(() =>
      progresserDouble({ bracket: "W", round: 1, position: 0, ...base, joueur2Id: null }, 3)
    ).toThrow(/incomplet/);
  });

  it("perdant de la finale W descend en finale du rattrapage (slot joueur2)", () => {
    const prog = progresserDouble({ bracket: "W", round: 3, position: 0, ...base }, 3);
    expect(prog.destGagnant).toEqual({ bracket: "GF", round: 1, position: 0, slot: "joueur1" });
    expect(prog.destPerdant).toEqual({ bracket: "L", round: 4, position: 0, slot: "joueur2" });
  });

  it("miroir anti-rematch : perdants du W round 2 (pair) descendent en positions inversées", () => {
    const p0 = progresserDouble({ bracket: "W", round: 2, position: 0, ...base }, 3);
    const p1 = progresserDouble({ bracket: "W", round: 2, position: 1, ...base }, 3);
    expect(p0.destPerdant!.position).toBe(1);
    expect(p1.destPerdant!.position).toBe(0);
  });

  it("gagnant de la finale du rattrapage va en GF slot joueur2 ; perdant de GF = finaliste", () => {
    const lFinal = progresserDouble({ bracket: "L", round: 4, position: 0, ...base }, 3);
    expect(lFinal.destGagnant).toEqual({ bracket: "GF", round: 1, position: 0, slot: "joueur2" });
    expect(lFinal.destPerdant).toBeNull(); // éliminé (2e défaite)

    const gf = progresserDouble({ bracket: "GF", round: 1, position: 0, ...base }, 3);
    expect(gf.destGagnant).toBeNull(); // champion
    expect(gf.destPerdant).toBeNull(); // finaliste — pas de reset (décision V1)
  });
});
