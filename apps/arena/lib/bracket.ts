/**
 * ARENA — Algorithme de bracket "élimination simple"
 * ---------------------------------------------------
 * Zéro dépendance externe. Tout est du TypeScript pur, testable avec Vitest.
 *
 * CONCEPTS CLÉS (à savoir expliquer en jury CDA) :
 *
 * 1. Un tournoi à N joueurs se joue dans un arbre binaire.
 *    On arrondit N à la puissance de 2 supérieure ("taille" du bracket).
 *    Ex : 5 joueurs → taille 8 → 3 rounds (8 → 4 → 2 → champion).
 *    Nombre de rounds = log2(taille).
 *
 * 2. Les places vides (taille - N) s'appellent des "byes" :
 *    un joueur seul dans son match du round 1 passe automatiquement au round 2.
 *
 * 3. On n'a PAS besoin d'une table séparée "BracketNode" (comme dans la spec
 *    de mars) : un match est repéré par (round, position), et son match parent
 *    est TOUJOURS (round + 1, floor(position / 2)). C'est une propriété
 *    mathématique de l'arbre binaire → une table en moins, zéro bug de sync.
 *
 * CORRECTIONS par rapport à la spec de mars 2026 :
 * - Bug du double-bye corrigé : l'ancien algo pouvait créer un match (null, null)
 *   avec 5 joueurs, ce qui laissait un trou définitif dans le bracket.
 *   Ici, chaque paire du round 1 contient AU PLUS un bye (garanti car
 *   nbByes < taille/2, puisque N > taille/2 par définition de la taille).
 * - Mélange Fisher-Yates : `sort(() => Math.random() - 0.5)` est biaisé
 *   (certaines permutations sortent plus souvent que d'autres).
 * - Égalité interdite : en élimination simple, un score nul n'a pas de sens.
 *   La fonction de progression REFUSE un score égal au lieu d'envoyer
 *   silencieusement le mauvais joueur au tour suivant.
 */

// ---------- Types ----------

export type StatutMatch = "A_JOUER" | "TERMINE" | "VALIDE" | "LITIGIEUX";

/** Un match tel qu'on le crée en base au démarrage du tournoi. */
export interface MatchInput {
  round: number; // 1 = premier tour, max = finale
  position: number; // position dans le round, de 0 (haut) à n-1 (bas)
  joueur1Id: string | null;
  joueur2Id: string | null;
  isBye: boolean; // true = un seul joueur, qualification automatique
  gagnantId: string | null; // pré-rempli uniquement pour les byes
}

/** Le sous-ensemble d'un match nécessaire pour faire avancer un gagnant. */
export interface MatchScore {
  round: number;
  position: number;
  joueur1Id: string | null;
  joueur2Id: string | null;
  scoreJ1: number;
  scoreJ2: number;
}

// ---------- Utilitaires ----------

/**
 * Mélange Fisher-Yates : chaque permutation a exactement la même probabilité.
 * `rng` est injectable pour rendre les tests déterministes
 * (en prod on ne passe rien → Math.random).
 */
export function melangerJoueurs<T>(
  joueurs: readonly T[],
  rng: () => number = Math.random
): T[] {
  const copie = [...joueurs];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    // Swap avec variable temporaire.
    // Le `!` (non-null assertion) est nécessaire car le monorepo active
    // `noUncheckedIndexedAccess` : TypeScript type copie[i] en `T | undefined`
    // même quand l'index est garanti dans les bornes (ici 0 ≤ j ≤ i < length).
    const tmp = copie[i]!;
    copie[i] = copie[j]!;
    copie[j] = tmp;
  }
  return copie;
}

/** Puissance de 2 supérieure ou égale à n (taille du bracket). */
export function tailleBracket(nbJoueurs: number): number {
  return Math.pow(2, Math.ceil(Math.log2(nbJoueurs)));
}

/** Coordonnées du match parent — propriété de l'arbre binaire, pas de FK nécessaire. */
export function parentDe(round: number, position: number): {
  round: number;
  position: number;
} {
  return { round: round + 1, position: Math.floor(position / 2) };
}

/**
 * Dans le match parent, un enfant de position PAIRE alimente le slot joueur1,
 * un enfant de position IMPAIRE alimente le slot joueur2.
 */
export function slotDansParent(position: number): "joueur1" | "joueur2" {
  return position % 2 === 0 ? "joueur1" : "joueur2";
}

// ---------- Génération du bracket ----------

/**
 * Génère TOUS les matchs d'un bracket élimination simple.
 *
 * Étapes :
 * 1. Mélange équitable des joueurs (Fisher-Yates).
 * 2. Construction des paires du round 1 : les `nbByes` premières paires
 *    reçoivent 1 joueur + 1 bye, les suivantes reçoivent 2 joueurs.
 *    → il ne peut JAMAIS y avoir une paire (null, null).
 * 3. Création des rounds suivants, vides.
 * 4. Propagation immédiate des gagnants de byes vers le round 2.
 *
 * @throws si moins de 2 joueurs (un tournoi à 1 joueur n'existe pas).
 */
export function genererBracketEliminationSimple(
  joueurIds: readonly string[],
  rng: () => number = Math.random
): MatchInput[] {
  const n = joueurIds.length;
  if (n < 2) {
    throw new Error("Il faut au moins 2 joueurs pour générer un bracket.");
  }

  const taille = tailleBracket(n);
  const nbByes = taille - n;
  const nbRounds = Math.log2(taille);
  const melanges = melangerJoueurs(joueurIds, rng);

  const matchs: MatchInput[] = [];

  // --- Round 1 : distribution anti double-bye ---
  // Les nbByes premières paires prennent 1 joueur chacune,
  // les paires restantes prennent 2 joueurs chacune.
  let curseur = 0; // index dans la liste mélangée
  const nbPairesRound1 = taille / 2;
  for (let pos = 0; pos < nbPairesRound1; pos++) {
    const estBye = pos < nbByes;
    const joueur1 = melanges[curseur++] ?? null;
    const joueur2 = estBye ? null : melanges[curseur++] ?? null;
    matchs.push({
      round: 1,
      position: pos,
      joueur1Id: joueur1,
      joueur2Id: joueur2,
      isBye: estBye,
      // Un bye a déjà son gagnant : le joueur seul.
      gagnantId: estBye ? joueur1 : null,
    });
  }

  // --- Rounds 2 → finale : matchs vides pour l'instant ---
  let positionsDuRound = nbPairesRound1 / 2;
  for (let round = 2; round <= nbRounds; round++) {
    for (let pos = 0; pos < positionsDuRound; pos++) {
      matchs.push({
        round,
        position: pos,
        joueur1Id: null,
        joueur2Id: null,
        isBye: false,
        gagnantId: null,
      });
    }
    positionsDuRound = positionsDuRound / 2;
  }

  // --- Propagation immédiate des byes vers le round 2 ---
  for (const m of matchs) {
    if (m.round === 1 && m.isBye && m.gagnantId) {
      const parent = parentDe(m.round, m.position);
      const cible = matchs.find(
        (x) => x.round === parent.round && x.position === parent.position
      );
      if (cible) {
        if (slotDansParent(m.position) === "joueur1") {
          cible.joueur1Id = m.gagnantId;
        } else {
          cible.joueur2Id = m.gagnantId;
        }
      }
    }
  }

  return matchs;
}

// ---------- Progression après un match validé ----------

export interface Progression {
  gagnantId: string;
  /** null si le match validé était la finale (pas de parent). */
  parent: { round: number; position: number; slot: "joueur1" | "joueur2" } | null;
}

/**
 * Détermine le gagnant d'un match validé et où le placer au round suivant.
 *
 * RÈGLES MÉTIER :
 * - Score égal → erreur. En élimination simple il FAUT un vainqueur
 *   (départage à faire sur place : match supplémentaire, mort subite…).
 * - Le match doit avoir ses deux joueurs (on ne valide pas un match incomplet).
 *
 * @param nbRounds nombre total de rounds du tournoi (log2 de la taille)
 */
export function progresserGagnant(
  match: MatchScore,
  nbRounds: number
): Progression {
  if (match.joueur1Id == null || match.joueur2Id == null) {
    throw new Error("Match incomplet : les deux joueurs doivent être connus.");
  }
  if (match.scoreJ1 === match.scoreJ2) {
    throw new Error(
      "Égalité interdite en élimination simple : départagez les joueurs avant validation."
    );
  }

  const gagnantId =
    match.scoreJ1 > match.scoreJ2 ? match.joueur1Id : match.joueur2Id;

  // La finale n'a pas de parent : le gagnant est le champion.
  if (match.round >= nbRounds) {
    return { gagnantId, parent: null };
  }

  const { round, position } = parentDe(match.round, match.position);
  return {
    gagnantId,
    parent: { round, position, slot: slotDansParent(match.position) },
  };
}
