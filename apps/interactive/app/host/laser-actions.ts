/**
 * Server actions du jeu LASER côté host (animateur).
 *
 * Flow d'une partie :
 *  1. startLaserAction  → status='playing', game_type='laser', phase='aim',
 *     round 0, zone entière. Reset des éliminations, purge des vieux coups.
 *  2. Les joueurs placent avatar + laser (client, table laser_moves, RLS 'aim').
 *  3. revealLaserRoundAction → LE HOST résout la manche côté serveur avec
 *     resoudreManche() (logique pure testée). Écrit eliminated_round pour les
 *     éliminés + lastResolution (pour l'animation TV) + points de survie.
 *  4. nextLaserRoundAction → si ≥ 2 survivants : nouvelle manche (zone rétrécie).
 *     Sinon : endLaserAction (final).
 *
 * Pourquoi le serveur résout (jamais le client) :
 *  - Les coups sont SECRETS avant le reveal (RLS host-only). Seul le host peut
 *    les lire → un joueur ne peut ni voir ni falsifier qui touche qui.
 *  - resoudreManche est robuste aux entrées invalides : une position hors de
 *    l'arène [0,1] est traitée comme « hors zone » → élimination (pas de crash).
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import {
  resoudreManche,
  zonePourManche,
  AIM_DURATION_SEC,
  REVEAL_DURATION_SEC,
  LASER_MIN_PLAYERS,
  type JoueurManche,
  type LaserState,
} from "@/lib/games/laser";

interface ActionResult {
  success: boolean;
  error?: string;
}

/** Points attribués à chaque survivant d'une manche (classement = survie). */
const POINTS_PAR_MANCHE_SURVECUE = 10;

/** Lit les joueurs encore en vie (eliminated_round IS NULL) d'une session. */
async function joueursEnVie(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<{ id: string }[]> {
  const { data } = await supabase
    .schema("interactive" as never)
    .from("session_players")
    .select("id, eliminated_round")
    .eq("session_id", sessionId);

  const rows = (data ?? []) as Array<{ id: string; eliminated_round: number | null }>;
  return rows.filter((r) => r.eliminated_round === null).map((r) => ({ id: r.id }));
}

export async function startLaserAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  // Compte les joueurs de la session (min requis pour un battle royale).
  const { data: playersData } = await supabase
    .schema("interactive" as never)
    .from("session_players")
    .select("id")
    .eq("session_id", sessionId);
  const nb = (playersData ?? []).length;
  if (nb < LASER_MIN_PLAYERS) {
    return { success: false, error: `Il faut au moins ${LASER_MIN_PLAYERS} joueurs pour LASER.` };
  }

  // Nouvelle partie : tout le monde revit, on purge les coups d'une éventuelle
  // partie précédente dans cette session.
  await supabase
    .schema("interactive" as never)
    .from("session_players")
    .update({ eliminated_round: null } as never)
    .eq("session_id", sessionId);
  await supabase
    .schema("interactive" as never)
    .from("laser_moves")
    .delete()
    .eq("session_id", sessionId);

  const newState: LaserState = {
    phase: "aim",
    round: 0,
    zone: zonePourManche(0),
    aimStartedAt: new Date().toISOString(),
    aimDurationSec: AIM_DURATION_SEC,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "playing",
      game_type: "laser",
      started_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Impossible de démarrer LASER." };
  return { success: true };
}

export async function revealLaserRoundAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: LaserState } | null)?.current_state;
  if (!state || state.phase !== "aim") {
    return { success: false, error: "Pas en phase de visée." };
  }

  // Joueurs en vie + leurs coups de la manche.
  const vivants = await joueursEnVie(supabase, sessionId);
  const { data: movesData } = await supabase
    .schema("interactive" as never)
    .from("laser_moves")
    .select("player_id, pos_x, pos_y, angle")
    .eq("session_id", sessionId)
    .eq("round", state.round);

  const moves = (movesData ?? []) as Array<{
    player_id: string; pos_x: number; pos_y: number; angle: number;
  }>;
  const parId = new Map(moves.map((m) => [m.player_id, m]));

  // Construit l'entrée de la logique pure : un joueur "a joué" s'il a un coup.
  const joueurs: JoueurManche[] = vivants.map((v) => {
    const m = parId.get(v.id);
    return m
      ? { id: v.id, pos: { x: Number(m.pos_x), y: Number(m.pos_y) }, angle: Number(m.angle), aJoue: true }
      : { id: v.id, aJoue: false };
  });

  const res = resoudreManche(joueurs, state.zone);

  // Persiste les éliminations de la manche.
  if (res.elimines.length > 0) {
    await supabase
      .schema("interactive" as never)
      .from("session_players")
      .update({ eliminated_round: state.round } as never)
      .eq("session_id", sessionId)
      .in("id", res.elimines);
  }

  // Points de survie (le classement final suit la survie).
  for (const id of res.survivants) {
    await supabase
      .schema("interactive" as never)
      .rpc("add_player_score", { p_player_id: id, p_points: POINTS_PAR_MANCHE_SURVECUE } as never);
  }

  // Positions (pour l'animation TV : uniquement les joueurs qui ont joué).
  const positions = joueurs
    .filter((j) => j.pos)
    .map((j) => ({ playerId: j.id, x: j.pos!.x, y: j.pos!.y }));

  const winners = res.survivants.length <= 1 ? res.survivants : undefined;

  const newState: LaserState = {
    ...state,
    phase: "reveal",
    revealStartedAt: new Date().toISOString(),
    revealDurationSec: REVEAL_DURATION_SEC,
    lastResolution: {
      lasers: res.lasers,
      positions,
      eliminated: res.elimines,
    },
    winners,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Erreur mise à jour état." };
  return { success: true };
}

export async function nextLaserRoundAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: LaserState } | null)?.current_state;
  if (!state) return { success: false, error: "État introuvable." };

  // 1 survivant ou moins → la partie est finie.
  const vivants = await joueursEnVie(supabase, sessionId);
  if (vivants.length <= 1) {
    return endLaserAction(sessionId);
  }

  const nextRound = state.round + 1;
  const newState: LaserState = {
    phase: "aim",
    round: nextRound,
    zone: zonePourManche(nextRound),
    aimStartedAt: new Date().toISOString(),
    aimDurationSec: AIM_DURATION_SEC,
  };

  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ current_state: newState } as never)
    .eq("id", sessionId);

  if (error) return { success: false, error: "Erreur manche suivante." };
  return { success: true };
}

export async function endLaserAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();

  const state = (sessionRow as { current_state: LaserState } | null)?.current_state;
  const vivants = await joueursEnVie(supabase, sessionId);

  const newState: LaserState = {
    phase: "final",
    round: state?.round ?? 0,
    zone: state?.zone ?? zonePourManche(0),
    winners: vivants.map((v) => v.id),
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
