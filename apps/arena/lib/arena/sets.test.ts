/**
 * Tests du score par sets. Une règle fausse ici bloque un staff en plein
 * tournoi (« ton score est impossible » alors qu'il est juste) ou laisse
 * passer une faute de frappe dans un résultat public : on verrouille les deux.
 */
import { describe, expect, it } from "vitest";
import { analyserSets, formaterSets, lireSets, parserSets, sportASets } from "./sets";

describe("sportASets", () => {
  it("reconnaît le padel et le ping-pong", () => {
    expect(sportASets("Padel")).toBe("PADEL");
    expect(sportASets("Ping-pong")).toBe("PING_PONG");
  });
  it("ignore les autres jeux", () => {
    expect(sportASets("Rocket League")).toBeNull();
    expect(sportASets("Five (football à 5)")).toBeNull();
    expect(sportASets(null)).toBeNull();
  });
});

describe("parserSets", () => {
  it("lit les séparateurs courants", () => {
    expect(parserSets("6-4 3-6, 7/5")).toEqual({ ok: true, sets: [[6, 4], [3, 6], [7, 5]] });
    expect(parserSets(" 11:9;11:7 ")).toEqual({ ok: true, sets: [[11, 9], [11, 7]] });
  });
  it("refuse un texte vide ou mal formé", () => {
    expect(parserSets("  ").ok).toBe(false);
    expect(parserSets("6-4 trois").ok).toBe(false);
    expect(parserSets("6--4").ok).toBe(false);
  });
  it("refuse plus de 5 sets", () => {
    expect(parserSets("11-1 11-1 11-1 11-1 11-1 11-1").ok).toBe(false);
  });
});

describe("analyserSets, padel", () => {
  it("2 sets secs", () => {
    expect(analyserSets("PADEL", [[6, 4], [6, 2]])).toEqual({ ok: true, scoreJ1: 2, scoreJ2: 0 });
  });
  it("3 sets avec jeu décisif", () => {
    expect(analyserSets("PADEL", [[6, 4], [6, 7], [7, 5]])).toEqual({ ok: true, scoreJ1: 2, scoreJ2: 1 });
  });
  it("3e set en super jeu décisif", () => {
    expect(analyserSets("PADEL", [[4, 6], [6, 3], [8, 10]])).toEqual({ ok: true, scoreJ1: 1, scoreJ2: 2 });
    expect(analyserSets("PADEL", [[4, 6], [6, 3], [12, 10]]).ok).toBe(true);
  });
  it("le super jeu décisif n'est permis qu'au 3e set", () => {
    expect(analyserSets("PADEL", [[10, 8], [6, 3]]).ok).toBe(false);
  });
  it("refuse un set impossible", () => {
    expect(analyserSets("PADEL", [[6, 5], [6, 2]]).ok).toBe(false);
    expect(analyserSets("PADEL", [[8, 6], [6, 2]]).ok).toBe(false);
    expect(analyserSets("PADEL", [[6, 6], [6, 2]]).ok).toBe(false);
  });
  it("refuse un match incomplet ou un set en trop", () => {
    expect(analyserSets("PADEL", [[6, 4]]).ok).toBe(false);
    expect(analyserSets("PADEL", [[6, 4], [6, 4], [6, 4]]).ok).toBe(false);
  });
});

describe("analyserSets, ping-pong", () => {
  it("au meilleur des 3", () => {
    expect(analyserSets("PING_PONG", [[11, 9], [8, 11], [11, 6]])).toEqual({ ok: true, scoreJ1: 2, scoreJ2: 1 });
  });
  it("au meilleur des 5, avec prolongation", () => {
    expect(analyserSets("PING_PONG", [[11, 9], [12, 14], [11, 5], [13, 11]])).toEqual({ ok: true, scoreJ1: 3, scoreJ2: 1 });
  });
  it("refuse 11-10 et 14-11", () => {
    expect(analyserSets("PING_PONG", [[11, 10], [11, 3]]).ok).toBe(false);
    expect(analyserSets("PING_PONG", [[14, 11], [11, 3]]).ok).toBe(false);
  });
  it("refuse un set joué après 3 sets gagnés", () => {
    expect(analyserSets("PING_PONG", [[11, 1], [11, 1], [11, 1], [1, 11]]).ok).toBe(false);
  });
  it("refuse un 1-1", () => {
    expect(analyserSets("PING_PONG", [[11, 1], [1, 11]]).ok).toBe(false);
  });
});

describe("formaterSets et lireSets", () => {
  it("formate", () => {
    expect(formaterSets([[6, 4], [3, 6]])).toBe("6-4 3-6");
    expect(formaterSets(null)).toBe("");
  });
  it("lit une valeur jsonb saine et rejette le reste", () => {
    expect(lireSets([[6, 4], [7, 5]])).toEqual([[6, 4], [7, 5]]);
    expect(lireSets("6-4")).toBeNull();
    expect(lireSets([[6, -1]])).toBeNull();
    expect(lireSets([[6, 4, 1]])).toBeNull();
    expect(lireSets([])).toBeNull();
  });
});
