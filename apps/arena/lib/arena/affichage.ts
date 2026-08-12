/**
 * Helpers d'affichage partagés (admin + page publique).
 * Purs et testés — et surtout écrits UNE fois au lieu d'être dupliqués
 * dans chaque page (le bug classique : on corrige l'un, on oublie l'autre).
 */

import type { MatchRow } from "./types";

/** Poule 1 → "A", poule 2 → "B"… (au-delà de Z, on retombe sur le numéro). */
export function lettrePoule(numero: number): string {
  return numero >= 1 && numero <= 26
    ? String.fromCharCode(64 + numero)
    : String(numero);
}

/** Libellé humain d'un format de tournoi. */
export function nomFormat(format: string): string {
  if (format === "DOUBLE_ELIMINATION") return "double élimination";
  if (format === "POULES_FINALE") return "poules + phase finale";
  return "élimination simple";
}

/** Nom humain d'un round : "Finale", "Demi-finales", "Quarts de finale", "Round N". */
export function nomRound(round: number, nbRounds: number): string {
  if (round === nbRounds) return "Finale";
  if (round === nbRounds - 1) return "Demi-finales";
  if (round === nbRounds - 2) return "Quarts de finale";
  return `Round ${round}`;
}

/**
 * Le match qui décide du champion : la Grande finale en double élimination,
 * le match du dernier round en élimination simple.
 */
export function matchFinal(matchs: MatchRow[]): MatchRow | undefined {
  if (matchs.length === 0) return undefined;
  const gf = matchs.find((m) => m.bracket === "GF");
  if (gf) return gf;
  // Les matchs de poule ne désignent aucun champion : on ne regarde que le
  // bracket à élimination (phase finale d'un tournoi à poules incluse).
  const elimination = matchs.filter((m) => (m.bracket ?? "W") !== "P");
  if (elimination.length === 0) return undefined;
  const nbRounds = Math.max(...elimination.map((m) => m.round));
  return elimination.find((m) => m.round === nbRounds);
}

/**
 * Groupes d'affichage ordonnés — même rendu pour l'admin et la page publique.
 * Simple : un groupe par round ("Quarts", "Demi-finales", "Finale").
 * Double : Tableau principal → Rattrapage → Grande finale.
 */
export function grouperMatchsParSection(
  matchs: MatchRow[]
): { titre: string; matchs: MatchRow[] }[] {
  if (matchs.length === 0) return [];
  const tri = (a: MatchRow, b: MatchRow) => a.round - b.round || a.position - b.position;
  const estDouble = matchs.some((m) => m.bracket === "GF");
  const poules = matchs.filter((m) => (m.bracket ?? "W") === "P");

  // --- Poules + phase finale : une section par poule, puis le bracket final.
  if (poules.length > 0) {
    const groupes: { titre: string; matchs: MatchRow[] }[] = [];
    const numeros = [...new Set(poules.map((m) => m.poule ?? 1))].sort(
      (a, b) => a - b
    );
    for (const n of numeros) {
      const liste = poules.filter((m) => (m.poule ?? 1) === n).sort(tri);
      groupes.push({ titre: `Poule ${lettrePoule(n)}`, matchs: liste });
    }
    const finale = matchs.filter((m) => (m.bracket ?? "W") !== "P");
    if (finale.length > 0) {
      const nbRounds = Math.max(...finale.map((m) => m.round));
      for (let r = 1; r <= nbRounds; r++) {
        const liste = finale.filter((m) => m.round === r).sort(tri);
        if (liste.length)
          groupes.push({
            titre: `Phase finale — ${nomRound(r, nbRounds)}`,
            matchs: liste,
          });
      }
    }
    return groupes;
  }

  if (!estDouble) {
    const nbRounds = Math.max(...matchs.map((m) => m.round));
    const groupes: { titre: string; matchs: MatchRow[] }[] = [];
    for (let r = 1; r <= nbRounds; r++) {
      const liste = matchs.filter((m) => m.round === r).sort(tri);
      if (liste.length) groupes.push({ titre: nomRound(r, nbRounds), matchs: liste });
    }
    return groupes;
  }

  const w = matchs.filter((m) => (m.bracket ?? "W") === "W");
  const l = matchs.filter((m) => m.bracket === "L");
  const gf = matchs.filter((m) => m.bracket === "GF");
  const groupes: { titre: string; matchs: MatchRow[] }[] = [];

  const kW = Math.max(...w.map((m) => m.round));
  for (let r = 1; r <= kW; r++) {
    const liste = w.filter((m) => m.round === r).sort(tri);
    if (liste.length)
      groupes.push({ titre: `Tableau principal — ${nomRound(r, kW)}`, matchs: liste });
  }
  const kL = l.length ? Math.max(...l.map((m) => m.round)) : 0;
  for (let r = 1; r <= kL; r++) {
    const liste = l.filter((m) => m.round === r).sort(tri);
    if (liste.length) groupes.push({ titre: `Rattrapage — Round ${r}`, matchs: liste });
  }
  if (gf.length) groupes.push({ titre: "Grande finale", matchs: gf });
  return groupes;
}
