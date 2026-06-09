/**
 * Loup-Garou V1 COMPLET (V2.0a de la spec)
 * 7 rôles + Maire élu.
 */

export type LGRole =
  | "wolf"        // Loup-Garou
  | "white_wolf"  // Loup Blanc (3e camp)
  | "villager"    // Simple Villageois
  | "seer"        // Voyante
  | "witch"       // Sorcière
  | "hunter"      // Chasseur
  | "cupid";      // Cupidon

export const ROLE_LABELS: Record<LGRole, string> = {
  wolf: "Loup-Garou",
  white_wolf: "Loup Blanc",
  villager: "Villageois",
  seer: "Voyante",
  witch: "Sorcière",
  hunter: "Chasseur",
  cupid: "Cupidon",
};

export const ROLE_EMOJIS: Record<LGRole, string> = {
  wolf: "🐺",
  white_wolf: "🐺",
  villager: "🧑‍🌾",
  seer: "🔮",
  witch: "🧙‍♀️",
  hunter: "🏹",
  cupid: "💘",
};

export const ROLE_DESCRIPTIONS: Record<LGRole, string> = {
  wolf: "La nuit, tu dévores un villageois avec les autres loups. Gagne quand les loups sont plus nombreux que les villageois.",
  white_wolf: "Tu es avec les loups la nuit. Une nuit sur deux, tu peux dévorer un loup. Tu gagnes SEUL si tu es le dernier survivant.",
  villager: "Pas de pouvoir. Mais ta parole et ton vote sont décisifs.",
  seer: "Chaque nuit, tu vois le rôle d'un joueur de ton choix.",
  witch: "Tu as 2 potions à usage unique : ressusciter la victime des loups, OU éliminer un autre joueur.",
  hunter: "Si tu meurs, tu tires une dernière balle et tu emportes un joueur avec toi.",
  cupid: "Première nuit uniquement : tu désignes 2 amoureux. Si l'un meurt, l'autre meurt de chagrin. Tu peux t'inclure.",
};

export type LGPhase =
  | "lobby"
  | "setup"           // Distribution rôles + intro
  | "mayor_election"  // Tous votent pour élire le maire
  | "cupid_link"      // Première nuit : Cupidon agit
  | "lovers_reveal"   // Les amoureux se voient l'un l'autre (sur leur tel)
  | "night_seer"      // Voyante regarde
  | "night_wolves"    // Loups votent
  | "night_white_wolf"// Loup Blanc agit (nuits paires)
  | "night_witch"     // Sorcière (voit la victime des loups, décide)
  | "night_resolve"   // Calcul automatique des morts → affiché brièvement
  | "day_reveal"      // Annonce des morts
  | "day_debate"      // Discussion (timer optionnel)
  | "day_vote"        // Vote village
  | "day_resolve"     // Annonce éliminé
  | "hunter_shot"     // Si le Chasseur vient de mourir → il tire
  | "ended";

export interface LGState {
  phase: LGPhase;
  cycleNumber: number; // 1 = première nuit
  /** Joueurs dans l'ordre de la table (pour Montreur d'Ours en V2). */
  seatOrder?: string[];
  /** Le maire actuel. */
  mayorId?: string;
  /** Les amoureux (si Cupidon a joué). */
  loverIds?: [string, string];
  /** Cible des loups cette nuit (calculée avant la Sorcière). */
  wolvesVictimId?: string;
  /** Morts du dernier cycle (pour day_reveal). */
  lastNightDeaths?: string[];
  /** Mort du dernier vote jour (pour day_resolve). */
  lastDayVictimId?: string;
  /** Camp gagnant. */
  winnerCamp?: "wolves" | "village" | "white_wolf" | "lovers";
  /** Si on est en phase hunter_shot, ID du chasseur qui doit tirer. */
  hunterToShootId?: string;
}

/**
 * Sélection des rôles selon le nombre de joueurs (V2.0a recommandé).
 *
 *  5 joueurs : 1 loup, voyante, sorcière, 2 villageois
 *  6         : + 1 chasseur
 *  7         : + cupidon
 *  8         : 2 loups
 *  9         : + loup blanc
 *  10+       : +villageois
 *  12+       : 3 loups
 */
export function pickRoles(playerCount: number): LGRole[] {
  if (playerCount < 4) return [];

  const roles: LGRole[] = [];

  // Nombre de loups
  let wolfCount = 1;
  if (playerCount >= 12) wolfCount = 3;
  else if (playerCount >= 8) wolfCount = 2;

  for (let i = 0; i < wolfCount; i++) roles.push("wolf");

  // Loup Blanc à partir de 9 joueurs
  if (playerCount >= 9) roles.push("white_wolf");

  // Voyante et Sorcière toujours
  roles.push("seer");
  roles.push("witch");

  // Chasseur à partir de 6
  if (playerCount >= 6) roles.push("hunter");

  // Cupidon à partir de 7
  if (playerCount >= 7) roles.push("cupid");

  // Le reste = villageois
  while (roles.length < playerCount) roles.push("villager");

  return roles;
}

/**
 * Mélange un tableau (Fisher-Yates).
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Distribue les rôles aux joueurs.
 */
export function distributeRoles(playerIds: string[]): Map<string, LGRole> {
  const roles = pickRoles(playerIds.length);
  const shuffledRoles = shuffle(roles);
  const shuffledPlayers = shuffle(playerIds);
  const map = new Map<string, LGRole>();
  for (let i = 0; i < shuffledPlayers.length; i++) {
    map.set(shuffledPlayers[i]!, shuffledRoles[i] ?? "villager");
  }
  return map;
}
