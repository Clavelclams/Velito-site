import { describe, expect, it } from "vitest";
import { estStatutTournoi, transitionAutorisee } from "./transitions";
import { nomRound } from "./affichage";

describe("transitionAutorisee", () => {
  it("autorise le cycle nominal", () => {
    expect(transitionAutorisee("BROUILLON", "OUVERT")).toBe(true);
    expect(transitionAutorisee("OUVERT", "BROUILLON")).toBe(true); // repasser en brouillon
    expect(transitionAutorisee("EN_COURS", "TERMINE")).toBe(true);
  });

  it("autorise l'annulation depuis tout état non terminal", () => {
    expect(transitionAutorisee("BROUILLON", "ANNULE")).toBe(true);
    expect(transitionAutorisee("OUVERT", "ANNULE")).toBe(true);
    expect(transitionAutorisee("EN_COURS", "ANNULE")).toBe(true);
  });

  it("refuse OUVERT → EN_COURS par simple changement d'état (réservé à demarrerTournoi)", () => {
    expect(transitionAutorisee("OUVERT", "EN_COURS")).toBe(false);
  });

  it("les états terminaux sont définitifs", () => {
    expect(transitionAutorisee("TERMINE", "OUVERT")).toBe(false);
    expect(transitionAutorisee("TERMINE", "EN_COURS")).toBe(false);
    expect(transitionAutorisee("ANNULE", "BROUILLON")).toBe(false);
  });

  it("refuse de sauter des étapes", () => {
    expect(transitionAutorisee("BROUILLON", "EN_COURS")).toBe(false);
    expect(transitionAutorisee("BROUILLON", "TERMINE")).toBe(false);
  });
});

describe("estStatutTournoi", () => {
  it("valide les statuts connus et rejette le reste", () => {
    expect(estStatutTournoi("OUVERT")).toBe(true);
    expect(estStatutTournoi("EN_COURS")).toBe(true);
    expect(estStatutTournoi("N_IMPORTE_QUOI")).toBe(false);
    expect(estStatutTournoi("")).toBe(false);
    expect(estStatutTournoi("ouvert")).toBe(false); // sensible à la casse, volontairement
  });
});

describe("nomRound", () => {
  it("nomme les rounds d'un bracket à 8 joueurs (3 rounds)", () => {
    expect(nomRound(1, 3)).toBe("Quarts de finale");
    expect(nomRound(2, 3)).toBe("Demi-finales");
    expect(nomRound(3, 3)).toBe("Finale");
  });

  it("nomme les premiers rounds d'un gros bracket", () => {
    expect(nomRound(1, 5)).toBe("Round 1");
    expect(nomRound(2, 5)).toBe("Round 2");
    expect(nomRound(3, 5)).toBe("Quarts de finale");
  });

  it("un bracket à 2 joueurs n'a qu'une finale", () => {
    expect(nomRound(1, 1)).toBe("Finale");
  });
});
