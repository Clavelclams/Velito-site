/**
 * Tests de la règle de minorité. Chaque cas est une année charnière : c'est
 * là qu'une erreur d'un an expose un enfant ou bloque un adulte.
 */
import { describe, expect, it } from "vitest";
import {
  ageCertain,
  champsJoueurPourAnnee,
  consentementParentalRequis,
  estMineur,
  validerAnneeNaissance,
} from "./age";

describe("estMineur — protection par excès", () => {
  it("né en 2008, en 2026 : 17 ou 18 ans, donc MINEUR toute l'année", () => {
    expect(ageCertain(2008, 2026)).toBe(17);
    expect(estMineur(2008, 2026)).toBe(true);
  });

  it("né en 2007, en 2026 : 18 ou 19 ans, donc majeur à coup sûr", () => {
    expect(ageCertain(2007, 2026)).toBe(18);
    expect(estMineur(2007, 2026)).toBe(false);
  });

  it("le même joueur devient majeur au changement d'année, pas avant", () => {
    expect(estMineur(2008, 2026)).toBe(true);
    expect(estMineur(2008, 2027)).toBe(false);
  });

  it("un enfant de 10 ans est mineur", () => {
    expect(estMineur(2016, 2026)).toBe(true);
  });
});

describe("consentementParentalRequis — seuil des 15 ans", () => {
  it("né en 2011, en 2026 : 14 ou 15 ans → consentement parental requis", () => {
    expect(consentementParentalRequis(2011, 2026)).toBe(true);
  });

  it("né en 2010, en 2026 : 15 ou 16 ans → le mineur consent lui-même", () => {
    expect(consentementParentalRequis(2010, 2026)).toBe(false);
    // Mais il reste mineur : profil restreint quand même.
    expect(estMineur(2010, 2026)).toBe(true);
  });
});

describe("validerAnneeNaissance", () => {
  it("accepte quatre chiffres plausibles, avec des espaces autour", () => {
    expect(validerAnneeNaissance(" 2008 ", 2026)).toBe(2008);
  });

  it("refuse vide, texte, deux chiffres, et les valeurs absurdes", () => {
    expect(validerAnneeNaissance("", 2026)).toBeNull();
    expect(validerAnneeNaissance(undefined, 2026)).toBeNull();
    expect(validerAnneeNaissance("abcd", 2026)).toBeNull();
    expect(validerAnneeNaissance("08", 2026)).toBeNull();
    expect(validerAnneeNaissance("2025", 2026)).toBeNull(); // 1 an
    expect(validerAnneeNaissance("1900", 2026)).toBeNull(); // 126 ans
  });

  it("accepte les bornes : 4 ans et 99 ans", () => {
    expect(validerAnneeNaissance("2022", 2026)).toBe(2022);
    expect(validerAnneeNaissance("1927", 2026)).toBe(1927);
  });
});

describe("champsJoueurPourAnnee — mineur ⇒ profil restreint, sans option", () => {
  it("mineur : profil_public forcé à false", () => {
    expect(champsJoueurPourAnnee(2012, 2026)).toEqual({
      annee_naissance: 2012,
      est_mineur: true,
      profil_public: false,
    });
  });

  it("majeur : profil public par défaut", () => {
    expect(champsJoueurPourAnnee(1999, 2026)).toEqual({
      annee_naissance: 1999,
      est_mineur: false,
      profil_public: true,
    });
  });
});
