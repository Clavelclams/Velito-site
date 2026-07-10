/**
 * Jeu Dessin — mode Pictionary
 *
 * Règles :
 *   - Un joueur tiré au sort dessine un mot (60s)
 *   - Les autres devinent en tapant dans une barre
 *   - Tolérance Levenshtein ≤ 2 (réutilise Petit Bac)
 *   - Scoring devineur : 1000 → 200 pts dégressif sur 60s
 *   - Scoring dessinateur : 200 × nb_de_trouveurs
 *   - Chaque joueur dessine 1 fois (5-10 rounds pour 5-10 joueurs)
 *
 * Realtime canvas : on n'utilise PAS postgres_changes pour les strokes
 * (trop lent + spam DB). On utilise les channels broadcast Supabase.
 */

// ════════════════════════════════════════════════════════════════════
// Constantes
// ════════════════════════════════════════════════════════════════════

export const DRAW_TIME_LIMIT_SEC = 60;
export const DRAW_REVEAL_DURATION_SEC = 8;

/** Throttle du snapshot canvas (ms entre 2 broadcasts). */
export const DRAW_SNAPSHOT_INTERVAL_MS = 300;

/** Taille max du snapshot PNG en base64 (~120 Ko avant compression). */
export const DRAW_MAX_PAYLOAD_KB = 120;

// ════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════

export type DrawPhase =
  | "lobby"            // Avant le start
  | "drawing"          // Round en cours, dessinateur dessine
  | "reveal"           // Mot révélé, classement du round
  | "final";           // Partie terminée

export interface DrawCurrentRound {
  /** UUID de la ligne dans interactive.draw_rounds */
  roundId: string;
  drawerPlayerId: string;
  drawerPseudo: string;
  word: string;
  /** ISO timestamp début du round */
  startedAt: string;
}

export interface DrawRevealStats {
  word: string;
  drawerPlayerId: string;
  drawerPseudo: string;
  drawerPoints: number;
  guessers: Array<{
    playerId: string;
    pseudo: string;
    elapsedMs: number;
    points: number;
  }>;
  totalGuessers: number;
}

export interface DrawState {
  phase: DrawPhase;
  /** Index du round courant (1-based pour affichage) */
  roundIndex: number;
  totalRounds: number;
  /** Liste des playerIds qui ont déjà dessiné (pour rotation) */
  drawnBy: string[];
  /** Round en cours, undefined en phase 'lobby' et 'final' */
  current?: DrawCurrentRound;
  /** Stats du dernier reveal, undefined si pas encore eu de reveal */
  lastReveal?: DrawRevealStats;
  timeLimitSec: number;
}

// ════════════════════════════════════════════════════════════════════
// Banque de mots (100 mots dont 10 Amiens + 10 Moxy/VEA pour com)
// ════════════════════════════════════════════════════════════════════

/**
 * Mots classés par difficulté (facile → moyen → difficile).
 * Le picker mélange pour avoir un mix sur la partie.
 */
export const DRAW_WORDS = {
  facile: [
    // Animaux
    "chat", "chien", "poisson", "vache", "cochon", "lapin", "tortue", "serpent",
    "papillon", "abeille",
    // Objets
    "chaise", "table", "lit", "clé", "lunettes", "chapeau", "parapluie",
    "ballon", "livre", "stylo",
    // Nourriture
    "pizza", "burger", "glace", "pomme", "banane",
    // Nature
    "soleil", "lune", "étoile", "arbre", "fleur",
    // Ajouts 07/2026 (variété — retour playtest)
    "fromage", "croissant", "carotte", "œuf", "gâteau",
    "maison", "porte", "échelle", "bougie", "cadeau",
    "nuage", "pluie", "arc-en-ciel", "champignon", "escargot",
  ],
  moyen: [
    // Animaux
    "girafe", "éléphant", "dauphin", "kangourou", "pingouin", "hibou", "requin",
    // Lieux
    "plage", "montagne", "château", "phare", "pyramide",
    // Métiers
    "pompier", "docteur", "boulanger", "policier", "pilote",
    // Sports
    "football", "tennis", "natation", "boxe", "skate",
    // Objets
    "guitare", "piano", "vélo", "voiture", "avion", "bateau", "fusée",
    "ordinateur", "téléphone",
    // Actions
    "dormir", "courir", "danser", "manger",
    // Ajouts 07/2026 (variété — retour playtest)
    "crocodile", "chauve-souris", "hérisson", "flamant rose",
    "cirque", "igloo", "moulin", "volcan", "cascade",
    "coiffeur", "plombier", "arbitre", "clown",
    "basket", "escalade", "pétanque", "ski",
    "tracteur", "hélicoptère", "sous-marin", "montgolfière",
    "pêcher", "peindre", "pleurer", "chanter",
  ],
  difficile: [
    "tournesol", "boussole", "labyrinthe", "kaléidoscope", "horloge",
    "microscope", "télescope", "trampoline", "saxophone", "harmonica",
    "sablier", "girouette", "chevalier", "magicien", "détective",
    "astronaute", "scaphandre", "marionnette", "perroquet", "caméléon",
    // Ajouts 07/2026 (variété — retour playtest)
    "épouvantail", "funambule", "catapulte", "périscope", "stalactite",
    "ventriloque", "somnambule", "métronome", "phare breton", "gargouille",
    "ornithorynque", "jongleur", "apiculteur", "paratonnerre", "hamac",
  ],
  /** Spécial Amiens — pour la com de l'event Moxy */
  amiens: [
    "cathédrale", "hortillonnages", "Jules Verne", "beffroi", "macaron",
    "Picardie", "Somme", "citadelle", "tramway", "Géant du Nord",
  ],
  /** Spécial Moxy / VEA / esport — pour la com de l'event Moxy */
  moxy_vea: [
    "hôtel", "cocktail", "manette", "gaming", "esport",
    "tournoi", "casque audio", "écran", "VEA", "Velito",
  ],
};

/** Renvoie tous les mots à plat dans un seul array. */
export function getAllDrawWords(): string[] {
  return [
    ...DRAW_WORDS.facile,
    ...DRAW_WORDS.moyen,
    ...DRAW_WORDS.difficile,
    ...DRAW_WORDS.amiens,
    ...DRAW_WORDS.moxy_vea,
  ];
}

/**
 * Tire N mots aléatoires en s'assurant d'inclure quelques mots "spécial Amiens/Moxy"
 * pour la com de l'event. On garantit 1 mot amiens + 1 mot moxy si N >= 5.
 */
export function pickWordsForSession(count: number): string[] {
  const facile = shuffleArr([...DRAW_WORDS.facile]);
  const moyen = shuffleArr([...DRAW_WORDS.moyen]);
  const amiens = shuffleArr([...DRAW_WORDS.amiens]);
  const moxy = shuffleArr([...DRAW_WORDS.moxy_vea]);
  const difficile = shuffleArr([...DRAW_WORDS.difficile]);

  const picked: string[] = [];

  // Garantie 1 amiens + 1 moxy si on a 5+ rounds
  if (count >= 5) {
    if (amiens[0]) picked.push(amiens[0]);
    if (moxy[0]) picked.push(moxy[0]);
  }

  // Mix facile / moyen / difficile (ratio 4/4/2)
  const remainingCount = count - picked.length;
  const target = {
    facile: Math.ceil(remainingCount * 0.4),
    moyen: Math.ceil(remainingCount * 0.4),
    difficile: Math.floor(remainingCount * 0.2),
  };

  for (let i = 0; i < target.facile && i < facile.length; i++) {
    const w = facile[i];
    if (w) picked.push(w);
  }
  for (let i = 0; i < target.moyen && i < moyen.length; i++) {
    const w = moyen[i];
    if (w) picked.push(w);
  }
  for (let i = 0; i < target.difficile && i < difficile.length; i++) {
    const w = difficile[i];
    if (w) picked.push(w);
  }

  // Si on dépasse, on coupe ; si on est court, on complète avec du moyen
  if (picked.length > count) return shuffleArr(picked).slice(0, count);
  while (picked.length < count) {
    const w = moyen[picked.length % moyen.length];
    if (w) picked.push(w);
    else break;
  }

  return shuffleArr(picked);
}

function shuffleArr<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i]!;
    const b = copy[j]!;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

// ════════════════════════════════════════════════════════════════════
// Levenshtein — tolérance d'orthographe (réutilisé du Petit Bac)
// ════════════════════════════════════════════════════════════════════

/**
 * Distance de Levenshtein : nombre de modifications (insertion/suppression/
 * substitution) pour transformer 'a' en 'b'.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const m = a.length;
  const n = b.length;

  let prev = new Array<number>(n + 1).fill(0);
  let curr = new Array<number>(n + 1).fill(0);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1,        // suppression
        curr[j - 1]! + 1,    // insertion
        prev[j - 1]! + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n]!;
}

/** Normalise pour comparaison : minuscules, sans accents, sans ponctuation. */
export function normalizeGuess(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compare une guess à un mot cible avec tolérance Levenshtein.
 * - Exact (après normalisation) → correct
 * - 1 caractère d'écart sur les mots de 4+ lettres → correct (faute de frappe)
 * - 2 caractères d'écart sur les mots de 7+ lettres → correct
 */
export function isGuessCorrect(guess: string, target: string): boolean {
  const g = normalizeGuess(guess);
  const t = normalizeGuess(target);
  if (!g || !t) return false;
  if (g === t) return true;

  const dist = levenshtein(g, t);
  if (t.length >= 7 && dist <= 2) return true;
  if (t.length >= 4 && dist <= 1) return true;
  return false;
}

// ════════════════════════════════════════════════════════════════════
// Scoring
// ════════════════════════════════════════════════════════════════════

/**
 * Score d'un devineur basé sur le temps de réponse.
 *  - 0-10s   → 1000 pts
 *  - 60s     → 200 pts
 *  - Linéaire entre les 2
 */
export function calculateGuesserScore(elapsedMs: number, timeLimitSec: number): number {
  const elapsedSec = Math.min(elapsedMs / 1000, timeLimitSec);
  if (elapsedSec <= 10) return 1000;
  // De 10s à timeLimitSec : on passe de 1000 à 200
  const ratio = (elapsedSec - 10) / (timeLimitSec - 10);
  const score = 1000 - ratio * 800;
  return Math.max(200, Math.round(score / 10) * 10);
}

/**
 * Score du dessinateur basé sur le nombre de trouveurs.
 *  - 0 trouveur  → 0 pts (dessin incompris)
 *  - 1 trouveur  → 200 pts
 *  - N trouveurs → 200 × N pts
 *  - Bonus +500 si TOUS les autres joueurs ont trouvé (dessin parfait)
 */
export function calculateDrawerScore(
  guessersFound: number,
  totalGuessers: number
): number {
  if (guessersFound === 0) return 0;
  let score = 200 * guessersFound;
  if (totalGuessers > 0 && guessersFound === totalGuessers) {
    score += 500; // Dessin parfait
  }
  return score;
}
