/**
 * Score par SETS (padel, ping-pong) — module pur, testé (14/11/2026).
 *
 * Pourquoi : au padel et au ping-pong, « 2 à 1 » ne raconte pas le match.
 * Le staff veut noter « 6-4 3-6 7-5 », le joueur veut le lire sur sa page.
 * Le classement, le bracket et la validation ne changent PAS : ils lisent
 * toujours score_j1 / score_j2, qui deviennent ici le nombre de sets gagnés.
 * Le détail des sets est un complément, stocké à part (colonne `sets`,
 * migration 013), et toujours optionnel : un tournoi qui joue en format
 * maison (un seul set de 9 jeux, par exemple) saisit juste le score.
 *
 * Règles retenues (amateur, volontairement simples) :
 *  - PADEL : match en 2 sets gagnants. Un set se gagne 6-0 à 6-4, 7-5 ou
 *    7-6 (jeu décisif). Le 3e set peut être un super jeu décisif (10 points,
 *    2 d'écart), comme dans la plupart des tournois loisir.
 *  - PING-PONG : match en 2 ou 3 sets gagnants (au meilleur des 3 ou des 5).
 *    Un set se gagne à 11 avec 2 points d'écart (12-10, 13-11…).
 *  - Aucun set joué après la fin du match ; pas d'égalité dans un set.
 *
 * Saisie : texte libre « 6-4 3-6 7-5 » (séparateurs acceptés : espace,
 * virgule, point-virgule ; entre les deux nombres : - / ou :). Un champ texte
 * plutôt que 10 cases : zéro JavaScript, rapide au clavier d'un téléphone.
 */

export type ScoreSet = readonly [number, number];
export type SportASets = "PADEL" | "PING_PONG";

/** Les libellés exacts de la colonne `jeu` (lib/arena/disciplines.ts). */
const SPORTS: Record<string, SportASets> = {
  Padel: "PADEL",
  "Ping-pong": "PING_PONG",
};

/** Le jeu de ce tournoi se joue-t-il en sets ? null sinon. */
export function sportASets(jeu: string | null | undefined): SportASets | null {
  if (!jeu) return null;
  return SPORTS[jeu] ?? null;
}

export const MAX_SETS = 5;

export type ResultatParse =
  | { ok: true; sets: ScoreSet[] }
  | { ok: false; erreur: string };

/** « 6-4 3-6, 7/5 » → [[6,4],[3,6],[7,5]]. Ne juge pas les règles du sport. */
export function parserSets(texte: string): ResultatParse {
  const morceaux = texte
    .trim()
    .split(/[\s,;]+/)
    .filter((m) => m.length > 0);
  if (morceaux.length === 0) return { ok: false, erreur: "Aucun set saisi." };
  if (morceaux.length > MAX_SETS) {
    return { ok: false, erreur: `${MAX_SETS} sets au maximum.` };
  }
  const sets: ScoreSet[] = [];
  for (const morceau of morceaux) {
    const m = /^(\d{1,2})[-/:](\d{1,2})$/.exec(morceau);
    if (!m) {
      return { ok: false, erreur: `« ${morceau} » n'est pas un set (exemple : 6-4).` };
    }
    sets.push([Number(m[1]), Number(m[2])]);
  }
  return { ok: true, sets };
}

/** Le set est-il un score de fin de set valide pour ce sport ? */
function setValide(sport: SportASets, [a, b]: ScoreSet, superJeuDecisif: boolean): boolean {
  const g = Math.max(a, b);
  const p = Math.min(a, b);
  if (a === b) return false;
  if (sport === "PING_PONG") {
    if (g === 11) return p <= 9;
    return g > 11 && g - p === 2;
  }
  // PADEL
  if (superJeuDecisif) {
    if (g === 10) return p <= 8;
    return g > 10 && g - p === 2;
  }
  if (g === 6) return p <= 4;
  if (g === 7) return p === 5 || p === 6;
  return false;
}

function messageSet(sport: SportASets, superJeuDecisif: boolean): string {
  if (sport === "PING_PONG") return "un set se gagne à 11 avec 2 points d'écart (11-9, 12-10…)";
  if (superJeuDecisif) return "le super jeu décisif se gagne à 10 avec 2 points d'écart (10-8, 11-9…)";
  return "un set se gagne 6-0 à 6-4, 7-5 ou 7-6";
}

export type ResultatAnalyse =
  | { ok: true; scoreJ1: number; scoreJ2: number }
  | { ok: false; erreur: string };

/**
 * Vérifie un match complet et rend le score en sets gagnés.
 * Le match s'arrête dès qu'un camp atteint le nombre de sets gagnants :
 * un set saisi après est une erreur (souvent une faute de frappe).
 */
export function analyserSets(sport: SportASets, sets: readonly ScoreSet[]): ResultatAnalyse {
  if (sets.length === 0) return { ok: false, erreur: "Aucun set saisi." };
  let v1 = 0;
  let v2 = 0;
  // Ping-pong : 2 ou 3 sets gagnants, déduit du score du vainqueur.
  // Padel : toujours 2.
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i]!;
    const decisifPadel = sport === "PADEL" && i === 2 && v1 === 1 && v2 === 1;
    // Au padel, le 3e set peut être un set normal OU un super jeu décisif :
    // on accepte les deux formes, la plus courante en loisir étant le super.
    const ok =
      setValide(sport, set, false) || (decisifPadel && setValide(sport, set, true));
    if (!ok) {
      return {
        ok: false,
        erreur: `Set ${i + 1} (${set[0]}-${set[1]}) impossible : ${messageSet(sport, decisifPadel)}.`,
      };
    }
    if (set[0] > set[1]) v1++;
    else v2++;
    const gagnants = sport === "PADEL" ? 2 : null;
    const fini =
      gagnants !== null
        ? v1 === gagnants || v2 === gagnants
        : // Ping-pong : le match est fini quand un camp a 3 sets, ou 2 sets
          // si c'est le DERNIER set saisi (match au meilleur des 3).
          v1 === 3 || v2 === 3 || ((v1 === 2 || v2 === 2) && i === sets.length - 1);
    if (fini && i < sets.length - 1) {
      return { ok: false, erreur: `Le match est déjà gagné après le set ${i + 1} : enlève les sets en trop.` };
    }
  }
  const gagnant = Math.max(v1, v2);
  const objectif = sport === "PADEL" ? [2] : [2, 3];
  if (!objectif.includes(gagnant) || v1 === v2) {
    return {
      ok: false,
      erreur:
        sport === "PADEL"
          ? "Match incomplet : il faut 2 sets gagnants."
          : "Match incomplet : il faut 2 sets gagnants (au meilleur des 3) ou 3 (au meilleur des 5).",
    };
  }
  // Au meilleur des 5, un 2-0 ou 2-1 est un match non terminé ; au meilleur
  // des 3, il est fini. On ne peut pas les distinguer sans le format : on
  // accepte, c'est le staff qui sait ce qu'il a organisé.
  return { ok: true, scoreJ1: v1, scoreJ2: v2 };
}

/** [[6,4],[3,6]] → « 6-4 3-6 ». Chaîne vide si rien. */
export function formaterSets(sets: readonly ScoreSet[] | null | undefined): string {
  if (!sets || sets.length === 0) return "";
  return sets.map(([a, b]) => `${a}-${b}`).join(" ");
}

/** Lecture défensive de la colonne jsonb (une donnée en base n'est jamais
 *  supposée bien formée). Rend null si ce n'est pas une liste de paires. */
export function lireSets(valeur: unknown): ScoreSet[] | null {
  if (!Array.isArray(valeur) || valeur.length === 0 || valeur.length > MAX_SETS) return null;
  const sets: ScoreSet[] = [];
  for (const s of valeur) {
    if (
      !Array.isArray(s) ||
      s.length !== 2 ||
      !Number.isInteger(s[0]) ||
      !Number.isInteger(s[1]) ||
      s[0] < 0 ||
      s[1] < 0
    ) {
      return null;
    }
    sets.push([s[0] as number, s[1] as number]);
  }
  return sets;
}
