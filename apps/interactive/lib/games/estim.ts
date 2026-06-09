/**
 * Estim' — Le plus proche du chiffre exact gagne.
 *
 * Mécanique :
 *  - 5 questions chiffrées par partie
 *  - 30s par question : le joueur tape un nombre (peut le modifier)
 *  - Au reveal : on calcule la diff absolue entre la valeur réelle et la guess
 *  - Scoring basé sur la diff en % de la valeur réelle :
 *      Exact (≤1%)        → 100 pts + bonus 1er = 150
 *      Très proche (≤5%)  → 80 pts
 *      Proche (≤15%)      → 50 pts
 *      Moyen (≤30%)       → 25 pts
 *      Loin (>30%)        → 10 pts
 *      Pas de réponse     → 0 pt
 *
 *  - Bonus rang : le 1er du classement gagne +50 pts si dans top 3 par diff
 */

export interface EstimQuestion {
  id: string;
  /** La question : "Combien d'habitants à Paris ?" */
  question: string;
  /** La vraie valeur (peut être très grande). */
  answer: number;
  /** Unité affichée à côté de la réponse ("habitants", "millions €", "min"). */
  unit?: string;
  /** Sous-titre / contexte affiché en petit ("source : INSEE 2023"). */
  hint?: string;
  /** Thème pour catégorisation visuelle. */
  theme?: string;
}

export const ESTIM_QUESTIONS: EstimQuestion[] = [
  // ─── Culture pop ───
  {
    id: "naruto",
    question: "Combien d'épisodes dans la série Naruto Shippuden ?",
    answer: 500,
    unit: "épisodes",
    hint: "Sans les hors-séries",
    theme: "Manga",
  },
  {
    id: "fast-and-furious",
    question: "Combien de films Fast & Furious existent (sortis ou annoncés) ?",
    answer: 11,
    unit: "films",
    theme: "Cinéma",
  },
  {
    id: "harry-potter",
    question: "Combien de pages a le 1er tome de Harry Potter à l'École des Sorciers (édition française) ?",
    answer: 308,
    unit: "pages",
    theme: "Littérature",
  },
  // ─── France / Amiens ───
  {
    id: "habitants-amiens",
    question: "Combien d'habitants à Amiens (commune) ?",
    answer: 134000,
    unit: "habitants",
    hint: "Source : INSEE 2023",
    theme: "Amiens",
  },
  {
    id: "habitants-paris",
    question: "Combien d'habitants à Paris (intra-muros) ?",
    answer: 2102650,
    unit: "habitants",
    hint: "Source : INSEE 2023",
    theme: "France",
  },
  {
    id: "distance-amiens-paris",
    question: "Combien de kilomètres entre Amiens et Paris (par la route) ?",
    answer: 145,
    unit: "km",
    theme: "Amiens",
  },
  {
    id: "tour-eiffel-hauteur",
    question: "Combien de mètres mesure la tour Eiffel (antenne comprise) ?",
    answer: 330,
    unit: "mètres",
    theme: "France",
  },
  // ─── Sport ───
  {
    id: "fifa-membres",
    question: "Combien de fédérations sont membres de la FIFA ?",
    answer: 211,
    unit: "fédérations",
    theme: "Sport",
  },
  {
    id: "mbappe-buts",
    question: "Combien de buts Mbappé a-t-il marqué pour l'équipe de France (mai 2026) ?",
    answer: 50,
    unit: "buts",
    hint: "Estimation au lancement Velito Interactive",
    theme: "Sport",
  },
  {
    id: "marathon",
    question: "Combien de kilomètres fait un marathon officiel ?",
    answer: 42.195,
    unit: "km",
    theme: "Sport",
  },
  // ─── Tech / Internet ───
  {
    id: "youtube-views-despacito",
    question: "Combien de milliards de vues a la vidéo Despacito sur YouTube ?",
    answer: 8.6,
    unit: "milliards de vues",
    hint: "Mai 2026",
    theme: "Internet",
  },
  {
    id: "instagram-users",
    question: "Combien de milliards d'utilisateurs actifs mensuels sur Instagram ?",
    answer: 2.5,
    unit: "milliards",
    hint: "2025",
    theme: "Internet",
  },
  {
    id: "snapchat-snaps",
    question: "Combien de millions de snaps sont envoyés chaque MINUTE dans le monde ?",
    answer: 4,
    unit: "millions de snaps",
    theme: "Internet",
  },
  // ─── Géopolitique / monde ───
  {
    id: "pays-onu",
    question: "Combien d'États membres à l'ONU ?",
    answer: 193,
    unit: "États membres",
    theme: "Monde",
  },
  {
    id: "everest-altitude",
    question: "Combien de mètres mesure l'Everest ?",
    answer: 8849,
    unit: "mètres",
    theme: "Géo",
  },
];

/** Durée d'un round Estim' en secondes. */
export const ESTIM_ROUND_DURATION_SEC = 30;
/** Durée du reveal avant question suivante. */
export const ESTIM_REVEAL_DURATION_SEC = 8;
/** Nombre de rounds par partie. */
export const ESTIM_TOTAL_ROUNDS = 5;

/**
 * Calcule les points selon la diff en % de la vraie valeur.
 *
 * @param guess  L'estimation du joueur
 * @param answer La vraie valeur
 */
export function estimDiffPercent(guess: number, answer: number): number {
  if (answer === 0) return Math.abs(guess) * 100; // edge case
  return Math.abs((guess - answer) / answer) * 100;
}

export function estimPointsForDiff(diffPercent: number): number {
  if (diffPercent <= 1) return 100;
  if (diffPercent <= 5) return 80;
  if (diffPercent <= 15) return 50;
  if (diffPercent <= 30) return 25;
  return 10;
}

/** État Estim' stocké dans sessions.current_state. */
export interface EstimState {
  phase: "round" | "reveal" | "final";
  round: number;
  totalRounds: number;
  /** ID de la question courante (référence ESTIM_QUESTIONS). */
  questionId: string;
  roundStartedAt?: string;
  roundDurationSec?: number;
  revealStartedAt?: string;
  revealDurationSec?: number;
  /** Indices déjà joués (anti-doublon dans la partie). */
  playedQuestionIds?: string[];
}
