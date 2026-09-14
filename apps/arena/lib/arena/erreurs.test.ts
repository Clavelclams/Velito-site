import { describe, expect, it } from "vitest";
import { messageErreurBase } from "./erreurs";

describe("messageErreurBase", () => {
  it("traduit un doublon sans relayer le message brut", () => {
    const m = messageErreurBase(
      { code: "23505", message: 'duplicate key value violates unique constraint "participations_tournoi_id_joueur_id_key"' },
      "Inscription impossible"
    );
    expect(m).toBe("Inscription impossible : cette valeur existe déjà (doublon).");
    expect(m).not.toContain("participations_tournoi_id");
  });

  it("traduit une clé étrangère manquante", () => {
    expect(messageErreurBase({ code: "23503" }, "Suppression impossible")).toMatch(
      /^Suppression impossible : l'élément lié n'existe plus/
    );
  });

  it("garde le code d'une erreur inconnue, jamais son message", () => {
    const m = messageErreurBase({ code: "XX000", message: "internal error: pg_something" }, "Saisie impossible");
    expect(m).toContain("code XX000");
    expect(m).not.toContain("pg_something");
  });

  it("reste lisible sans code du tout", () => {
    expect(messageErreurBase(null, "Enregistrement impossible")).toBe(
      "Enregistrement impossible : erreur technique. Réessaie ; si ça persiste, signale-le."
    );
  });
});
