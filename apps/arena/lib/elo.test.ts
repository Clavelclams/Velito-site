import { describe, expect, it } from "vitest";
import {
  NOTE_INITIALE,
  facteurK,
  notesApresDuel,
  notesApresMatchEquipes,
  probabiliteVictoire,
  repartirEnPoulesEquilibrees,
  type JoueurNote,
} from "./elo";

const j = (joueurId: string, note: number, nbMatchs = 50): JoueurNote => ({
  joueurId,
  note,
  nbMatchs,
});

describe("probabiliteVictoire", () => {
  it("à notes égales, c'est 50/50", () => {
    expect(probabiliteVictoire(1000, 1000)).toBeCloseTo(0.5, 10);
  });

  it("400 points d'écart = 10 fois plus de chances (échelle de référence)", () => {
    const p = probabiliteVictoire(1400, 1000);
    expect(p).toBeCloseTo(10 / 11, 6); // ≈ 0.909
  });

  it("les deux probabilités sont complémentaires", () => {
    const a = probabiliteVictoire(1250, 980);
    const b = probabiliteVictoire(980, 1250);
    expect(a + b).toBeCloseTo(1, 10);
  });
});

describe("facteurK", () => {
  it("K élevé pendant la période de placement, réduit ensuite", () => {
    expect(facteurK(0)).toBe(40);
    expect(facteurK(9)).toBe(40);
    expect(facteurK(10)).toBe(20);
    expect(facteurK(200)).toBe(20);
  });
});

describe("notesApresDuel", () => {
  it("à notes égales, le vainqueur prend exactement K/2", () => {
    const r = notesApresDuel(1000, 1000, "A", 20, 20);
    expect(r.noteA).toBe(1010);
    expect(r.noteB).toBe(990);
  });

  it("battre bien plus fort que soi rapporte beaucoup", () => {
    const r = notesApresDuel(1000, 1400, "A", 20, 20);
    // Attendu ≈ 0.091 → gain ≈ 20 × 0.909 ≈ 18
    expect(r.noteA).toBe(1018);
    expect(r.noteB).toBe(1382);
  });

  it("battre bien plus faible que soi ne rapporte presque rien", () => {
    const r = notesApresDuel(1400, 1000, "A", 20, 20);
    expect(r.noteA).toBe(1402);
    expect(r.noteB).toBe(998);
  });

  it("le total des notes est conservé quand K est identique", () => {
    const avant = 1000 + 1400;
    const r = notesApresDuel(1000, 1400, "B", 20, 20);
    expect(r.noteA + r.noteB).toBe(avant);
  });

  it("un K différent par joueur casse volontairement la conservation", () => {
    // Un débutant (K=40) face à un habitué (K=20) : le débutant bouge deux
    // fois plus. C'est le comportement voulu, pas un bug d'arrondi.
    const r = notesApresDuel(1000, 1000, "A", 40, 20);
    expect(r.noteA).toBe(1020);
    expect(r.noteB).toBe(990);
  });
});

describe("notesApresMatchEquipes", () => {
  it("padel en double : les 4 joueurs sont mis à jour", () => {
    const notes = notesApresMatchEquipes(
      [j("A1", 1000), j("A2", 1000)],
      [j("B1", 1000), j("B2", 1000)],
      "A"
    );
    expect(notes.size).toBe(4);
    expect(notes.get("A1")).toBe(1010);
    expect(notes.get("A2")).toBe(1010);
    expect(notes.get("B1")).toBe(990);
    expect(notes.get("B2")).toBe(990);
  });

  it("la force d'une paire est la moyenne de ses membres", () => {
    // Paire A = (1400 + 600) / 2 = 1000, donc strictement équivalente à une
    // paire B homogène à 1000 : le match est donné 50/50.
    const notes = notesApresMatchEquipes(
      [j("fort", 1400), j("faible", 600)],
      [j("B1", 1000), j("B2", 1000)],
      "A"
    );
    expect(notes.get("fort")).toBe(1410);
    expect(notes.get("faible")).toBe(610);
  });

  it("un débutant associé à un fort progresse plus vite (K de placement)", () => {
    const notes = notesApresMatchEquipes(
      [j("habitue", 1000, 50), j("debutant", 1000, 0)],
      [j("B1", 1000, 50), j("B2", 1000, 50)],
      "A"
    );
    expect(notes.get("habitue")).toBe(1010); // K = 20
    expect(notes.get("debutant")).toBe(1020); // K = 40
  });

  it("une équipe vide ne produit aucune mise à jour", () => {
    expect(notesApresMatchEquipes([], [j("B1", 1000)], "B").size).toBe(0);
  });
});

describe("repartirEnPoulesEquilibrees", () => {
  it("serpentin : chaque poule reçoit un fort et un faible", () => {
    const participants = [
      j("p1", 1400),
      j("p2", 1300),
      j("p3", 1200),
      j("p4", 1100),
      j("p5", 1000),
      j("p6", 900),
      j("p7", 800),
      j("p8", 700),
    ];
    const poules = repartirEnPoulesEquilibrees(participants, 2);
    // Tour 0 → A, B ; tour 1 (inversé) → B, A ; tour 2 → A, B ; tour 3 → B, A
    expect(poules[0]).toEqual(["p1", "p4", "p5", "p8"]);
    expect(poules[1]).toEqual(["p2", "p3", "p6", "p7"]);
    // Somme des notes identique : les poules sont vraiment équilibrées.
    const somme = (ids: string[]) =>
      ids.reduce((s, id) => s + participants.find((p) => p.joueurId === id)!.note, 0);
    expect(somme(poules[0]!)).toBe(somme(poules[1]!));
  });

  it("place tout le monde même si l'effectif n'est pas divisible", () => {
    const participants = [j("a", 1200), j("b", 1100), j("c", 1000), j("d", 900), j("e", 800)];
    const poules = repartirEnPoulesEquilibrees(participants, 2);
    expect(poules.flat().sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(poules[0]!.length + poules[1]!.length).toBe(5);
  });

  it("est déterministe à notes égales (départage par identifiant)", () => {
    const egaux = [j("z", NOTE_INITIALE), j("a", NOTE_INITIALE), j("m", NOTE_INITIALE)];
    const un = repartirEnPoulesEquilibrees(egaux, 2);
    const deux = repartirEnPoulesEquilibrees([...egaux].reverse(), 2);
    expect(un).toEqual(deux);
  });

  it("nbPoules invalide retombe sur une seule poule", () => {
    const poules = repartirEnPoulesEquilibrees([j("a", 1000), j("b", 1000)], 0);
    expect(poules).toHaveLength(1);
    expect(poules[0]).toHaveLength(2);
  });
});
