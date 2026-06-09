/**
 * Server actions du jeu Petit Bac côté host.
 *
 * Flow d'une partie :
 *   1. startPetitBacAction → status='playing', game_type='petit_bac',
 *      phase='round', round=1, letter=random
 *   2. Joueurs UPSERT leurs mots dans petit_bac_answers (1 ligne / catégorie)
 *   3. Timer 45s → auto-reveal OU host clique "Révéler"
 *   4. revealRoundAction → calcule is_valid + points pour chaque réponse
 *   5. Reveal 8s → auto-next OU host clique "Round suivant"
 *   6. nextRoundAction → round++ + new letter, ou endGame si round == totalRounds
 *
 * Le scoring (V1) :
 *   - 1 pt par mot non-vide qui commence par la bonne lettre (normalisé sans accent)
 *   - V2 : 2 pts si unique parmi tous les joueurs (déduplication)
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  PETIT_BAC_DEFAULT_CATEGORIES,
  ROUND_DURATION_SEC,
  PETITBAC_REVEAL_DURATION_SEC,
  TOTAL_ROUNDS,
  pickRandomLetter,
  wordStartsWithLetter,
  type PetitBacState,
} from "@/lib/games/petit-bac";
import { wordInDictionary } from "@/lib/games/petit-bac-dictionary";

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Lance le Petit Bac : démarre round 1 avec une lettre tirée au sort.
 */
export async function startPetitBacAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const letter = pickRandomLetter();

  const newState: PetitBacState = {
    phase: "round",
    round: 1,
    totalRounds: TOTAL_ROUNDS,
    letter,
    categories: PETIT_BAC_DEFAULT_CATEGORIES,
    roundStartedAt: new Date().toISOString(),
    roundDurationSec: ROUND_DURATION_SEC,
    playedLetters: [letter],
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "playing",
      game_type: "petit_bac",
      started_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);

  if (error) {
    console.error("[startPetitBacAction] update error:", error.message);
    return { success: false, error: "Impossible de démarrer le Petit Bac." };
  }
  return { success: true };
}

/**
 * Révèle le round : calcule scores + passe en phase='reveal'.
 */
export async function revealPetitBacRoundAction(
  sessionId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  // 1. Lit la session pour récupérer state
  const { data: sessionRow, error: sessionErr } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !sessionRow) {
    return { success: false, error: "Session introuvable." };
  }

  const state = (sessionRow as { current_state: PetitBacState }).current_state;
  if (!state || state.phase !== "round") {
    return { success: false, error: "Pas en phase round." };
  }

  // 2. Récupère toutes les réponses du round courant, triées par created_at
  //    (= ordre du 1er clic du joueur dans cette catégorie). Le tri ASC permet
  //    de calculer le rang vitesse par catégorie.
  const { data: answers, error: ansErr } = await supabase
    .schema("interactive" as never)
    .from("petit_bac_answers")
    .select("id, player_id, category, word, created_at")
    .eq("session_id", sessionId)
    .eq("round", state.round)
    .order("created_at", { ascending: true });

  if (ansErr) {
    console.error("[revealPetitBacRoundAction] fetch error:", ansErr.message);
    return { success: false, error: "Erreur lecture réponses." };
  }

  const rows = (answers ?? []) as Array<{
    id: string;
    player_id: string;
    category: string;
    word: string;
    created_at: string;
  }>;

  // 3. Pré-calcul validité par ligne + regroupement par catégorie
  //    pour permettre le scoring vitesse par catégorie.
  const validityByRow = new Map<string, boolean>();
  const validsByCategory = new Map<string, typeof rows>();
  for (const a of rows) {
    const isValid = wordStartsWithLetter(a.word, state.letter) && wordInDictionary(a.word, a.category);
    validityByRow.set(a.id, isValid);
    if (isValid) {
      const list = validsByCategory.get(a.category) ?? [];
      list.push(a);
      validsByCategory.set(a.category, list);
    }
  }

  /**
   * Calcule les points d'un mot valide selon son rang vitesse par catégorie.
   *
   * - Seul à avoir trouvé → 2 pts (bonus solo)
   * - 1er parmi N (N≥2) → 2 pts
   * - Dernier parmi N (N≥2) → 0 pt (malus copieur)
   * - Au milieu → 1 pt
   */
  function pointsForRank(rank: number, total: number): number {
    if (total === 1) return 2; // solo = bonus
    if (rank === 1) return 2;
    if (rank === total) return 0;
    return 1;
  }

  // 4. Update chaque ligne avec is_valid + points calculés
  for (const a of rows) {
    const isValid = validityByRow.get(a.id) ?? false;
    let points = 0;
    if (isValid) {
      const validList = validsByCategory.get(a.category) ?? [];
      const rank = validList.findIndex((v) => v.id === a.id) + 1; // 1-indexed
      points = pointsForRank(rank, validList.length);
    }

    await supabase
      .schema("interactive" as never)
      .from("petit_bac_answers")
      .update({ is_valid: isValid, points } as never)
      .eq("id", a.id);

    if (points > 0) {
      const { data: pData } = await supabase
        .schema("interactive" as never)
        .from("session_players")
        .select("score")
        .eq("id", a.player_id)
        .single();
      const currentScore = (pData as { score: number } | null)?.score ?? 0;
      await supabase
        .schema("interactive" as never)
        .from("session_players")
        .update({ score: currentScore + points } as never)
        .eq("id", a.player_id);
    }
  }

  // 4. Passe en phase reveal
  const newState: PetitBacState = {
    ...state,
    phase: "reveal",
    revealStartedAt: new Date().toISOString(),
    revealDurationSec: PETITBAC_REVEAL_DURATION_SEC,
  };

  const { error: updErr } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (updErr) {
    console.error("[revealPetitBacRoundAction] state update error:", updErr.message);
    return { success: false, error: "Erreur mise à jour état." };
  }
  return { success: true };
}

/**
 * Passe au round suivant. Si déjà au dernier round → endGame.
 */
export async function nextPetitBacRoundAction(
  sessionId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow, error: sessionErr } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !sessionRow) {
    return { success: false, error: "Session introuvable." };
  }

  const state = (sessionRow as { current_state: PetitBacState }).current_state;
  const nextRound = (state?.round ?? 0) + 1;

  if (nextRound > (state.totalRounds ?? TOTAL_ROUNDS)) {
    return endPetitBacAction(sessionId);
  }

  const newLetter = pickRandomLetter(state.playedLetters ?? []);

  const newState: PetitBacState = {
    phase: "round",
    round: nextRound,
    totalRounds: state.totalRounds,
    letter: newLetter,
    categories: state.categories,
    roundStartedAt: new Date().toISOString(),
    roundDurationSec: ROUND_DURATION_SEC,
    playedLetters: [...(state.playedLetters ?? []), newLetter],
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (error) {
    console.error("[nextPetitBacRoundAction] update error:", error.message);
    return { success: false, error: "Erreur round suivant." };
  }
  return { success: true };
}

/**
 * Termine la partie Petit Bac.
 */
export async function endPetitBacAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: PetitBacState } | null)?.current_state;
  const newState: PetitBacState = {
    phase: "final",
    round: state?.totalRounds ?? TOTAL_ROUNDS,
    totalRounds: state?.totalRounds ?? TOTAL_ROUNDS,
    letter: state?.letter ?? "",
    categories: state?.categories ?? PETIT_BAC_DEFAULT_CATEGORIES,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);

  if (error) {
    console.error("[endPetitBacAction] update error:", error.message);
    return { success: false, error: "Erreur fin de partie." };
  }
  return { success: true };
}
