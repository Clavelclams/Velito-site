"use server";

import { createClient } from "@/lib/supabase/server";
import { distributeRoles, shuffle, type LGState } from "@/lib/games/loup-garou";

interface ActionResult { success: boolean; error?: string; }

/**
 * Démarre la partie : distribue les rôles, passe en phase mayor_election
 * (ou cupid_link si pas de cupidon). Cupidon agit AVANT l'élection du Maire
 * dans la version simplifiée — V2 on inversera selon la spec officielle.
 */
export async function startLoupGarouAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: playersData } = await supabase
    .schema("interactive" as never)
    .from("session_players")
    .select("id")
    .eq("session_id", sessionId);
  const players = (playersData ?? []) as Array<{ id: string }>;

  if (players.length < 5) {
    return { success: false, error: "Minimum 5 joueurs pour Loup-Garou." };
  }

  const roles = distributeRoles(players.map((p) => p.id));

  // Nettoie + insert tous les rôles
  await supabase
    .schema("interactive" as never)
    .from("lg_player_roles")
    .delete()
    .eq("session_id", sessionId);

  for (const [playerId, role] of roles) {
    await supabase
      .schema("interactive" as never)
      .from("lg_player_roles")
      .insert({
        player_id: playerId,
        session_id: sessionId,
        role,
        alive: true,
      } as never);
  }

  const seatOrder = shuffle(players.map((p) => p.id));
  const hasCupid = Array.from(roles.values()).includes("cupid");

  const newState: LGState = {
    phase: hasCupid ? "cupid_link" : "mayor_election",
    cycleNumber: 1,
    seatOrder,
  };

  await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      status: "playing",
      game_type: "loup_garou",
      started_at: new Date().toISOString(),
      current_state: newState,
    } as never)
    .eq("id", sessionId);

  return { success: true };
}

/**
 * Avance à la phase suivante. C'est la fonction polymorphique : selon la phase
 * courante, on calcule la prochaine + on résout si besoin.
 */
export async function nextLGPhaseAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non connecté." };

  const { data: sessionRow } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("current_state")
    .eq("id", sessionId)
    .single();
  const state = (sessionRow as { current_state: LGState } | null)?.current_state;
  if (!state) return { success: false, error: "État introuvable." };

  const { data: rolesData } = await supabase
    .schema("interactive" as never)
    .from("lg_player_roles")
    .select("player_id, role, alive, lover_of, witch_life_potion_used, witch_death_potion_used, hunter_shot_taken")
    .eq("session_id", sessionId);
  const roles = (rolesData ?? []) as Array<{
    player_id: string; role: string; alive: boolean; lover_of: string | null;
    witch_life_potion_used: boolean; witch_death_potion_used: boolean; hunter_shot_taken: boolean;
  }>;

  const hasAliveRole = (r: string) => roles.some((x) => x.role === r && x.alive);
  const isEvenCycle = state.cycleNumber % 2 === 0;

  let next: LGState = { ...state };

  switch (state.phase) {
    case "cupid_link": {
      // Lit le vote de Cupidon pour récupérer les amoureux
      const { data: cupidVote } = await supabase
        .schema("interactive" as never)
        .from("lg_votes")
        .select("target_id, target2_id")
        .eq("session_id", sessionId)
        .eq("vote_round", "cupid_link")
        .maybeSingle();
      const cv = cupidVote as { target_id: string; target2_id: string } | null;
      if (cv && cv.target_id && cv.target2_id) {
        // Marque les amoureux dans lg_player_roles
        await supabase.schema("interactive" as never).from("lg_player_roles")
          .update({ lover_of: cv.target2_id } as never).eq("player_id", cv.target_id);
        await supabase.schema("interactive" as never).from("lg_player_roles")
          .update({ lover_of: cv.target_id } as never).eq("player_id", cv.target2_id);
        next.loverIds = [cv.target_id, cv.target2_id];
      }
      next.phase = "lovers_reveal";
      break;
    }
    case "lovers_reveal":
      next.phase = "mayor_election";
      break;

    case "mayor_election": {
      // Décompte vote maire
      const mayorId = await countWinner(supabase, sessionId, "day_0_mayor");
      if (mayorId) {
        await supabase.schema("interactive" as never).from("lg_player_roles")
          .update({ is_mayor: true } as never).eq("player_id", mayorId);
        next.mayorId = mayorId;
      }
      // Première nuit : Voyante en premier
      next.phase = hasAliveRole("seer") ? "night_seer" : "night_wolves";
      break;
    }

    case "night_seer":
      next.phase = "night_wolves";
      break;

    case "night_wolves": {
      // Décompte vote loups
      const victimId = await countWinner(supabase, sessionId, `night_${state.cycleNumber}_wolves`);
      next.wolvesVictimId = victimId;

      // Loup Blanc agit nuits paires (cycle 2, 4...)
      if (isEvenCycle && hasAliveRole("white_wolf")) {
        next.phase = "night_white_wolf";
      } else if (hasAliveRole("witch")) {
        next.phase = "night_witch";
      } else {
        next.phase = "night_resolve";
      }
      break;
    }

    case "night_white_wolf": {
      // Le Loup Blanc tue un loup s'il a voté
      const { data: vote } = await supabase
        .schema("interactive" as never)
        .from("lg_votes")
        .select("target_id")
        .eq("session_id", sessionId)
        .eq("vote_round", `night_${state.cycleNumber}_white_wolf`)
        .maybeSingle();
      const targetId = (vote as { target_id: string } | null)?.target_id;
      if (targetId) {
        await supabase.schema("interactive" as never).from("lg_player_roles")
          .update({ alive: false, death_reason: "white_wolf", death_cycle: state.cycleNumber } as never)
          .eq("player_id", targetId);
      }
      next.phase = hasAliveRole("witch") ? "night_witch" : "night_resolve";
      break;
    }

    case "night_witch": {
      // Lit les choix de la sorcière
      const witch = roles.find((r) => r.role === "witch" && r.alive);
      if (witch) {
        // Save potion
        const { data: saveVote } = await supabase
          .schema("interactive" as never).from("lg_votes")
          .select("target_id")
          .eq("session_id", sessionId)
          .eq("vote_round", `night_${state.cycleNumber}_witch_save`)
          .maybeSingle();
        if (saveVote && !witch.witch_life_potion_used) {
          const savedId = (saveVote as { target_id: string }).target_id;
          if (savedId === state.wolvesVictimId) {
            next.wolvesVictimId = undefined;
            await supabase.schema("interactive" as never).from("lg_player_roles")
              .update({ witch_life_potion_used: true } as never)
              .eq("player_id", witch.player_id);
          }
        }
        // Kill potion
        const { data: killVote } = await supabase
          .schema("interactive" as never).from("lg_votes")
          .select("target_id")
          .eq("session_id", sessionId)
          .eq("vote_round", `night_${state.cycleNumber}_witch_kill`)
          .maybeSingle();
        if (killVote && !witch.witch_death_potion_used) {
          const killedId = (killVote as { target_id: string }).target_id;
          if (killedId) {
            await supabase.schema("interactive" as never).from("lg_player_roles")
              .update({ alive: false, death_reason: "witch", death_cycle: state.cycleNumber } as never)
              .eq("player_id", killedId);
            await supabase.schema("interactive" as never).from("lg_player_roles")
              .update({ witch_death_potion_used: true } as never)
              .eq("player_id", witch.player_id);
          }
        }
      }
      next.phase = "night_resolve";
      break;
    }

    case "night_resolve": {
      // Tue la victime des loups (sauf si Sorcière a sauvé)
      const deaths: string[] = [];
      if (next.wolvesVictimId) {
        await supabase.schema("interactive" as never).from("lg_player_roles")
          .update({ alive: false, death_reason: "wolves", death_cycle: state.cycleNumber } as never)
          .eq("player_id", next.wolvesVictimId);
        deaths.push(next.wolvesVictimId);
      }
      // Cascade amoureux : si un mort a un amoureux vivant → l'amoureux meurt aussi
      const allDead = roles.filter((r) => !r.alive).map((r) => r.player_id);
      const newlyDead = await getNewlyDead(supabase, sessionId, allDead);
      for (const deadId of newlyDead) {
        const lover = roles.find((r) => r.player_id === deadId)?.lover_of;
        if (lover && roles.find((r) => r.player_id === lover && r.alive)) {
          await supabase.schema("interactive" as never).from("lg_player_roles")
            .update({ alive: false, death_reason: "lover", death_cycle: state.cycleNumber } as never)
            .eq("player_id", lover);
          deaths.push(lover);
        }
      }
      next.lastNightDeaths = deaths;
      next.wolvesVictimId = undefined;

      // Check fin de partie
      const winner = await checkWinner(supabase, sessionId);
      if (winner) {
        next.phase = "ended";
        next.winnerCamp = winner;
      } else {
        // Si un chasseur est mort → phase hunter_shot avant day_reveal
        const hunterDead = deaths.find((id) => roles.find((r) => r.player_id === id)?.role === "hunter" &&
                                                !roles.find((r) => r.player_id === id)?.hunter_shot_taken);
        if (hunterDead) {
          next.phase = "hunter_shot";
          next.hunterToShootId = hunterDead;
        } else {
          next.phase = "day_reveal";
        }
      }
      break;
    }

    case "hunter_shot": {
      // Le Chasseur a voté → tue sa cible
      const { data: shotVote } = await supabase
        .schema("interactive" as never).from("lg_votes")
        .select("target_id")
        .eq("session_id", sessionId)
        .eq("vote_round", `hunter_${state.cycleNumber}_${state.hunterToShootId}`)
        .maybeSingle();
      const shotTargetId = (shotVote as { target_id: string } | null)?.target_id;
      if (shotTargetId) {
        await supabase.schema("interactive" as never).from("lg_player_roles")
          .update({ alive: false, death_reason: "hunter", death_cycle: state.cycleNumber } as never)
          .eq("player_id", shotTargetId);
      }
      if (state.hunterToShootId) {
        await supabase.schema("interactive" as never).from("lg_player_roles")
          .update({ hunter_shot_taken: true } as never)
          .eq("player_id", state.hunterToShootId);
      }
      const winner2 = await checkWinner(supabase, sessionId);
      next.phase = winner2 ? "ended" : "day_reveal";
      next.winnerCamp = winner2;
      next.hunterToShootId = undefined;
      break;
    }

    case "day_reveal":
      next.phase = "day_debate";
      break;

    case "day_debate":
      next.phase = "day_vote";
      break;

    case "day_vote": {
      // Décompte vote village (avec maire = vote double)
      const victimId = await countWinnerWithMayor(supabase, sessionId, `day_${state.cycleNumber}_village`, state.mayorId);
      if (victimId) {
        await supabase.schema("interactive" as never).from("lg_player_roles")
          .update({ alive: false, death_reason: "village_vote", death_cycle: state.cycleNumber } as never)
          .eq("player_id", victimId);
      }
      next.lastDayVictimId = victimId;
      // Cascade amoureux
      if (victimId) {
        const lover = roles.find((r) => r.player_id === victimId)?.lover_of;
        if (lover && roles.find((r) => r.player_id === lover && r.alive)) {
          await supabase.schema("interactive" as never).from("lg_player_roles")
            .update({ alive: false, death_reason: "lover", death_cycle: state.cycleNumber } as never)
            .eq("player_id", lover);
        }
      }
      next.phase = "day_resolve";
      break;
    }

    case "day_resolve": {
      const winner = await checkWinner(supabase, sessionId);
      if (winner) {
        next.phase = "ended";
        next.winnerCamp = winner;
      } else {
        // Chasseur ?
        const hunterDead = roles.find((r) =>
          r.role === "hunter" && !r.alive && !r.hunter_shot_taken
        );
        if (hunterDead) {
          next.phase = "hunter_shot";
          next.hunterToShootId = hunterDead.player_id;
        } else {
          // Nuit suivante
          next.cycleNumber = state.cycleNumber + 1;
          next.phase = hasAliveRole("seer") ? "night_seer" : "night_wolves";
        }
      }
      break;
    }

    case "ended":
      break;
  }

  await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({
      current_state: next,
      status: next.phase === "ended" ? "ended" : "playing",
      ended_at: next.phase === "ended" ? new Date().toISOString() : null,
    } as never)
    .eq("id", sessionId);
  return { success: true };
}

export async function endLGGameAction(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() } as never)
    .eq("id", sessionId);
  if (error) return { success: false, error: "Erreur fin de partie." };
  return { success: true };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countWinner(supabase: any, sessionId: string, voteRound: string): Promise<string | undefined> {
  const { data } = await supabase
    .schema("interactive")
    .from("lg_votes")
    .select("target_id")
    .eq("session_id", sessionId)
    .eq("vote_round", voteRound);
  const counts = new Map<string, number>();
  for (const v of (data ?? []) as Array<{ target_id: string | null }>) {
    if (v.target_id) counts.set(v.target_id, (counts.get(v.target_id) ?? 0) + 1);
  }
  // Égalité = personne d'éliminé. On collecte les ex æquo au lieu de renvoyer
  // le premier de la Map (ordre non déterministe = tué aléatoire = bug).
  let max = 0;
  let top: string[] = [];
  for (const [id, c] of counts) {
    if (c > max) { max = c; top = [id]; }
    else if (c === max) top.push(id);
  }
  return top.length === 1 ? top[0] : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countWinnerWithMayor(supabase: any, sessionId: string, voteRound: string, mayorId?: string): Promise<string | undefined> {
  const { data } = await supabase
    .schema("interactive")
    .from("lg_votes")
    .select("voter_id, target_id")
    .eq("session_id", sessionId)
    .eq("vote_round", voteRound);
  const counts = new Map<string, number>();
  for (const v of (data ?? []) as Array<{ voter_id: string; target_id: string | null }>) {
    if (v.target_id) {
      const weight = v.voter_id === mayorId ? 2 : 1;
      counts.set(v.target_id, (counts.get(v.target_id) ?? 0) + weight);
    }
  }
  // Le maire pèse déjà double (weight=2). Si malgré ça il reste une égalité,
  // on n'élimine personne plutôt que de tuer selon l'ordre de la Map.
  let max = 0;
  let top: string[] = [];
  for (const [id, c] of counts) {
    if (c > max) { max = c; top = [id]; }
    else if (c === max) top.push(id);
  }
  return top.length === 1 ? top[0] : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getNewlyDead(supabase: any, sessionId: string, _allDead: string[]): Promise<string[]> {
  const { data } = await supabase
    .schema("interactive")
    .from("lg_player_roles")
    .select("player_id, death_cycle")
    .eq("session_id", sessionId)
    .eq("alive", false);
  const { data: stateData } = await supabase.schema("interactive").from("sessions").select("current_state").eq("id", sessionId).single();
  const cycle = (stateData as { current_state: LGState } | null)?.current_state?.cycleNumber;
  return ((data ?? []) as Array<{ player_id: string; death_cycle: number }>)
    .filter((r) => r.death_cycle === cycle).map((r) => r.player_id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkWinner(supabase: any, sessionId: string): Promise<"wolves" | "village" | "white_wolf" | "lovers" | undefined> {
  const { data } = await supabase
    .schema("interactive")
    .from("lg_player_roles")
    .select("player_id, role, alive, lover_of")
    .eq("session_id", sessionId);
  const rows = (data ?? []) as Array<{ player_id: string; role: string; alive: boolean; lover_of: string | null }>;
  const alive = rows.filter((r) => r.alive);

  // Loup Blanc seul survivant
  if (alive.length === 1 && alive[0]!.role === "white_wolf") return "white_wolf";

  // Amoureux : si exactement 2 vivants ET ils sont amoureux L'UN DE L'AUTRE
  // (test BIDIRECTIONNEL : sinon un simple changement d'ordre du tableau au
  // re-render pouvait fausser la condition de victoire).
  if (
    alive.length === 2 &&
    alive[0]!.lover_of === alive[1]!.player_id &&
    alive[1]!.lover_of === alive[0]!.player_id
  ) {
    return "lovers";
  }

  const aliveWolves = alive.filter((r) => r.role === "wolf" || r.role === "white_wolf").length;
  const aliveVillagers = alive.filter((r) => r.role !== "wolf" && r.role !== "white_wolf").length;
  if (aliveWolves === 0) return "village";
  if (aliveWolves >= aliveVillagers) return "wolves";
  return undefined;
}
