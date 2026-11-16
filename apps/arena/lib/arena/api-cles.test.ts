/**
 * Tests des clés d'API. Une erreur ici ouvre l'API à n'importe qui (format
 * trop permissif) ou la ferme à un club légitime (en-tête mal lu).
 */
import { describe, expect, it } from "vitest";
import {
  empreinteCle,
  entierBorne,
  extraireCle,
  formatCleValide,
  genererCle,
  nomCleValide,
  prefixeAffiche,
} from "./api-cles";

describe("genererCle", () => {
  it("produit une clé au bon format", () => {
    const cle = genererCle();
    expect(formatCleValide(cle)).toBe(true);
    expect(cle.length).toBe(49);
  });
  it("ne produit jamais deux fois la même clé", () => {
    const vues = new Set(Array.from({ length: 200 }, () => genererCle()));
    expect(vues.size).toBe(200);
  });
});

describe("formatCleValide", () => {
  it("refuse un autre préfixe, une longueur fausse, un caractère interdit", () => {
    const bonne = genererCle();
    expect(formatCleValide("vea_" + bonne.slice(6))).toBe(false);
    expect(formatCleValide(bonne + "x")).toBe(false);
    expect(formatCleValide(bonne.slice(0, -1) + "=")).toBe(false);
  });
});

describe("empreinteCle et prefixeAffiche", () => {
  it("empreinte SHA-256 hexadécimale stable", () => {
    expect(empreinteCle("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("préfixe de 12 caractères", () => {
    expect(prefixeAffiche("arena_abcdefghijk")).toBe("arena_abcdef");
  });
});

describe("extraireCle", () => {
  const cle = genererCle();
  it("lit Authorization: Bearer", () => {
    expect(extraireCle(new Headers({ Authorization: `Bearer ${cle}` }))).toBe(cle);
  });
  it("lit X-Api-Key", () => {
    expect(extraireCle(new Headers({ "X-Api-Key": cle }))).toBe(cle);
  });
  it("rend null si absente ou mal formée", () => {
    expect(extraireCle(new Headers())).toBeNull();
    expect(extraireCle(new Headers({ Authorization: "Bearer n-importe-quoi" }))).toBeNull();
    expect(extraireCle(new Headers({ Authorization: `Basic ${cle}` }))).toBeNull();
  });
});

describe("nomCleValide", () => {
  it("nettoie les espaces et borne la longueur", () => {
    expect(nomCleValide("  Site   du club ")).toBe("Site du club");
    expect(nomCleValide("x")).toBeNull();
    expect(nomCleValide("a".repeat(61))).toBeNull();
  });
});

describe("entierBorne", () => {
  it("défaut, plafond, plancher", () => {
    expect(entierBorne(null, 50, 1, 100)).toBe(50);
    expect(entierBorne("abc", 50, 1, 100)).toBe(50);
    expect(entierBorne("-3", 50, 1, 100)).toBe(50);
    expect(entierBorne("500", 50, 1, 100)).toBe(100);
    expect(entierBorne("0", 50, 1, 100)).toBe(1);
    expect(entierBorne("20", 50, 1, 100)).toBe(20);
  });
});
