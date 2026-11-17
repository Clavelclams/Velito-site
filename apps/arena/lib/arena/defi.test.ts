import { describe, expect, it } from "vitest";
import {
  classementDuJour,
  formaterChrono,
  gagnantRotation,
  lignesCsv,
  nomEquipe,
  parserProgramme,
  recapitulatif,
  recordDuJour,
  vueEcran,
  DUREE_PANNEAU_MS,
  type EquipeDefi,
  type RotationDefi,
} from "./defi";

const rot = (id: string, numero: number, statut: RotationDefi["statut"] = "VALIDEE"): RotationDefi => ({
  id, numero, heure: "09:30", statut, phase: null, chrono_debut: null, chrono_fin: null, valide_le: null,
});
const eq = (rotation_id: string, couleur: EquipeDefi["couleur"], score: number): EquipeDefi => ({
  id: `${rotation_id}-${couleur}`, rotation_id, couleur, score,
});

describe("parserProgramme", () => {
  it("lit le programme de Stade vers l'Emploi", () => {
    const r = parserProgramme("G1 9h30\nG2 9h45\n\nG6 11h00\ng7 11:15");
    expect(r).toEqual({ ok: true, rotations: [
      { numero: 1, heure: "09:30" }, { numero: 2, heure: "09:45" }, { numero: 6, heure: "11:00" }, { numero: 7, heure: "11:15" },
    ] });
  });
  it("refuse un doublon et une ligne illisible", () => {
    expect(parserProgramme("G1 9h30\nG1 9h45").ok).toBe(false);
    expect(parserProgramme("G1 matin").ok).toBe(false);
    expect(parserProgramme("").ok).toBe(false);
  });
});

describe("classement et record", () => {
  const rotations = [rot("a", 1), rot("b", 2), rot("c", 3, "EN_COURS")];
  const equipes = [eq("a", "ROUGE", 12), eq("a", "BLEU", 9), eq("b", "ROUGE", 12), eq("b", "BLEU", 15), eq("c", "ROUGE", 40), eq("c", "BLEU", 0)];
  it("ne compte que les rotations validées, trie, gère les ex æquo", () => {
    const c = classementDuJour(rotations, equipes);
    expect(c.map((l) => `${l.rang}:${l.nom}:${l.score}`)).toEqual(["1:G2 Bleu:15", "2:G1 Rouge:12", "2:G2 Rouge:12", "4:G1 Bleu:9"]);
  });
  it("record du jour", () => {
    expect(recordDuJour(classementDuJour(rotations, equipes))).toEqual({ score: 15, equipes: ["G2 Bleu"] });
    expect(recordDuJour([])).toBeNull();
  });
});

describe("gagnantRotation et récapitulatif", () => {
  it("gagnant, égalité, rien", () => {
    expect(gagnantRotation([eq("a", "ROUGE", 5), eq("a", "BLEU", 3)])).toBe("ROUGE");
    expect(gagnantRotation([eq("a", "ROUGE", 4), eq("a", "BLEU", 4)])).toBe("EGALITE");
    expect(gagnantRotation([eq("a", "ROUGE", 0), eq("a", "BLEU", 0)])).toBeNull();
  });
  it("total et rotations jouées ne comptent que les validées", () => {
    const r = recapitulatif([rot("a", 1), rot("b", 2, "A_VENIR")], [eq("a", "ROUGE", 5), eq("a", "BLEU", 3), eq("b", "ROUGE", 9), eq("b", "BLEU", 9)]);
    expect(r.rotationsJouees).toBe(1);
    expect(r.totalJour).toBe(8);
  });
  it("CSV : une ligne par équipe et un total", () => {
    const l = lignesCsv([rot("a", 1)], [eq("a", "ROUGE", 5), eq("a", "BLEU", 3)], "plats");
    expect(l[1]).toEqual(["G1", "09:30", "G1 Rouge", "5", "G1 Rouge", "jouée"]);
    expect(l[l.length - 1]![3]).toBe("8");
  });
});

describe("vueEcran", () => {
  const t0 = Date.parse("2026-11-17T09:36:00Z");
  it("chrono en cours : la manche, avec le temps restant", () => {
    const v = vueEcran({ phase: "COMPTEE", chrono_fin: new Date(t0 + 90_000).toISOString() }, t0);
    expect(v).toEqual({ type: "MANCHE", phase: "COMPTEE", resteMs: 90_000 });
  });
  it("manche comptée finie : le résultat, puis l'alternance", () => {
    const fin = new Date(t0).toISOString();
    expect(vueEcran({ phase: "COMPTEE", chrono_fin: fin }, t0 + 10_000).type).toBe("RESULTAT");
    expect(vueEcran({ phase: "COMPTEE", chrono_fin: fin }, t0 + 200_000).type).toBe("ALTERNANCE");
  });
  it("manche d'essai finie : retour direct à l'alternance", () => {
    expect(vueEcran({ phase: "ESSAI", chrono_fin: new Date(t0).toISOString() }, t0 + 1000).type).toBe("ALTERNANCE");
  });
  it("alternance réglée sur l'horloge", () => {
    expect(vueEcran(null, 0)).toEqual({ type: "ALTERNANCE", panneau: "COMMENT" });
    expect(vueEcran(null, DUREE_PANNEAU_MS)).toEqual({ type: "ALTERNANCE", panneau: "MANETTE" });
    expect(vueEcran(null, DUREE_PANNEAU_MS * 2)).toEqual({ type: "ALTERNANCE", panneau: "CLASSEMENT" });
  });
});

describe("divers", () => {
  it("nomEquipe et formaterChrono", () => {
    expect(nomEquipe(3, "ROUGE")).toBe("G3 Rouge");
    expect(formaterChrono(240_000)).toBe("4:00");
    expect(formaterChrono(187_200)).toBe("3:08");
    expect(formaterChrono(-5)).toBe("0:00");
  });
});
