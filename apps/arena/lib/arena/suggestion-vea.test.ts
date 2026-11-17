/**
 * Tests du pré-remplissage « Créer mon profil Arena » depuis VEA.
 * Ce qu'on protège : ne jamais proposer un prénom comme pseudo public, ne
 * jamais créer un doublon d'un pseudo déjà joué, et ne pas inventer d'âge.
 */
import { describe, expect, it } from "vitest";
import { anneeDepuisVea, construireSuggestion } from "./suggestion-vea";

const membre = (p: Partial<Parameters<typeof construireSuggestion>[0]> = {}) => ({
  pseudo: "Kyo",
  annee_naissance: null,
  date_naissance: null,
  ...p,
});

describe("anneeDepuisVea", () => {
  it("prend la colonne année en priorité", () => {
    expect(anneeDepuisVea({ annee_naissance: 2005, date_naissance: "2004-03-01" }, 2026)).toBe(2005);
  });
  it("sinon l'année de la date complète", () => {
    expect(anneeDepuisVea({ annee_naissance: null, date_naissance: "2011-09-14" }, 2026)).toBe(2011);
  });
  it("rien de connu : null (le membre la saisira)", () => {
    expect(anneeDepuisVea({ annee_naissance: null, date_naissance: null }, 2026)).toBeNull();
  });
  it("année absurde : null plutôt qu'une fausse année", () => {
    expect(anneeDepuisVea({ annee_naissance: 1850, date_naissance: null }, 2026)).toBeNull();
  });
});

describe("construireSuggestion", () => {
  it("pseudo libre : proposé pour un nouveau profil", () => {
    expect(construireSuggestion(membre({ annee_naissance: 2001 }), "absent", 2026)).toEqual({
      pseudo: "Kyo",
      annee: 2001,
      rattacher: null,
    });
  });
  it("pseudo déjà joué sans compte : on propose de le rattacher, pas un doublon", () => {
    expect(construireSuggestion(membre(), "sans_compte", 2026)).toEqual({
      pseudo: null,
      annee: null,
      rattacher: "Kyo",
    });
  });
  it("pseudo pris par un autre compte : rien de proposé", () => {
    expect(construireSuggestion(membre(), "pris", 2026).pseudo).toBeNull();
    expect(construireSuggestion(membre(), "pris", 2026).rattacher).toBeNull();
  });
  it("pas de pseudo VEA : jamais le prénom à la place", () => {
    const s = construireSuggestion(membre({ pseudo: null }), "absent", 2026);
    expect(s.pseudo).toBeNull();
    expect(s.rattacher).toBeNull();
  });
  it("pseudo VEA invalide (trop court) : non proposé", () => {
    expect(construireSuggestion(membre({ pseudo: "K" }), "absent", 2026).pseudo).toBeNull();
  });
});
