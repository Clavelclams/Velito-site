/**
 * lib/gamification.ts — Utilitaires de calcul XP / Niveau / Récompenses.
 *
 * Source de vérité : décisions Clavel 19/05/2026.
 *   - XP progressif : niveau N → N+1 coûte 50×N XP.
 *   - XP cumulés pour atteindre niveau N : 25 × N × (N-1).
 *   - Niveau max : aucun plafond technique, mais récompenses définies jusqu'à 10.
 *   - Barème XP : tournoi joueur +10, podium +5, 1h bénévolat +15, urgent +20.
 *
 * Cette logique est partagée client/serveur (composant client + Server Action).
 * Pas de dépendance React → import depuis n'importe où.
 *
 * === Règle saison (décision Clavel 20/05/2026) ===
 * Officiellement, la saison VEA va de septembre à juin (rythme scolaire).
 * MAIS : le site est lancé le 20/05/2026, et la saison 2025/26 n'a jamais
 * été comptabilisée numériquement (pas de site à l'époque).
 *
 * Décision : à partir du 20/05/2026, TOUT XP / heure / tournoi enregistré
 * compte pour la saison de l'Éveil 2026/27, même si on est techniquement
 * encore dans la fin de la saison 2025/26 (juin 2026).
 *
 * Justification : éviter d'avoir une saison 2025/26 vide dans les bilans,
 * et démarrer proprement la gamification sur une saison complète.
 *
 * À mentionner dans le bilan d'activité 2025/26 (texte) : "site lancé en mai
 * 2026, saison gamifiée 2026/27 démarrée anticipativement dès le 20/05/2026."
 */

export const XP_BAREME = {
  tournoi: 10,
  podium: 5,
  benevolat_par_heure: 15,
  urgent: 20,
} as const;

/**
 * XP cumulés requis pour atteindre le niveau N.
 * Formule : 25 × N × (N-1).
 *   - Niveau 1 : 0 XP (point de départ)
 *   - Niveau 2 : 50 XP
 *   - Niveau 3 : 150 XP
 *   - Niveau 5 : 500 XP
 *   - Niveau 10 : 2 250 XP
 */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * level * (level - 1);
}

/**
 * Calcule le niveau actuel à partir d'un total d'XP cumulés.
 * Résout l'inéquation : xp >= 25×N×(N-1) → N ≤ (1 + √(1 + 4×xp/25)) / 2
 */
export function computeLevel(xp: number): number {
  if (xp <= 0) return 1;
  const level = Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2);
  return Math.max(1, level);
}

/**
 * Retourne les infos détaillées pour afficher la progression :
 *   - level : niveau actuel
 *   - xpInLevel : XP gagnés DANS le niveau actuel
 *   - xpToNextLevel : XP nécessaires pour passer au niveau suivant
 *   - progressPercent : 0-100, pour la XpBar
 */
export interface LevelInfo {
  level: number;
  xpTotal: number;
  xpInLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
}

export function getLevelInfo(xpTotal: number): LevelInfo {
  const level = computeLevel(xpTotal);
  const xpStartLevel = xpRequiredForLevel(level);
  const xpEndLevel = xpRequiredForLevel(level + 1);
  const xpInLevel = xpTotal - xpStartLevel;
  const xpRangeLevel = xpEndLevel - xpStartLevel;
  const xpToNextLevel = xpEndLevel - xpTotal;
  const progressPercent =
    xpRangeLevel > 0 ? Math.round((xpInLevel / xpRangeLevel) * 100) : 0;

  return {
    level,
    xpTotal,
    xpInLevel,
    xpToNextLevel: Math.max(0, xpToNextLevel),
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
  };
}

/**
 * Récompense débloquée à chaque niveau (catalogue).
 * Référence : décisions Clavel 19/05/2026.
 */
export interface Reward {
  level: number;
  emoji: string;
  badge?: string; // slug d'un badge attribué automatiquement
  dotation?: string; // slug d'une dotation à débloquer
  points_vena?: number; // points VENA attribués
  description: string;
}

export const REWARDS_BY_LEVEL: Reward[] = [
  {
    level: 1,
    emoji: "🎮",
    badge: "rookie-eveil",
    description: "Badge Rookie de la saison",
  },
  {
    level: 3,
    emoji: "🎟️",
    dotation: "lot-partenaire-niv3",
    points_vena: 1,
    description: "Lot partenaire (code promo Game Cash / WarpZone / EVA) + 1 point VENA",
  },
  {
    level: 5,
    emoji: "👕",
    badge: "guerrier-eveil",
    dotation: "tshirt-vea",
    points_vena: 2,
    description: "T-shirt VEA + Badge Guerrier + 2 points VENA",
  },
  {
    level: 10,
    emoji: "👑",
    badge: "legende-eveil",
    dotation: "tenue-complete",
    points_vena: 5,
    description: "Tenue complète VEA + Badge Légende doré animé + 5 points VENA",
  },
];

/**
 * Retourne la prochaine récompense à débloquer à partir du niveau actuel.
 */
export function getNextReward(currentLevel: number): Reward | null {
  return REWARDS_BY_LEVEL.find((r) => r.level > currentLevel) ?? null;
}

/**
 * Retourne toutes les récompenses déjà débloquées.
 */
export function getUnlockedRewards(currentLevel: number): Reward[] {
  return REWARDS_BY_LEVEL.filter((r) => r.level <= currentLevel);
}
