"use server";

import { createClient } from "@/lib/supabase/server";
import {
  BLIND_TRACKS,
  BLINDTEST_QUESTION_TIME_LIMIT_SEC,
  BLINDTEST_REVEAL_DURATION_SEC,
  BLINDTEST_TOTAL_ROUNDS,
  fetchITunesTrack,
  shuffle,
  calculateBlindTestScore,
  type BlindTestRound,
  type BlindTestState,
} from "@/lib/games/blindtest";

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Tente de pré-charger N morceaux en piochant aléatoirement dans la banque.
 * Skip ceux qui n'ont pas de previewUrl iTunes. Retry sur d'autres jusqu'à
 * avoir N tracks.
 */
/**
 * Pioche 3 leurres en favorisant des artistes DIFFÉRENTS du morceau cible.
 * Bug précédent : on prenait les 3 decoys hardcodés qui étaient souvent du même
 * artiste → frustrant. Maintenant on pioche dans la banque entière et on
 * privilégie la diversité.
 */
function pickDiverseDecoys(
  correctArtist: string,
  count: number = 3
): string[] {
  const normalizeArtist = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split("—")[0]?.trim() ?? "";
  const correctNorm = normalizeArtist(correctArtist);

  // Pool de TOUS les correctLabels de la banque (pour les utiliser comme leurres)
  const allOtherLabels = BLIND_TRACKS
    .map((t) => t.correctLabel)
    .filter((label) => normalizeArtist(label) !== correctNorm);

  const shuffled = shuffle(allOtherLabels);
  const used: string[] = [];
  const usedArtists = new Set<string>([correctNorm]);

  for (const label of shuffled) {
    if (used.length >= count) break;
    const artist = normalizeArtist(label);
    // Privilégie un artiste pas encore utilisé
    if (!usedArtists.has(artist)) {
      used.push(label);
      usedArtists.add(artist);
    }
  }

  // Si on n'a pas atteint count (banque trop petite ou pleine de mêmes artistes),
  // on complète avec les premiers leurres restants
  if (used.length < count) {
    for (const label of shuffled) {
      if (used.length >= count) break;
      if (!used.includes(label)) used.push(label);
    }
  }

  return used.slice(0, count);
}

async function prefetchRounds(count: number): Promise<BlindTestRound[]> {
  const pool = shuffle(BLIND_TRACKS);
  const rounds: BlindTestRound[] = [];

  for (const track of pool) {
    if (rounds.length >= count) break;

    const enriched = await fetchITunesTrack(track.query);
    if (!enriched) {
      console.warn(`[blindtest] no preview for ${track.query}, skipping`);
      continue;
    }

    // Utilise le VRAI titre iTunes pour la bonne réponse (pour matcher l'audio)
    const correctLabel = `${enriched.realTrackName} — ${enriched.realArtistName}`;

    // Pioche 3 leurres diversifiés d'artistes différents
    const decoys = pickDiverseDecoys(enriched.realArtistName, 3);

    // Mélange les 4 labels
    const allLabels = [correctLabel, ...decoys];
    const shuffled = shuffle(allLabels);
    const correctIndex = shuffled.indexOf(correctLabel);

    rounds.push({
      track: {
        id: track.id,
        query: track.query,
        correctLabel,
        decoys: [decoys[0] ?? "?", decoys[1] ?? "?", decoys[2] ?? "?"],
        theme: track.theme,
        previewUrl: enriched.previewUrl,
        artworkUrl: enriched.artworkUrl,
      },
      options: [shuffled[0]!, shuffled[1]!, shuffled[2]!, shuffled[3]!],
      correctIndex,
    });
  }

  return rounds;
}

export async function startBlindTestAction(
  sessionId: string,
  numRounds: number = BLINDTEST_TOTAL_ROUNDS
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  // Sanity check : 5 à 30 rounds (limites raisonnables)
  const safeRounds = Math.max(5, Math.min(30, Math.floor(numRounds)));

  // Pré-fetch les morceaux maintenant pour éviter de spammer iTunes
  const rounds = await prefetchRounds(safeRounds);
  if (rounds.length < 3) {
    return { success: false, error: "Trop peu de morceaux dispos sur iTunes." };
  }

  const newState: BlindTestState = {
    phase: "question",
    roundIndex: 0,
    totalRounds: rounds.length,
    rounds,
    questionStartedAt: new Date().toISOString(),
    timeLimitSec: BLINDTEST_QUESTION_TIME_LIMIT_SEC,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "playing",
      game_type: "blind_test",
      started_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Impossible de démarrer Blind Test." };
  return { success: true };
}

export async function revealBlindTestAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: BlindTestState } | null)?.current_state;
  if (!state || state.phase !== "question") {
    return { success: false, error: "Pas en phase question." };
  }

  const round = state.rounds[state.roundIndex];
  if (!round) return { success: false, error: "Round introuvable." };
  const correctAnswerLetter = "ABCD"[round.correctIndex];

  const questionStartedAt = state.questionStartedAt
    ? new Date(state.questionStartedAt).getTime()
    : Date.now();

  const { data: answers } = await supabase
    .schema("interactive" as never)
    .from("blindtest_answers")
    .select("id, player_id, answer, answered_at")
    .eq("session_id", sessionId)
    .eq("round_index", state.roundIndex)
    .order("answered_at", { ascending: true });

  const rows = (answers ?? []) as Array<{
    id: string; player_id: string; answer: string; answered_at: string;
  }>;

  const correctAnswers = rows.filter((a) => a.answer === correctAnswerLetter);
  const totalCorrect = correctAnswers.length;

  for (const a of rows) {
    const isCorrect = a.answer === correctAnswerLetter;
    const elapsedMs = new Date(a.answered_at).getTime() - questionStartedAt;

    let points = 0;
    if (isCorrect) {
      const rank = correctAnswers.findIndex((c) => c.id === a.id) + 1;
      points = calculateBlindTestScore(true, elapsedMs, rank, totalCorrect, state.timeLimitSec);
    }

    await supabase
      .schema("interactive" as never)
      .from("blindtest_answers")
      .update({ is_correct: isCorrect, points } as never)
      .eq("id", a.id);

    if (points !== 0) {
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
        .update({ score: Math.max(0, currentScore + points) } as never)
        .eq("id", a.player_id);
    }
  }

  const newState: BlindTestState = {
    ...state,
    phase: "reveal",
    revealStartedAt: new Date().toISOString(),
    revealDurationSec: BLINDTEST_REVEAL_DURATION_SEC,
  };
  await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  return { success: true };
}

export async function nextBlindTestRoundAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: BlindTestState } | null)?.current_state;
  if (!state) return { success: false, error: "État introuvable." };

  const nextIndex = state.roundIndex + 1;
  if (nextIndex >= state.totalRounds) {
    return endBlindTestAction(sessionId);
  }

  const newState: BlindTestState = {
    ...state,
    phase: "question",
    roundIndex: nextIndex,
    questionStartedAt: new Date().toISOString(),
    timeLimitSec: BLINDTEST_QUESTION_TIME_LIMIT_SEC,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Erreur round suivant." };
  return { success: true };
}

export async function endBlindTestAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: BlindTestState } | null)?.current_state;
  const newState: BlindTestState = {
    phase: "final",
    roundIndex: state?.totalRounds ?? 0,
    totalRounds: state?.totalRounds ?? 0,
    rounds: state?.rounds ?? [],
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
