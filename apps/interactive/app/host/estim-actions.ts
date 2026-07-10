/**
 * Server actions Estim' côté host.
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  ESTIM_QUESTIONS,
  ESTIM_ROUND_DURATION_SEC,
  ESTIM_REVEAL_DURATION_SEC,
  ESTIM_TOTAL_ROUNDS,
  estimDiffPercent,
  estimPointsForDiff,
  type EstimState,
} from "@/lib/games/estim";

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Probabilité de tomber sur une question JOKE ("INESTIMABLE") à chaque manche.
 * Décision Clavel 07/2026 : 2 % — assez rare pour rester une surprise qui
 * fait rire, assez présent pour exister. (L'ancien système mettait les jokes
 * dans le tirage uniforme → même proba que les vraies questions → "relou",
 * retour Moxy 06/2026.)
 */
const ESTIM_JOKE_CHANCE = 0.02;

/** Pioche une question non encore jouée (jokes servis à part, à 2 %). */
function pickQuestion(excluded: string[]): typeof ESTIM_QUESTIONS[number] {
  // 1. Tirage joke : 2 % de chance, et seulement si un joke non joué existe.
  const jokes = ESTIM_QUESTIONS.filter(
    (q) => q.joke && !excluded.includes(q.id),
  );
  if (jokes.length > 0 && Math.random() < ESTIM_JOKE_CHANCE) {
    return jokes[Math.floor(Math.random() * jokes.length)]!;
  }

  // 2. Tirage normal : les jokes sont EXCLUS du pool uniforme — ils ne
  //    peuvent apparaître QUE via le tirage à 2 % ci-dessus.
  const available = ESTIM_QUESTIONS.filter(
    (q) => !q.joke && !excluded.includes(q.id),
  );
  const pool =
    available.length > 0 ? available : ESTIM_QUESTIONS.filter((q) => !q.joke);
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export async function startEstimAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const q = pickQuestion([]);

  const newState: EstimState = {
    phase: "round",
    round: 1,
    totalRounds: ESTIM_TOTAL_ROUNDS,
    questionId: q.id,
    roundStartedAt: new Date().toISOString(),
    roundDurationSec: ESTIM_ROUND_DURATION_SEC,
    playedQuestionIds: [q.id],
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "playing",
      game_type: "estim",
      started_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);

  if (error) {
    console.error("[startEstimAction] error:", error.message);
    return { success: false, error: "Impossible de démarrer Estim'." };
  }
  return { success: true };
}

export async function revealEstimRoundAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  // Lit l'état
  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: EstimState } | null)?.current_state;
  if (!state || state.phase !== "round") {
    return { success: false, error: "Pas en phase round." };
  }

  const question = ESTIM_QUESTIONS.find((q) => q.id === state.questionId);
  if (!question) {
    return { success: false, error: "Question introuvable." };
  }

  // Récupère toutes les estimations du round
  const { data: answers, error: ansErr } = await supabase
    .schema("interactive" as never)
    .from("estim_answers")
    .select("id, player_id, guess")
    .eq("session_id", sessionId)
    .eq("round", state.round);

  if (ansErr) {
    return { success: false, error: "Erreur lecture estimations." };
  }

  const rows = (answers ?? []) as Array<{ id: string; player_id: string; guess: number }>;

  // Calcule diff + points pour chacun, trie par diff ASC pour le rang
  // ─── Mode JOKE (ex: "Combien vaut Clavel ?") ───
  // Pas de scoring diff : tout le monde gagne 50 pts fixes, pas de rang.
  if (question.joke) {
    for (const a of rows) {
      await supabase
        .schema("interactive" as never)
        .from("estim_answers")
        .update({
          diff_absolute: 0,
          diff_percent: 0,
          points: 50,
          rank: 1, // tout le monde 1er
        } as never)
        .eq("id", a.id);

      await supabase
        .schema("interactive" as never)
        .rpc("add_player_score", { p_player_id: a.player_id, p_points: 50 } as never);
    }

    const newState: EstimState = {
      ...state,
      phase: "reveal",
      revealStartedAt: new Date().toISOString(),
      revealDurationSec: ESTIM_REVEAL_DURATION_SEC,
    };
    await supabase
      .schema("interactive" as never)
      .from("sessions")
      .update({ current_state: newState } as never)
      .eq("id", sessionId);

    return { success: true };
  }

  // ─── Mode normal : scoring diff + bonus rang ───
  const enriched = rows.map((a) => {
    const diffPct = estimDiffPercent(Number(a.guess), question.priceEur);
    return {
      ...a,
      diffPercent: diffPct,
      diffAbsolute: Math.abs(Number(a.guess) - question.priceEur),
      basePoints: estimPointsForDiff(diffPct),
    };
  });
  enriched.sort((a, b) => a.diffPercent - b.diffPercent);

  // Bonus rang : +50 pts pour le 1er, +25 pour le 2e, +10 pour le 3e
  const RANK_BONUS = [50, 25, 10];

  for (let i = 0; i < enriched.length; i++) {
    const a = enriched[i]!;
    const rank = i + 1;
    const bonus = RANK_BONUS[i] ?? 0;
    const points = a.basePoints + bonus;

    await supabase
      .schema("interactive" as never)
      .from("estim_answers")
      .update({
        diff_absolute: a.diffAbsolute,
        diff_percent: a.diffPercent,
        points,
        rank,
      } as never)
      .eq("id", a.id);

    // Update cumulé du joueur (atomique)
    await supabase
      .schema("interactive" as never)
      .rpc("add_player_score", { p_player_id: a.player_id, p_points: points } as never);
  }

  // Passe en reveal
  const newState: EstimState = {
    ...state,
    phase: "reveal",
    revealStartedAt: new Date().toISOString(),
    revealDurationSec: ESTIM_REVEAL_DURATION_SEC,
  };
  await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  return { success: true };
}

export async function nextEstimRoundAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: EstimState } | null)?.current_state;
  if (!state) return { success: false, error: "État introuvable." };

  const nextRound = state.round + 1;
  if (nextRound > state.totalRounds) {
    return endEstimAction(sessionId);
  }

  const q = pickQuestion(state.playedQuestionIds ?? []);

  const newState: EstimState = {
    phase: "round",
    round: nextRound,
    totalRounds: state.totalRounds,
    questionId: q.id,
    roundStartedAt: new Date().toISOString(),
    roundDurationSec: ESTIM_ROUND_DURATION_SEC,
    playedQuestionIds: [...(state.playedQuestionIds ?? []), q.id],
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Erreur round suivant." };
  return { success: true };
}

export async function endEstimAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: EstimState } | null)?.current_state;
  const newState: EstimState = {
    phase: "final",
    round: state?.totalRounds ?? ESTIM_TOTAL_ROUNDS,
    totalRounds: state?.totalRounds ?? ESTIM_TOTAL_ROUNDS,
    questionId: state?.questionId ?? "",
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
