import { describe, expect, it } from "vitest";
import {
  etatAutorisationParentale,
  lienConnexion,
  peutDemanderRattachement,
  peutFaireCheckIn,
  peutSeDesinscrire,
  peutSInscrireEnLigne,
  validerPseudo,
} from "./espace-joueur";

describe("validerPseudo", () => {
  it("nettoie les espaces", () => {
    expect(validerPseudo("  Léa  ")).toBe("Léa");
    expect(validerPseudo("Le   Renard")).toBe("Le Renard");
  });
  it("refuse trop court, trop long, vide", () => {
    expect(validerPseudo("a")).toBeNull();
    expect(validerPseudo("x".repeat(33))).toBeNull();
    expect(validerPseudo(null)).toBeNull();
  });
  it("refuse les caractères invisibles", () => {
    expect(validerPseudo("Lea\u200b")).toBeNull();
    expect(validerPseudo("Le\u0007a")).toBeNull();
  });
});

describe("peutDemanderRattachement", () => {
  const libre = { user_id: null, anonymise: false };
  it("accepte un pseudo libre", () => {
    expect(peutDemanderRattachement({ joueur: libre, compteDejaRelie: false, demandeEnCours: false })).toEqual({ ok: true });
  });
  it("refuse si le compte a déjà un joueur ou une demande", () => {
    expect(peutDemanderRattachement({ joueur: libre, compteDejaRelie: true, demandeEnCours: false }).ok).toBe(false);
    expect(peutDemanderRattachement({ joueur: libre, compteDejaRelie: false, demandeEnCours: true }).ok).toBe(false);
  });
  it("refuse un pseudo inconnu, effacé ou déjà pris", () => {
    expect(peutDemanderRattachement({ joueur: null, compteDejaRelie: false, demandeEnCours: false }).ok).toBe(false);
    expect(
      peutDemanderRattachement({ joueur: { user_id: null, anonymise: true }, compteDejaRelie: false, demandeEnCours: false }).ok
    ).toBe(false);
    expect(
      peutDemanderRattachement({ joueur: { user_id: "u", anonymise: false }, compteDejaRelie: false, demandeEnCours: false }).ok
    ).toBe(false);
  });
});

describe("etatAutorisationParentale", () => {
  // En 2026 : né en 2012 → 13 ans certains (< 15) ; né en 2010 → 15 ans certains.
  it("moins de 15 ans sans autorisation : en attente", () => {
    expect(etatAutorisationParentale(2012, null, 2026)).toBe("EN_ATTENTE");
  });
  it("moins de 15 ans avec autorisation : recueillie", () => {
    expect(etatAutorisationParentale(2012, "2026-11-12T10:00:00Z", 2026)).toBe("RECUEILLIE");
  });
  it("15 ans et plus : non requise", () => {
    expect(etatAutorisationParentale(2010, null, 2026)).toBe("NON_REQUISE");
  });
  it("né en 2011 en 2026 : 14 ans certains, donc requise (protéger par excès)", () => {
    expect(etatAutorisationParentale(2011, null, 2026)).toBe("EN_ATTENTE");
  });
  it("année inconnue : ne bloque pas", () => {
    expect(etatAutorisationParentale(null, null, 2026)).toBe("AGE_INCONNU");
    expect(peutFaireCheckIn("AGE_INCONNU").ok).toBe(true);
  });
  it("check-in refusé seulement en attente", () => {
    expect(peutFaireCheckIn("EN_ATTENTE").ok).toBe(false);
    expect(peutFaireCheckIn("RECUEILLIE").ok).toBe(true);
    expect(peutFaireCheckIn("NON_REQUISE").ok).toBe(true);
  });
});

describe("peutSInscrireEnLigne", () => {
  const ouvert = { statut: "OUVERT" as const, inscription_en_ligne: true, max_joueurs: 8 };
  it("accepte un tournoi ouvert, en ligne, avec de la place", () => {
    expect(peutSInscrireEnLigne({ tournoi: ouvert, nbInscrits: 7, dejaInscrit: false })).toEqual({ ok: true });
  });
  it("refuse complet, déjà inscrit, fermé, sans option en ligne", () => {
    expect(peutSInscrireEnLigne({ tournoi: ouvert, nbInscrits: 8, dejaInscrit: false }).ok).toBe(false);
    expect(peutSInscrireEnLigne({ tournoi: ouvert, nbInscrits: 0, dejaInscrit: true }).ok).toBe(false);
    expect(peutSInscrireEnLigne({ tournoi: { ...ouvert, statut: "EN_COURS" }, nbInscrits: 0, dejaInscrit: false }).ok).toBe(false);
    expect(
      peutSInscrireEnLigne({ tournoi: { ...ouvert, inscription_en_ligne: false }, nbInscrits: 0, dejaInscrit: false }).ok
    ).toBe(false);
  });
  it("sans limite de places : toujours de la place", () => {
    expect(peutSInscrireEnLigne({ tournoi: { ...ouvert, max_joueurs: null }, nbInscrits: 500, dejaInscrit: false }).ok).toBe(true);
  });
});

describe("peutSeDesinscrire", () => {
  it("avant le début et avant le check-in seulement", () => {
    expect(peutSeDesinscrire({ statut: "OUVERT", checkIn: false }).ok).toBe(true);
    expect(peutSeDesinscrire({ statut: "OUVERT", checkIn: true }).ok).toBe(false);
    expect(peutSeDesinscrire({ statut: "EN_COURS", checkIn: false }).ok).toBe(false);
  });
});

describe("lienConnexion", () => {
  it("encode l'adresse de retour", () => {
    expect(lienConnexion("https://hub.velito.fr/login", "https://arena.velito.fr/moi")).toBe(
      "https://hub.velito.fr/login?return=https%3A%2F%2Farena.velito.fr%2Fmoi"
    );
  });
  it("ajoute à une adresse qui a déjà des paramètres", () => {
    expect(lienConnexion("https://hub.velito.fr/login?x=1", "/moi")).toBe("https://hub.velito.fr/login?x=1&return=%2Fmoi");
  });
});
