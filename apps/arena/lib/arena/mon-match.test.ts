/**
 * Tests de « mon match ».
 *
 * Les cas couverts sont ceux qui se produisent VRAIMENT un jour de tournoi :
 * un joueur exempté au premier tour, un joueur qui attend son adversaire, un
 * joueur éliminé, un joueur de poule, une équipe de padel. Chaque test décrit
 * une situation réelle plutôt qu'une ligne de code.
 */
import { describe, expect, it } from "vitest";
import { libelleTour, trouverMonMatch } from "./mon-match";
import type { MatchRow } from "./types";

/** Fabrique un match minimal — seuls les champs utiles au test sont fournis. */
function m(p: Partial<MatchRow>): MatchRow {
  return {
    id: p.id ?? "m",
    tournoi_id: "t",
    bracket: p.bracket ?? "W",
    poule: p.poule ?? null,
    round: p.round ?? 1,
    position: p.position ?? 0,
    joueur1_id: p.joueur1_id ?? null,
    joueur2_id: p.joueur2_id ?? null,
    score_j1: p.score_j1 ?? null,
    score_j2: p.score_j2 ?? null,
    is_bye: p.is_bye ?? false,
    gagnant_id: p.gagnant_id ?? null,
    statut: p.statut ?? "A_JOUER",
    equipe1_id: p.equipe1_id ?? null,
    equipe2_id: p.equipe2_id ?? null,
    equipe_gagnante_id: p.equipe_gagnante_id ?? null,
  };
}

describe("trouverMonMatch", () => {
  it("annonce le prochain match et son adversaire", () => {
    const r = trouverMonMatch(
      [m({ id: "a", joueur1_id: "moi", joueur2_id: "rival" })],
      ["moi"]
    );
    expect(r.situation).toBe("A_JOUER");
    expect(r.prochain?.id).toBe("a");
    expect(r.adversaireId).toBe("rival");
  });

  it("dit EN_ATTENTE quand l'adversaire n'est pas encore connu", () => {
    // Cas classique : j'ai gagné mon tour 1, mon tour 2 existe mais l'autre
    // demi-finale n'est pas jouée.
    const r = trouverMonMatch(
      [
        m({ id: "a", round: 1, joueur1_id: "moi", joueur2_id: "x", gagnant_id: "moi", statut: "VALIDE" }),
        m({ id: "b", round: 2, joueur1_id: "moi", joueur2_id: null }),
      ],
      ["moi"]
    );
    expect(r.situation).toBe("EN_ATTENTE");
    expect(r.adversaireId).toBeNull();
    expect(r.victoires).toBe(1);
  });

  it("ignore les byes : un bye n'est pas un match à attendre", () => {
    const r = trouverMonMatch(
      [
        m({ id: "bye", round: 1, joueur1_id: "moi", is_bye: true, gagnant_id: "moi", statut: "VALIDE" }),
        m({ id: "vrai", round: 2, joueur1_id: "moi", joueur2_id: "rival" }),
      ],
      ["moi"]
    );
    expect(r.prochain?.id).toBe("vrai");
    // Le bye ne compte pas comme une victoire : personne n'a été battu.
    expect(r.victoires).toBe(0);
  });

  it("dit ELIMINE après une défaite sans autre match", () => {
    const r = trouverMonMatch(
      [m({ id: "a", joueur1_id: "moi", joueur2_id: "rival", gagnant_id: "rival", statut: "VALIDE" })],
      ["moi"]
    );
    expect(r.situation).toBe("ELIMINE");
    expect(r.defaites).toBe(1);
    expect(r.prochain).toBeNull();
  });

  it("reste concerné par un match LITIGIEUX : le résultat n'est pas figé", () => {
    const r = trouverMonMatch(
      [m({ id: "a", joueur1_id: "moi", joueur2_id: "rival", statut: "LITIGIEUX" })],
      ["moi"]
    );
    expect(r.situation).toBe("A_JOUER");
    expect(r.prochain?.id).toBe("a");
  });

  it("trouve le match d'une ÉQUIPE (padel) et pas seulement d'un joueur", () => {
    // Le camp du match est l'équipe ; le joueur ne s'y trouve jamais en direct.
    const r = trouverMonMatch(
      [m({ id: "a", equipe1_id: "eq-renards", equipe2_id: "eq-aigles" })],
      ["joueur-samir", "eq-renards"]
    );
    expect(r.situation).toBe("A_JOUER");
    expect(r.adversaireId).toBe("eq-aigles");
  });

  it("joue les poules AVANT le tableau final, quel que soit l'ordre reçu", () => {
    // Les matchs arrivent dans le désordre depuis la base : la phase finale
    // ne doit jamais passer devant une journée de poule non jouée.
    const r = trouverMonMatch(
      [
        m({ id: "finale", bracket: "W", round: 1, joueur1_id: "moi", joueur2_id: "z" }),
        m({ id: "poule-j2", bracket: "P", poule: 1, round: 2, joueur1_id: "moi", joueur2_id: "y" }),
      ],
      ["moi"]
    );
    expect(r.prochain?.id).toBe("poule-j2");
  });

  it("renvoie INCONNU pour quelqu'un qui n'est pas dans ce tournoi", () => {
    const r = trouverMonMatch([m({ joueur1_id: "a", joueur2_id: "b" })], ["moi"]);
    expect(r.situation).toBe("INCONNU");
    expect(r.historique).toEqual([]);
  });

  it("renvoie INCONNU si aucun identifiant n'est fourni", () => {
    expect(trouverMonMatch([m({ joueur1_id: "a" })], [null, undefined]).situation).toBe(
      "INCONNU"
    );
  });

  it("compte séparément victoires et défaites sur un parcours complet", () => {
    const r = trouverMonMatch(
      [
        m({ id: "1", round: 1, joueur1_id: "moi", joueur2_id: "a", gagnant_id: "moi", statut: "VALIDE" }),
        m({ id: "2", round: 2, joueur1_id: "moi", joueur2_id: "b", gagnant_id: "moi", statut: "VALIDE" }),
        m({ id: "3", round: 3, joueur1_id: "moi", joueur2_id: "c", gagnant_id: "c", statut: "VALIDE" }),
      ],
      ["moi"]
    );
    expect(r.victoires).toBe(2);
    expect(r.defaites).toBe(1);
    expect(r.situation).toBe("ELIMINE");
    expect(r.historique).toHaveLength(3);
  });
});

describe("libelleTour", () => {
  it("nomme les derniers tours au lieu d'afficher un numéro", () => {
    expect(libelleTour({ ...m({ round: 3 }) }, 3)).toBe("Finale");
    expect(libelleTour({ ...m({ round: 2 }) }, 3)).toBe("Demi-finale");
    expect(libelleTour({ ...m({ round: 1 }) }, 3)).toBe("Quart de finale");
  });

  it("garde un numéro pour les tours lointains", () => {
    expect(libelleTour({ ...m({ round: 1 }) }, 5)).toBe("Tour 1");
  });

  it("nomme les poules par journée et les brackets spéciaux", () => {
    expect(libelleTour({ ...m({ bracket: "P", poule: 2, round: 3 }) }, 3)).toBe(
      "Poule 2 · journée 3"
    );
    expect(libelleTour({ ...m({ bracket: "GF" }) }, 3)).toBe("Grande finale");
    expect(libelleTour({ ...m({ bracket: "L", round: 2 }) }, 3)).toBe("Rattrapage · tour 2");
  });
});
