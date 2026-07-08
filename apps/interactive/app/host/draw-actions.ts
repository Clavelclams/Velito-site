"use server";

import { createClient } from "@/lib/supabase/server";
import {
  DRAW_TIME_LIMIT_SEC,
  DRAW_REVEAL_DURATION_SEC,
  pickWordsForSession,
  isGuessCorrect,
  calculateGuesserScore,
  calculateDrawerScore,
  type DrawState,
} from "@/lib/games/draw";

interface ActionResult {
  success: boolean;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════
// Helper : pioche le prochain dessinateur dans la liste des joueurs
// ════════════════════════════════════════════════════════════════════

/**
 * Pioche un joueur qui n'a pas encore dessiné. Si tous ont dessiné, retourne
 * null → signifie qu'il faut terminer la partie.
 */
function pickNextDrawer(
  players: Array<{ id: string; pseudo: string }>,
  drawnBy: string[]
): { id: string; pseudo: string } | null {
  const available = players.filter((p) => !drawnBy.includes(p.id));
  if (available.length === 0) return null;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx]!;
}

// ════════════════════════════════════════════════════════════════════
// startDrawAction — lance la session + premier round
// ════════════════════════════════════════════════════════════════════

export async function startDrawAction(
  sessionId: string,
  numRoundsRequested?: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  // 1. Récupère les joueurs présents (besoin de pseudo + id)
  const { data: playersData } = await supabase
    .schema("interactive" as never)
    .from("session_players")
    .select("id, pseudo")
    .eq("session_id", sessionId);

  const players = (playersData ?? []) as Array<{ id: string; pseudo: string }>;
  if (players.length < 2) {
    return { success: false, error: "Il faut au moins 2 joueurs pour Dessin." };
  }

  // 2. Calcule le nombre de rounds : 1 par joueur, cap entre 3 et 12
  const numRounds = Math.max(
    3,
    Math.min(12, numRoundsRequested ?? players.length)
  );

  // 3. Tire les mots pour toute la partie
  const words = pickWordsForSession(numRounds);
  if (words.length === 0) {
    return { success: false, error: "Banque de mots vide." };
  }

  // 4. Pioche le premier dessinateur
  const firstDrawer = pickNextDrawer(players, []);
  if (!firstDrawer) {
    return { success: false, error: "Pas de joueur disponible." };
  }

  // 5. Crée la ligne draw_rounds pour le round 1
  const word1 = words[0]!;
  const { data: roundData, error: roundErr } = await supabase
    .schema("interactive" as never)
    .from("draw_rounds")
    .insert({
      session_id: sessionId,
      round_index: 0,
      drawer_player_id: firstDrawer.id,
      word: word1,
      total_guessers: players.length - 1, // tous les autres
    } as never)
    .select("id")
    .single();

  if (roundErr || !roundData) {
    return { success: false, error: "Impossible de créer le round." };
  }

  const roundId = (roundData as { id: string }).id;

  // 6. Initialise le state. On stocke aussi la liste complète des mots dans
  //    current_state.words pour ne pas re-piocher à chaque round (et garantir
  //    qu'un mot ne tombe pas 2 fois).
  const startedAt = new Date().toISOString();
  const newState: DrawState & { words: string[] } = {
    phase: "drawing",
    roundIndex: 0,
    totalRounds: numRounds,
    drawnBy: [firstDrawer.id],
    current: {
      roundId,
      drawerPlayerId: firstDrawer.id,
      drawerPseudo: firstDrawer.pseudo,
      word: word1,
      startedAt,
    },
    timeLimitSec: DRAW_TIME_LIMIT_SEC,
    words,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "playing",
      game_type: "draw",
      started_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Impossible de démarrer Dessin." };
  return { success: true };
}

// ════════════════════════════════════════════════════════════════════
// submitDrawGuessAction — un joueur tape une guess
// ════════════════════════════════════════════════════════════════════

export async function submitDrawGuessAction(
  sessionId: string,
  playerId: string,
  guess: string
): Promise<
  { success: true; correct: boolean; points: number }
  | { success: false; error: string }
> {
  const supabase = await createClient();

  // 1. Lit le state de la session pour avoir le round courant + le mot cible
  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: DrawState } | null)?.current_state;
  if (!state || state.phase !== "drawing" || !state.current) {
    return { success: false, error: "Aucun round en cours." };
  }

  // 2. Le dessinateur ne peut pas deviner son propre mot
  if (state.current.drawerPlayerId === playerId) {
    return { success: false, error: "Tu es le dessinateur." };
  }

  // 3. Check si le joueur a déjà trouvé pour ce round (UNIQUE index gère mais
  //    on prévient mieux côté UX)
  const { data: alreadyCorrect } = await supabase
    .schema("interactive" as never)
    .from("draw_guesses")
    .select("id")
    .eq("round_id", state.current.roundId)
    .eq("player_id", playerId)
    .eq("is_correct", true)
    .maybeSingle();

  if (alreadyCorrect) {
    return { success: false, error: "Tu as déjà trouvé !" };
  }

  // 4. Calcule is_correct via Levenshtein
  const correct = isGuessCorrect(guess, state.current.word);

  // 5. Calcule les points si correct
  let points = 0;
  if (correct) {
    const startedAt = new Date(state.current.startedAt).getTime();
    const elapsedMs = Date.now() - startedAt;
    points = calculateGuesserScore(elapsedMs, state.timeLimitSec);
  }

  // 6. INSERT dans draw_guesses
  const { error: insertErr } = await supabase
    .schema("interactive" as never)
    .from("draw_guesses")
    .insert({
      round_id: state.current.roundId,
      session_id: sessionId,
      player_id: playerId,
      guess: guess.trim().slice(0, 100),
      is_correct: correct,
      points,
    } as never);

  if (insertErr) {
    return { success: false, error: "Impossible d'envoyer ta réponse." };
  }

  // 7. Si correct → incrément ATOMIQUE du score (plusieurs devineurs peuvent
  //    trouver en même temps → un read-add-update perdrait des points).
  if (correct && points > 0) {
    await supabase
      .schema("interactive" as never)
      .rpc("add_player_score", { p_player_id: playerId, p_points: points } as never);
  }

  return { success: true, correct, points };
}

// ════════════════════════════════════════════════════════════════════
// revealDrawAction — fin du round, affichage du mot + classement
// ════════════════════════════════════════════════════════════════════

export async function revealDrawAction(sessionId: string): Promise<ActionResult> {
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

  const state = (sessionRow as { current_state: DrawState & { words: string[] } } | null)
    ?.current_state;
  if (!state || !state.current || state.phase !== "drawing") {
    return { success: false, error: "Pas en phase dessin." };
  }

  // Récupère les guesses correctes pour ce round, dans l'ordre d'arrivée
  const { data: correctGuesses } = await supabase
    .schema("interactive" as never)
    .from("draw_guesses")
    .select("player_id, points, answered_at")
    .eq("round_id", state.current.roundId)
    .eq("is_correct", true)
    .order("answered_at", { ascending: true });

  const rows = (correctGuesses ?? []) as Array<{
    player_id: string;
    points: number;
    answered_at: string;
  }>;

  // Map player_id → pseudo
  const { data: playersData } = await supabase
    .schema("interactive" as never)
    .from("session_players")
    .select("id, pseudo")
    .eq("session_id", sessionId);
  const pseudoMap = new Map<string, string>(
    ((playersData ?? []) as Array<{ id: string; pseudo: string }>).map((p) => [
      p.id,
      p.pseudo,
    ])
  );

  // Calcule le score du dessinateur (200 × nb trouveurs + bonus si tous)
  const startedAt = new Date(state.current.startedAt).getTime();
  const totalGuessers = (state.current as { totalGuessers?: number }).totalGuessers ?? -1;
  // totalGuessers vrai = nb players - 1 (dessinateur exclu). On le récupère du round si pas en state
  const { data: roundRow } = await supabase
    .schema("interactive" as never)
    .from("draw_rounds")
    .select("total_guessers")
    .eq("id", state.current.roundId)
    .single();
  const totalGuessersDb =
    (roundRow as { total_guessers: number } | null)?.total_guessers ?? rows.length;

  const drawerPoints = calculateDrawerScore(rows.length, totalGuessersDb);

  // Update score du dessinateur (atomique)
  if (drawerPoints > 0) {
    await supabase
      .schema("interactive" as never)
      .rpc("add_player_score", {
        p_player_id: state.current.drawerPlayerId,
        p_points: drawerPoints,
      } as never);
  }

  // Update la ligne draw_rounds (stats + ended_at)
  await supabase
    .schema("interactive" as never)
    .from("draw_rounds")
    .update({
      ended_at: new Date().toISOString(),
      guessers_count: rows.length,
    } as never)
    .eq("id", state.current.roundId);

  // Construit les stats du reveal
  const reveal = {
    word: state.current.word,
    drawerPlayerId: state.current.drawerPlayerId,
    drawerPseudo: state.current.drawerPseudo,
    drawerPoints,
    guessers: rows.map((r) => ({
      playerId: r.player_id,
      pseudo: pseudoMap.get(r.player_id) ?? "?",
      elapsedMs: new Date(r.answered_at).getTime() - startedAt,
      points: r.points,
    })),
    totalGuessers: totalGuessersDb,
  };

  const newState: DrawState & { words: string[] } = {
    ...state,
    phase: "reveal",
    current: state.current,
    lastReveal: reveal,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Erreur reveal." };
  return { success: true };
}

// ════════════════════════════════════════════════════════════════════
// nextDrawRoundAction — passe au round suivant OU termine la partie
// ════════════════════════════════════════════════════════════════════

export async function nextDrawRoundAction(sessionId: string): Promise<ActionResult> {
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

  const state = (sessionRow as { current_state: DrawState & { words: string[] } } | null)
    ?.current_state;
  if (!state) return { success: false, error: "État introuvable." };

  const nextIndex = state.roundIndex + 1;
  if (nextIndex >= state.totalRounds) {
    return endDrawAction(sessionId);
  }

  // Récupère la liste des joueurs pour piocher le suivant
  const { data: playersData } = await supabase
    .schema("interactive" as never)
    .from("session_players")
    .select("id, pseudo")
    .eq("session_id", sessionId);
  const players = (playersData ?? []) as Array<{ id: string; pseudo: string }>;

  const nextDrawer = pickNextDrawer(players, state.drawnBy);
  if (!nextDrawer) {
    // Tous les joueurs ont dessiné → fin
    return endDrawAction(sessionId);
  }

  const word = state.words[nextIndex] ?? state.words[0] ?? "chat";

  // Crée la nouvelle ligne draw_rounds
  const { data: roundData, error: roundErr } = await supabase
    .schema("interactive" as never)
    .from("draw_rounds")
    .insert({
      session_id: sessionId,
      round_index: nextIndex,
      drawer_player_id: nextDrawer.id,
      word,
      total_guessers: players.length - 1,
    } as never)
    .select("id")
    .single();

  if (roundErr || !roundData) {
    return { success: false, error: "Impossible de créer le round suivant." };
  }
  const roundId = (roundData as { id: string }).id;

  const startedAt = new Date().toISOString();
  const newState: DrawState & { words: string[] } = {
    ...state,
    phase: "drawing",
    roundIndex: nextIndex,
    drawnBy: [...state.drawnBy, nextDrawer.id],
    current: {
      roundId,
      drawerPlayerId: nextDrawer.id,
      drawerPseudo: nextDrawer.pseudo,
      word,
      startedAt,
    },
    lastReveal: state.lastReveal,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Erreur round suivant." };
  return { success: true };
}

// ════════════════════════════════════════════════════════════════════
// endDrawAction — fin de partie
// ════════════════════════════════════════════════════════════════════

export async function endDrawAction(sessionId: string): Promise<ActionResult> {
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

  const state = (sessionRow as { current_state: DrawState & { words: string[] } } | null)
    ?.current_state;
  const newState: DrawState = {
    phase: "final",
    roundIndex: state?.totalRounds ?? 0,
    totalRounds: state?.totalRounds ?? 0,
    drawnBy: state?.drawnBy ?? [],
    timeLimitSec: DRAW_TIME_LIMIT_SEC,
    lastReveal: state?.lastReveal,
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

  if (error) return { success: false, error: "Erreur fin de partie." };
  return { success: true };
}
