/**
 * Tests de la partie PURE du client Toornament (parsing d'URL, appariement
 * de pseudos, mise en forme). La partie réseau n'est pas testée ici : on ne
 * teste pas fetch, on teste ce que NOUS faisons autour.
 */
import { describe, expect, it } from "vitest";
import {
  extraireIdTournoiToornament,
  libelleRang,
  memePseudo,
} from "./toornament";

describe("extraireIdTournoiToornament", () => {
  it("extrait l'id d'une URL fr classique", () => {
    expect(
      extraireIdTournoiToornament(
        "https://www.toornament.com/fr/tournaments/386310599608992768/information"
      )
    ).toBe("386310599608992768");
  });

  it("extrait l'id sans segment final", () => {
    expect(
      extraireIdTournoiToornament(
        "https://www.toornament.com/en_US/tournaments/123456789012"
      )
    ).toBe("123456789012");
  });

  it("accepte les sous-domaines toornament.com (play.)", () => {
    expect(
      extraireIdTournoiToornament(
        "https://play.toornament.com/fr/tournaments/999999999999/stages"
      )
    ).toBe("999999999999");
  });

  it("tolère les espaces autour de l'URL collée", () => {
    expect(
      extraireIdTournoiToornament(
        "  https://www.toornament.com/fr/tournaments/123456789012  "
      )
    ).toBe("123456789012");
  });

  it("refuse un autre domaine, même avec le bon chemin", () => {
    expect(
      extraireIdTournoiToornament("https://evil.com/tournaments/123456789012")
    ).toBeNull();
    // Suffixe trompeur : eviltoornament.com n'est PAS *.toornament.com.
    expect(
      extraireIdTournoiToornament(
        "https://eviltoornament.com/tournaments/123456789012"
      )
    ).toBeNull();
  });

  it("refuse une URL sans id numérique ou invalide", () => {
    expect(
      extraireIdTournoiToornament("https://www.toornament.com/fr/tournaments/abc")
    ).toBeNull();
    expect(extraireIdTournoiToornament("pas une url")).toBeNull();
    expect(extraireIdTournoiToornament("")).toBeNull();
  });
});

describe("memePseudo", () => {
  it("ignore la casse, les accents et les espaces superflus", () => {
    expect(memePseudo("Léa ", "lea")).toBe(true);
    expect(memePseudo("KEVIN  DU 80", "kevin du 80")).toBe(true);
  });

  it("distingue deux pseudos réellement différents", () => {
    expect(memePseudo("Aya", "Ayaa")).toBe(false);
  });

  it("refuse le vide (un pseudo vide n'apparie personne)", () => {
    expect(memePseudo("", "")).toBe(false);
    expect(memePseudo("  ", " ")).toBe(false);
  });
});

describe("libelleRang", () => {
  it("1er avec effectif", () => {
    expect(libelleRang(1, 16)).toBe("1er / 16");
  });
  it("3e sans effectif connu", () => {
    expect(libelleRang(3, null)).toBe("3e");
  });
  it("rang inconnu → simple participation", () => {
    expect(libelleRang(null, 16)).toBe("A participé");
  });
});
