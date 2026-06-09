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

/** Catégories par défaut — le host pourra en customiser plus tard.
 *  9 catégories : c'est dense sur mobile mais ça donne plus de variété.
 *  Round time augmenté en conséquence (60s au lieu de 45s). */
export const PETIT_BAC_DEFAULT_CATEGORIES = [
  "Prénom garçon",
  "Prénom fille",
  "Animal",
  "Fruit / Légume",
  "Célébrité",
  "Mot anglais",
  "Objet",
  "Marque",
  "Pays / Ville",
];

/** Durée d'un round (en secondes). 60s car 9 catégories à remplir. */
export const ROUND_DURATION_SEC = 60;

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

/** Longueur minimale d'un mot valide (évite la triche genre "B" tout seul). */
export const MIN_WORD_LENGTH = 3;

/**
 * Vérifie qu'un mot commence par la bonne lettre et est suffisamment long.
 *
 * Validations :
 *  - Au moins MIN_WORD_LENGTH caractères (anti-triche : un seul lettre rejetée)
 *  - Commence par la bonne lettre (tolérance accent : "Élephant" pour 'E')
 *  - Pas que des chiffres / symboles : doit contenir au moins 2 lettres
 *
 * V2 : on pourra croiser avec une banque de mots SQL pour validation stricte.
 */
export function wordStartsWithLetter(word: string, letter: string): boolean {
  if (!word) return false;
  const trimmed = word.trim();
  if (trimmed.length < MIN_WORD_LENGTH) return false;

  const normalized = normalizeWord(trimmed);
  const normalizedLetter = normalizeWord(letter);
  if (!normalized.startsWith(normalizedLetter)) return false;

  // Au moins 2 caractères alphabétiques (évite "B12" ou "B--")
  const letterCount = (normalized.match(/[a-z]/g) ?? []).length;
  return letterCount >= 2;
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
