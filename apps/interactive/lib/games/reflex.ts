/**
 * Réflexe — Tap dès que le signal vert apparaît.
 *
 * Mécanique :
 *   - Phase 'wait' : "Attends le signal" sur les téléphones (fond rouge)
 *   - Le serveur déclenche un signal aléatoirement entre 2 et 8 secondes après
 *     le démarrage du round → phase 'go' (fond vert)
 *   - Le joueur tap → reaction_ms enregistré
 *   - Si tap pendant 'wait' → false start
 *   - À la fin du round : top 3 plus rapides gagnent
 *
 * Scoring :
 *   - Top 1 = 200 pts
 *   - Top 2 = 150 pts
 *   - Top 3 = 100 pts
 *   - Au-delà = 50 pts (si réaction OK)
 *   - False start = 0 pt (ou -50 pt malus)
 */

/** Nombre de rounds par partie. */
export const REFLEX_TOTAL_ROUNDS = 5;
/** Délai mini avant signal vert (ms). */
export const REFLEX_MIN_WAIT_MS = 2000;
/** Délai max avant signal vert (ms). */
export const REFLEX_MAX_WAIT_MS = 7000;
/** Durée max d'attente après le signal pour taper (ms). */
export const REFLEX_TIMEOUT_MS = 3000;
/** Durée du reveal entre 2 rounds (sec). */
export const REFLEX_REVEAL_DURATION_SEC = 6;

export interface ReflexState {
  phase: "wait" | "go" | "reveal" | "final";
  roundIndex: number;
  totalRounds: number;
  /** Timestamp ISO de quand le signal vert apparaît (calculé au start round). */
  goAt?: string;
  /** Timestamp ISO du début de phase reveal. */
  revealStartedAt?: string;
  revealDurationSec?: number;
}

export function reflexPointsForRank(rank: number, hasReaction: boolean): number {
  if (!hasReaction) return 0;
  if (rank === 1) return 200;
  if (rank === 2) return 150;
  if (rank === 3) return 100;
  return 50;
}

/** Génère un délai d'attente aléatoire entre MIN et MAX. */
export function pickWaitMs(): number {
  return Math.floor(
    REFLEX_MIN_WAIT_MS + Math.random() * (REFLEX_MAX_WAIT_MS - REFLEX_MIN_WAIT_MS)
  );
}
