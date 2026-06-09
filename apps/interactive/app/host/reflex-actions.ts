"use server";

import { createClient } from "@/lib/supabase/server";
import {
  REFLEX_TOTAL_ROUNDS,
  REFLEX_REVEAL_DURATION_SEC,
  pickWaitMs,
  reflexPointsForRank,
  type ReflexState,
} from "@/lib/games/reflex";

interface ActionResult { success: boolean; error?: string; }

export async function startReflexAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const goAt = new Date(Date.now() + pickWaitMs()).toISOString();

  const newState: ReflexState = {
    phase: "wait",
    roundIndex: 0,
    totalRounds: REFLEX_TOTAL_ROUNDS,
    goAt,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "playing",
      game_type: "reflex",
      started_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);
  if (error) return { success: false, error: "Impossible de démarrer." };
  return { success: true };
}

export async function revealReflexAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();
  const state = (sessionRow as { current_state: ReflexState } | null)?.current_state;
  if (!state) return { success: false, error: "État introuvable." };

  const { data: answers } = await supabase
    .schema("interactive" as never)
    .from("reflex_answers")
    .select("id, player_id, reaction_ms, false_start")
    .eq("session_id", sessionId)
    .eq("round_index", state.roundIndex);

  const rows = (answers ?? []) as Array<{
    id: string; player_id: string; reaction_ms: number | null; false_start: boolean;
  }>;

  // Trie : false_start last, sinon par reaction_ms asc (plus rapide = meilleur)
  const sorted = [...rows].sort((a, b) => {
    if (a.false_start && !b.false_start) return 1;
    if (!a.false_start && b.false_start) return -1;
    const ar = a.reaction_ms ?? 99999;
    const br = b.reaction_ms ?? 99999;
    return ar - br;
  });

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    const rank = i + 1;
    const hasReaction = !a.false_start && a.reaction_ms !== null;
    const points = reflexPointsForRank(rank, hasReaction);

    await supabase
      .schema("interactive" as never)
      .from("reflex_answers")
      .update({ points, rank } as never)
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
        .update({ score: currentScore + points } as never)
        .eq("id", a.player_id);
    }
  }

  const newState: ReflexState = {
    ...state,
    phase: "reveal",
    revealStartedAt: new Date().toISOString(),
    revealDurationSec: REFLEX_REVEAL_DURATION_SEC,
  };
  await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  return { success: true };
}

export async function nextReflexRoundAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();
  const state = (sessionRow as { current_state: ReflexState } | null)?.current_state;
  if (!state) return { success: false, error: "État introuvable." };

  const nextIndex = state.roundIndex + 1;
  if (nextIndex >= state.totalRounds) {
    return endReflexAction(sessionId);
  }

  const goAt = new Date(Date.now() + pickWaitMs()).toISOString();
  const newState: ReflexState = {
    phase: "wait",
    roundIndex: nextIndex,
    totalRounds: state.totalRounds,
    goAt,
  };
  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);
  if (error) return { success: false, error: "Erreur round suivant." };
  return { success: true };
}

export async function endReflexAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();
  const state = (sessionRow as { current_state: ReflexState } | null)?.current_state;
  const newState: ReflexState = {
    phase: "final",
    roundIndex: state?.totalRounds ?? REFLEX_TOTAL_ROUNDS,
    totalRounds: state?.totalRounds ?? REFLEX_TOTAL_ROUNDS,
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
