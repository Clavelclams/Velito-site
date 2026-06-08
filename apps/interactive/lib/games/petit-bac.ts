/**
 * Petit Bac — constantes + helpers shared client/server.
 *
 * Mécanique :
 *  - 1 lettre tirée par round, joueurs ont 45s pour trouver 1 mot par catégorie
 *  - À l'expiration : scoring = 1 pt par mot non-vide qui commence par la lettre
 *  - V2 : 2 pts si tu es le seul à avoir trouvé ce mot (déduplication)
 *
 * Pourquoi 6 catégories MAX :
 *  - Au-delà, l'écran joueur (mobile) devient illisible
 *  - 6 catégories tient sur 1 vue scrollable confortable
 */

/** Catégories par défaut — le host pourra en customiser plus tard. */
export const PETIT_BAC_DEFAULT_CATEGORIES = [
  "Prénoms",
  "Métiers",
  "Pays",
  "Villes",
  "Fruits / Légumes",
  "Animaux",
];

/** Durée d'un round (en secondes). */
export const ROUND_DURATION_SEC = 45;

/** Durée d'affichage du reveal avant round suivant (en secondes). */
export const PETITBAC_REVEAL_DURATION_SEC = 8;

/** Nombre de rounds par partie (paramétrable à terme). */
export const TOTAL_ROUNDS = 5;

/**
 * Pool de lettres autorisées — on évite les lettres trop dures (K, W, X, Y, Z)
 * car les mots qui commencent par ces lettres sont rares en français pour la
 * plupart des catégories.
 */
const LETTERS_POOL = "ABCDEFGHIJLMNOPRSTV".split("");

/**
 * Tire une lettre au sort en évitant celles déjà utilisées dans cette partie.
 *
 * @param excluded Lettres déjà jouées dans cette session.
 */
export function pickRandomLetter(excluded: string[] = []): string {
  const available = LETTERS_POOL.filter((l) => !excluded.includes(l));
  if (available.length === 0) {
    // Toutes les lettres ont été jouées → on permet la répétition
    return LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)] ?? "A";
  }
  return available[Math.floor(Math.random() * available.length)] ?? "A";
}

/**
 * Normalise un mot pour la validation :
 *   - Trim espaces
 *   - Lower case
 *   - Retire les accents (é → e)
 */
export function normalizeWord(word: string): string {
  return word
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // Retire diacritiques (combining chars)
}

/**
 * Vérifie qu'un mot commence par la bonne lettre.
 *
 * Tolérance accent : "Élephant" commence par "E" même si la lettre du round est "E".
 */
export function wordStartsWithLetter(word: string, letter: string): boolean {
  if (!word || word.trim().length === 0) return false;
  const normalized = normalizeWord(word);
  const normalizedLetter = normalizeWord(letter);
  return normalized.startsWith(normalizedLetter);
}

/**
 * État courant d'une session Petit Bac, stocké dans sessions.current_state.
 */
export interface PetitBacState {
  phase: "round" | "reveal" | "final";
  round: number;
  totalRounds: number;
  letter: string;
  categories: string[];
  roundStartedAt?: string;
  roundDurationSec?: number;
  revealStartedAt?: string;
  revealDurationSec?: number;
  /** Historique des lettres déjà jouées (pour ne pas en re-tirer une). */
  playedLetters?: string[];
}
