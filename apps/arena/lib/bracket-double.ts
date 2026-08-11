/**
 * DOUBLE ÉLIMINATION — moteur pur, zéro I/O, testé (bracket-double.test.ts).
 *
 * STRUCTURE (pour N = 2^k joueurs, k ≥ 2) :
 *   - Tableau principal (bracket "W") : k rounds, comme l'élimination simple.
 *   - Rattrapage (bracket "L") : 2k-2 rounds. Les rounds IMPAIRS opposent
 *     entre eux les survivants du rattrapage ; les rounds PAIRS sont les
 *     "rounds d'accueil" où les perdants du tableau principal descendent
 *     (le perdant du round r ≥ 2 de W tombe au round 2(r-1) de L).
 *   - Grande finale (bracket "GF") : champion W contre champion L.
 *
 * DÉCISIONS V1 (documentées, à défendre en jury) :
 *   1. Effectif = 4, 8, 16 ou 32 EXIGÉ. Les byes dans un rattrapage créent
 *      des cascades de forfaits fantômes très difficiles à garantir justes ;
 *      les tournois réels cappent les inscriptions. Byes double-élim = V2.
 *   2. PAS de "bracket reset" : une seule grande finale, même si le joueur
 *      venu du rattrapage la gagne. Simplicité et durée maîtrisée le jour J.
 *   3. Anti-rematch simple : aux rounds d'accueil PAIRS (r pair côté W), la
 *      position de descente est INVERSÉE (miroir), pour éloigner deux joueurs
 *      qui se sont déjà affrontés. C'est l'heuristique standard légère.
 *
 * Invariant clé : positions 0-BASED partout (aligné sur lib/bracket.ts et la
 * contrainte SQL position >= 0 — leçon du bug prod du 11/08/2026).
 */
import { melangerJoueurs } from "./bracket";

export type BracketDouble = "W" | "L" | "GF";

export interface MatchDoubleGenere {
  bracket: BracketDouble;
  round: number;
  position: number;
  joueur1Id: string | null;
  joueur2Id: string | null;
  isBye: boolean;
  gagnantId: string | null;
}

export interface DestinationDouble {
  bracket: BracketDouble;
  round: number;
  position: number;
  slot: "joueur1" | "joueur2";
}

export interface ProgressionDouble {
  gagnantId: string;
  perdantId: string;
  /** null = le gagnant est CHAMPION (grande finale gagnée). */
  destGagnant: DestinationDouble | null;
  /** null = le perdant est éliminé (défaite en L) ou finaliste (défaite en GF). */
  destPerdant: DestinationDouble | null;
}

const TAILLES_AUTORISEES = [4, 8, 16, 32];

/** k = nombre de rounds du tableau principal (log2 de l'effectif). */
export function profondeurW(nbJoueurs: number): number {
  return Math.log2(nbJoueurs);
}

export function genererBracketDoubleElimination(
  joueurs: readonly string[],
  rng: () => number = Math.random
): MatchDoubleGenere[] {
  if (!TAILLES_AUTORISEES.includes(joueurs.length)) {
    throw new Error(
      `La double élimination exige exactement 4, 8, 16 ou 32 joueurs check-in ` +
        `(actuellement ${joueurs.length}). Ajuste l'effectif ou choisis l'élimination simple.`
    );
  }
  const k = profondeurW(joueurs.length);
  const ordre = melangerJoueurs(joueurs, rng);
  const vide = { joueur1Id: null, joueur2Id: null, isBye: false, gagnantId: null };
  const matchs: MatchDoubleGenere[] = [];

  // Tableau principal — round 1 rempli par tirage, suite vide.
  for (let p = 0; p < joueurs.length / 2; p++) {
    matchs.push({
      bracket: "W",
      round: 1,
      position: p,
      joueur1Id: ordre[2 * p]!,
      joueur2Id: ordre[2 * p + 1]!,
      isBye: false,
      gagnantId: null,
    });
  }
  for (let r = 2; r <= k; r++) {
    for (let p = 0; p < 2 ** (k - r); p++) {
      matchs.push({ bracket: "W", round: r, position: p, ...vide });
    }
  }

  // Rattrapage — paires de rounds (2j-1, 2j) de 2^(k-1-j) matchs chacun.
  for (let j = 1; j <= k - 1; j++) {
    const nb = 2 ** (k - 1 - j);
    for (const l of [2 * j - 1, 2 * j]) {
      for (let p = 0; p < nb; p++) {
        matchs.push({ bracket: "L", round: l, position: p, ...vide });
      }
    }
  }

  // Grande finale.
  matchs.push({ bracket: "GF", round: 1, position: 0, ...vide });

  return matchs;
}

/**
 * Décide gagnant/perdant d'un match et calcule leurs DEUX destinations
 * (le gagnant monte, le perdant du tableau principal descend au rattrapage).
 */
export function progresserDouble(
  match: {
    bracket: BracketDouble;
    round: number;
    position: number;
    joueur1Id: string | null;
    joueur2Id: string | null;
    scoreJ1: number;
    scoreJ2: number;
  },
  k: number
): ProgressionDouble {
  const { bracket, round, position, joueur1Id, joueur2Id, scoreJ1, scoreJ2 } = match;
  if (!joueur1Id || !joueur2Id) {
    throw new Error("Match incomplet : impossible de progresser.");
  }
  if (scoreJ1 === scoreJ2) {
    throw new Error("Égalité interdite : départagez les joueurs avant validation.");
  }
  const gagnantId = scoreJ1 > scoreJ2 ? joueur1Id : joueur2Id;
  const perdantId = scoreJ1 > scoreJ2 ? joueur2Id : joueur1Id;

  if (bracket === "GF") {
    // Pas de reset (décision V1) : gagnant = champion, perdant = finaliste.
    return { gagnantId, perdantId, destGagnant: null, destPerdant: null };
  }

  if (bracket === "W") {
    const destGagnant: DestinationDouble =
      round < k
        ? {
            bracket: "W",
            round: round + 1,
            position: Math.floor(position / 2),
            slot: position % 2 === 0 ? "joueur1" : "joueur2",
          }
        : { bracket: "GF", round: 1, position: 0, slot: "joueur1" };

    let destPerdant: DestinationDouble;
    if (round === 1) {
      // Les perdants du round 1 se rencontrent entre eux au L round 1.
      destPerdant = {
        bracket: "L",
        round: 1,
        position: Math.floor(position / 2),
        slot: position % 2 === 0 ? "joueur1" : "joueur2",
      };
    } else {
      // Round d'accueil : L round 2(r-1), slot joueur2 (joueur1 = survivant L).
      const nbMatchs = 2 ** (k - round);
      const posDescente = round % 2 === 0 ? nbMatchs - 1 - position : position; // miroir anti-rematch
      destPerdant = {
        bracket: "L",
        round: 2 * (round - 1),
        position: posDescente,
        slot: "joueur2",
      };
    }
    return { gagnantId, perdantId, destGagnant, destPerdant };
  }

  // bracket === "L" : le perdant est ÉLIMINÉ (2e défaite), le gagnant monte.
  let destGagnant: DestinationDouble;
  if (round === 2 * k - 2) {
    destGagnant = { bracket: "GF", round: 1, position: 0, slot: "joueur2" };
  } else if (round % 2 === 1) {
    // Round interne → round d'accueil suivant, même position, slot joueur1.
    destGagnant = { bracket: "L", round: round + 1, position, slot: "joueur1" };
  } else {
    // Round d'accueil → round interne suivant, appariement par paires.
    destGagnant = {
      bracket: "L",
      round: round + 1,
      position: Math.floor(position / 2),
      slot: position % 2 === 0 ? "joueur1" : "joueur2",
    };
  }
  return { gagnantId, perdantId, destGagnant, destPerdant: null };
}
