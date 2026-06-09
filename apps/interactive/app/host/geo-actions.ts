"use server";

import { createClient } from "@/lib/supabase/server";
import {
  GEO_TARGETS,
  GEO_ROUND_DURATION_SEC,
  GEO_REVEAL_DURATION_SEC,
  GEO_TOTAL_ROUNDS,
  haversineKm,
  geoPointsForDistance,
  type GeoState,
} from "@/lib/games/geo";

interface ActionResult {
  success: boolean;
  error?: string;
}

function pickTarget(excluded: string[]) {
  const available = GEO_TARGETS.filter((t) => !excluded.includes(t.id));
  const pool = available.length > 0 ? available : GEO_TARGETS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export async function startGeoAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const t = pickTarget([]);
  const newState: GeoState = {
    phase: "round",
    round: 1,
    totalRounds: GEO_TOTAL_ROUNDS,
    targetId: t.id,
    roundStartedAt: new Date().toISOString(),
    roundDurationSec: GEO_ROUND_DURATION_SEC,
    playedTargetIds: [t.id],
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "playing",
      game_type: "geo",
      started_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Impossible de démarrer Géo." };
  return { success: true };
}

export async function revealGeoRoundAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: GeoState } | null)?.current_state;
  if (!state || state.phase !== "round") {
    return { success: false, error: "Pas en phase round." };
  }

  const target = GEO_TARGETS.find((t) => t.id === state.targetId);
  if (!target) return { success: false, error: "Cible introuvable." };

  const { data: answers, error: ansErr } = await supabase
    .schema("interactive" as never)
    .from("geo_answers")
    .select("id, player_id, guess_lat, guess_lng")
    .eq("session_id", sessionId)
    .eq("round", state.round);

  if (ansErr) return { success: false, error: "Erreur lecture pins." };

  const rows = (answers ?? []) as Array<{
    id: string; player_id: string; guess_lat: number; guess_lng: number;
  }>;

  const enriched = rows.map((a) => {
    const dist = haversineKm(
      Number(a.guess_lat), Number(a.guess_lng),
      target.lat, target.lng
    );
    return {
      ...a,
      distance: dist,
      basePoints: geoPointsForDistance(dist),
    };
  });
  // Tri croissant : plus petite distance = meilleur rang
  enriched.sort((a, b) => a.distance - b.distance);

  // Bonus rang : top 3 récompensés
  const RANK_BONUS = [50, 25, 10];

  for (let i = 0; i < enriched.length; i++) {
    const a = enriched[i]!;
    const rank = i + 1;
    const bonus = RANK_BONUS[i] ?? 0;
    const points = a.basePoints + bonus;

    await supabase
      .schema("interactive" as never)
      .from("geo_answers")
      .update({
        distance_km: a.distance,
        points,
        rank,
      } as never)
      .eq("id", a.id);

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

  const newState: GeoState = {
    ...state,
    phase: "reveal",
    revealStartedAt: new Date().toISOString(),
    revealDurationSec: GEO_REVEAL_DURATION_SEC,
  };
  await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  return { success: true };
}

export async function nextGeoRoundAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: GeoState } | null)?.current_state;
  if (!state) return { success: false, error: "État introuvable." };

  const nextRound = state.round + 1;
  if (nextRound > state.totalRounds) {
    return endGeoAction(sessionId);
  }

  const t = pickTarget(state.playedTargetIds ?? []);
  const newState: GeoState = {
    phase: "round",
    round: nextRound,
    totalRounds: state.totalRounds,
    targetId: t.id,
    roundStartedAt: new Date().toISOString(),
    roundDurationSec: GEO_ROUND_DURATION_SEC,
    playedTargetIds: [...(state.playedTargetIds ?? []), t.id],
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Erreur round suivant." };
  return { success: true };
}

export async function endGeoAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: GeoState } | null)?.current_state;
  const newState: GeoState = {
    phase: "final",
    round: state?.totalRounds ?? GEO_TOTAL_ROUNDS,
    totalRounds: state?.totalRounds ?? GEO_TOTAL_ROUNDS,
    targetId: state?.targetId ?? "",
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
