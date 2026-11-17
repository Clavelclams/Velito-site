/**
 * L'état envoyé à l'écran du défi (17/11/2026) : uniquement ce qui s'affiche,
 * jamais d'identifiant interne ni rien de personnel (il n'y en a pas).
 * Partagé par la page (premier affichage) et la route JSON (rafraîchissement).
 */
import { classementDuJour, recapitulatif, recordDuJour, type Phase } from "./defi";
import type { DefiComplet } from "./defi-donnees";

export interface EtatEcran {
  titre: string;
  unite: string;
  /** Heure du serveur (ms) : l'écran corrige l'horloge du PC avec. */
  serveurMs: number;
  rotation: {
    numero: number;
    heure: string | null;
    phase: Phase | null;
    chrono_fin: string | null;
    validee: boolean;
    rouge: number;
    bleu: number;
  } | null;
  classement: { rang: number; nom: string; couleur: "ROUGE" | "BLEU"; score: number }[];
  record: { score: number; equipes: string[] } | null;
  totalJour: number;
  rotationsJouees: number;
}

export function construireEtatEcran(c: DefiComplet, maintenantMs: number): EtatEcran {
  const r = c.rotations.find((x) => x.id === c.defi.rotation_courante_id) ?? null;
  const eq = r ? c.equipes.filter((e) => e.rotation_id === r.id) : [];
  const classement = classementDuJour(c.rotations, c.equipes);
  const recap = recapitulatif(c.rotations, c.equipes);
  return {
    titre: c.defi.titre,
    unite: c.defi.unite,
    serveurMs: maintenantMs,
    rotation: r
      ? {
          numero: r.numero,
          heure: r.heure,
          phase: r.phase,
          chrono_fin: r.chrono_fin,
          validee: r.statut === "VALIDEE",
          rouge: eq.find((e) => e.couleur === "ROUGE")?.score ?? 0,
          bleu: eq.find((e) => e.couleur === "BLEU")?.score ?? 0,
        }
      : null,
    classement: classement.slice(0, 10).map(({ rang, nom, couleur, score }) => ({ rang, nom, couleur, score })),
    record: recordDuJour(classement),
    totalJour: recap.totalJour,
    rotationsJouees: recap.rotationsJouees,
  };
}
