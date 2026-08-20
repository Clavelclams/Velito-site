/**
 * Tests du générateur CSV. Un export cassé chez l'utilisateur final est
 * invisible pour nous (il s'ouvre dans SON Excel) : la seule protection est
 * de verrouiller l'échappement par des tests.
 */
import { describe, expect, it } from "vitest";
import { BOM_UTF8, echapperChampCsv, genererCsv } from "./csv";

describe("echapperChampCsv", () => {
  it("laisse un champ simple intact", () => {
    expect(echapperChampCsv("Aya")).toBe("Aya");
  });

  it("cite un champ contenant le séparateur ;", () => {
    expect(echapperChampCsv("Court 2; annexe")).toBe('"Court 2; annexe"');
  });

  it("double les guillemets internes", () => {
    expect(echapperChampCsv('Le "Boss"')).toBe('"Le ""Boss"""');
  });

  it("cite les sauts de ligne", () => {
    expect(echapperChampCsv("a\nb")).toBe('"a\nb"');
  });

  it("un pseudo hostile ne casse pas la structure", () => {
    // Tentative d'injection de colonne : tout reste dans UN champ.
    expect(echapperChampCsv('x";y;z')).toBe('"x"";y;z"');
  });
});

describe("genererCsv", () => {
  it("commence par le BOM UTF-8 (accents corrects dans Excel)", () => {
    expect(genererCsv([["a"]]).startsWith(BOM_UTF8)).toBe(true);
  });

  it("assemble lignes et colonnes avec ; et CRLF", () => {
    const csv = genererCsv([
      ["pseudo", "victoires"],
      ["Léa", "3"],
    ]);
    expect(csv).toBe(BOM_UTF8 + "pseudo;victoires\r\nLéa;3\r\n");
  });

  it("échappe champ par champ, pas ligne par ligne", () => {
    const csv = genererCsv([["a;b", "c"]]);
    expect(csv).toContain('"a;b";c');
  });
});
