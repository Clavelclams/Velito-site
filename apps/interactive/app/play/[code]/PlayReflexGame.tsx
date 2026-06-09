"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@repo/ui/avatar";
import type { AvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import { type ReflexState } from "@/lib/games/reflex";
import NextSessionInput from "./NextSessionInput";

interface MyAnswer {
  id: string;
  round_index: number;
  reaction_ms: number | null;
  false_start: boolean;
  points: number;
  rank: number;
}

interface PlayReflexGameProps {
  sessionId: string;
  playerId: string;
  pseudo: string;
  avatar: AvatarConfig;
}

export default function PlayReflexGame({
  sessionId,
  playerId,
  pseudo,
  avatar,
}: PlayReflexGameProps) {
  const [state, setState] = useState<ReflexState | null>(null);
  const [myAnswers, setMyAnswers] = useState<MyAnswer[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const goAtRef = useRef<number | null>(null);

  // Realtime
  useEffect(() => {
    const supabase = createClient();
    async function loadAll() {
      const [sessionRes, ansRes, playerRes] = await Promise.all([
        supabase.schema("interactive" as never).from("sessions").select("current_state").eq("id", sessionId).single(),
        supabase.schema("interactive" as never).from("reflex_answers")
          .select("id, round_index, reaction_ms, false_start, points, rank").eq("player_id", playerId),
        supabase.schema("interactive" as never).from("session_players").select("score").eq("id", playerId).single(),
      ]);
      if (sessionRes.data) setState((sessionRes.data as { current_state: ReflexState }).current_state);
      if (ansRes.data) setMyAnswers(ansRes.data as MyAnswer[]);
      if (playerRes.data) setMyScore((playerRes.data as { score: number }).score);
    }
    loadAll();

    const channel = supabase.channel(`play-reflex-${playerId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` }, (payload) => {
        setState((payload.new as { current_state: ReflexState }).current_state);
      })
      .on("postgres_changes", { event: "*", schema: "interactive", table: "reflex_answers", filter: `player_id=eq.${playerId}` }, () => loadAll())
      .on("postgres_changes", { event: "UPDATE", schema: "interactive", table: "session_players", filter: `id=eq.${playerId}` }, (payload) => setMyScore((payload.new as { score: number }).score))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, playerId]);

  // Mémorise le moment exact où "go" arrive
  useEffect(() => {
    if (state?.phase === "go" && state.goAt) {
      goAtRef.current = new Date(state.goAt).getTime();
    } else {
      goAtRef.current = null;
    }
  }, [state?.phase, state?.goAt]);

  const myAnswerForCurrent = useMemo(
    () => myAnswers.find((a) => a.round_index === state?.roundIndex) ?? null,
    [myAnswers, state?.roundIndex]
  );

  async function handleTap() {
    if (!state || submitting || myAnswerForCurrent) return;
    if (state.phase !== "wait" && state.phase !== "go") return;

    setSubmitting(true);
    const supabase = createClient();
    const isFalseStart = state.phase === "wait";
    const reaction_ms = isFalseStart || !goAtRef.current ? null : Math.max(0, Date.now() - goAtRef.current);

    await supabase.schema("interactive" as never).from("reflex_answers").insert({
      session_id: sessionId,
      player_id: playerId,
      round_index: state.roundIndex,
      reaction_ms,
      false_start: isFalseStart,
    } as never);
    setSubmitting(false);
  }

  if (!state) return <div className="w-full max-w-sm text-center text-white/40">Chargement…</div>;

  if (state.phase === "final") {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Velito Interactive · RÉFLEXE</p>
        <h1 className="neon-title mt-3 text-3xl">Partie terminée</h1>
        <div className="mt-8 flex justify-center"><Avatar config={avatar} size="xl" /></div>
        <p className="mt-4 font-display text-xl font-bold text-white">{pseudo}</p>
        <div className="card-ink mt-8 p-6">
          <p className="text-xs uppercase tracking-widest text-white/40">Ton score</p>
          <p className="mt-2 font-display text-5xl font-black tabular-nums text-red-300">{myScore.toLocaleString("fr-FR")}</p>
        </div>
        <p className="mt-6 text-xs text-white/40">Regarde l&apos;écran TV pour voir le classement 🏆</p>
        <NextSessionInput />
      </div>
    );
  }

  if (state.phase === "reveal" && myAnswerForCurrent) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Round {state.roundIndex + 1} / {state.totalRounds}
        </p>
        <div className="card-ink mt-6 p-6">
          {myAnswerForCurrent.false_start ? (
            <>
              <p className="text-5xl">❌</p>
              <p className="mt-3 font-bold text-red-300">False start</p>
              <p className="mt-1 text-xs text-white/50">Tu as tapé avant le signal vert</p>
            </>
          ) : myAnswerForCurrent.reaction_ms !== null ? (
            <>
              <p className="text-xs uppercase tracking-widest text-white/40">Ton temps</p>
              <p className="mt-2 font-display text-4xl font-black tabular-nums text-emerald-300">{myAnswerForCurrent.reaction_ms} ms</p>
              <p className="mt-1 text-xs text-white/50">Rang {myAnswerForCurrent.rank}</p>
              <p className="mt-3 font-display text-2xl font-black text-emerald-300">+{myAnswerForCurrent.points} pts</p>
            </>
          ) : (
            <>
              <p className="text-5xl">⏰</p>
              <p className="mt-3 font-bold text-white/60">Trop tard</p>
            </>
          )}
        </div>
        <p className="mt-4 text-xs uppercase tracking-widest text-white/50">Score total</p>
        <p className="font-display text-3xl font-black tabular-nums text-red-300">{myScore.toLocaleString("fr-FR")}</p>
      </div>
    );
  }

  // wait OU go : grand bouton plein écran
  const isGo = state.phase === "go";
  const tapped = !!myAnswerForCurrent;

  return (
    <div className="w-full max-w-sm">
      <p className="text-center text-xs uppercase tracking-[0.3em] text-white/40">
        Round {state.roundIndex + 1} / {state.totalRounds}
      </p>
      <button
        type="button"
        onClick={handleTap}
        disabled={submitting || tapped}
        className={
          "mt-4 grid h-[60vh] w-full place-items-center rounded-3xl border-4 text-4xl font-black uppercase tracking-widest text-white shadow-2xl transition disabled:opacity-50 " +
          (tapped ? "border-white/30 bg-white/[0.04]" :
           isGo ? "border-emerald-300 bg-emerald-500 animate-pulse" :
           "border-red-500 bg-red-900/60")
        }
      >
        {tapped ? "✓" : isGo ? "TAP !" : "ATTENDS"}
      </button>
      <p className="mt-3 text-center text-xs text-white/50">
        {tapped ? "Réponse envoyée" : isGo ? "Tape MAINTENANT" : "Attends le vert · pas de false start"}
      </p>
    </div>
  );
}
