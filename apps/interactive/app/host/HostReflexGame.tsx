"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScoreboardRow } from "@repo/ui/scoreboard-row";
import { WinnerCelebration } from "@repo/ui/winner-celebration";
import { parseAvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import { playSfx, AUDIO } from "@/lib/audio";
import {
  REFLEX_REVEAL_DURATION_SEC,
  type ReflexState,
} from "@/lib/games/reflex";
import {
  revealReflexAction,
  nextReflexRoundAction,
  endReflexAction,
} from "./reflex-actions";
import MuteFooter from "./MuteFooter";

interface SessionPlayer {
  id: string;
  pseudo: string;
  avatar_config: ReturnType<typeof parseAvatarConfig>;
  score: number;
}
interface ReflexAnswer {
  id: string;
  player_id: string;
  round_index: number;
  reaction_ms: number | null;
  false_start: boolean;
  points: number;
  rank: number;
}

interface HostReflexGameProps {
  sessionId: string;
  initialState: ReflexState;
  status: string;
}

export default function HostReflexGame({
  sessionId,
  initialState,
  status: initialStatus,
}: HostReflexGameProps) {
  const router = useRouter();
  const [state, setState] = useState<ReflexState>(initialState);
  const [status, setStatus] = useState(initialStatus);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [answers, setAnswers] = useState<ReflexAnswer[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    if (prev === curr) return;
    if (curr === "go" && prev === "wait") playSfx(AUDIO.roundEnd, 0.6);
    else if (curr === "reveal") playSfx(AUDIO.revealExplain, 0.5);
    else if (curr === "wait" && prev === "reveal") playSfx(AUDIO.transition, 0.4);
    else if (curr === "final") playSfx(AUDIO.finalVictory, 0.6);
    prevPhaseRef.current = curr;
  }, [state.phase]);

  // Realtime
  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [{ data: pData }, { data: aData }] = await Promise.all([
        supabase.schema("interactive" as never).from("session_players")
          .select("id, pseudo, avatar_config, score").eq("session_id", sessionId),
        supabase.schema("interactive" as never).from("reflex_answers")
          .select("id, player_id, round_index, reaction_ms, false_start, points, rank")
          .eq("session_id", sessionId),
      ]);
      setPlayers(((pData ?? []) as Array<{ id: string; pseudo: string; avatar_config: unknown; score: number }>).map((r) => ({
        id: r.id, pseudo: r.pseudo, avatar_config: parseAvatarConfig(r.avatar_config), score: r.score,
      })));
      setAnswers((aData ?? []) as ReflexAnswer[]);
    }
    load();
    const channel = supabase.channel(`reflex-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "interactive", table: "session_players", filter: `session_id=eq.${sessionId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "interactive", table: "reflex_answers", filter: `session_id=eq.${sessionId}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` }, (payload) => {
        const r = payload.new as { status: string; current_state: ReflexState };
        setStatus(r.status);
        setState(r.current_state);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Wait → Go automatique quand on atteint goAt
  useEffect(() => {
    if (state.phase !== "wait" || !state.goAt) return;
    const goAt = new Date(state.goAt).getTime();
    const interval = setInterval(() => {
      if (Date.now() >= goAt) {
        // Mise à jour DB côté serveur via une action ? Plus simple : update direct
        const supabase = createClient();
        supabase.schema("interactive" as never).from("sessions")
          .update({ current_state: { ...state, phase: "go" } } as never)
          .eq("id", sessionId).then(() => {});
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [state, sessionId]);

  // Phase go : timer 3s, puis reveal auto
  useEffect(() => {
    if (state.phase !== "go") {
      setSecondsLeft(null);
      return;
    }
    let triggered = false;
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed += 100;
      const remaining = Math.max(0, Math.round((3000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (elapsed >= 3000 && !triggered && !actionPending) {
        triggered = true;
        revealReflexAction(sessionId).catch(console.error);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [state.phase, sessionId, actionPending]);

  // Timer reveal → auto-next
  useEffect(() => {
    if (state.phase !== "reveal" || !state.revealStartedAt) return;
    const startedAt = new Date(state.revealStartedAt).getTime();
    const limit = state.revealDurationSec ?? REFLEX_REVEAL_DURATION_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        nextReflexRoundAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.revealStartedAt, state.revealDurationSec, sessionId, actionPending]);

  const currentAnswers = useMemo(
    () => answers.filter((a) => a.round_index === state.roundIndex),
    [answers, state.roundIndex]
  );
  const sortedByRank = useMemo(
    () => [...currentAnswers].sort((a, b) => a.rank - b.rank),
    [currentAnswers]
  );
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  async function handleEnd() {
    if (!confirm("Terminer la partie ?")) return;
    setActionPending(true);
    await endReflexAction(sessionId);
    setActionPending(false);
  }

  // FINAL
  if (state.phase === "final" || status === "ended") {
    const winner = sortedPlayers[0];
    return (
      <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-10">
        <div className="relative mx-auto w-full max-w-7xl">
          <header className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Velito Interactive · RÉFLEXE</p>
            <h2 className="neon-title mt-2 text-3xl">Partie terminée</h2>
          </header>
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
            <div className="flex items-start justify-center">
              {winner ? (
                <WinnerCelebration pseudo={winner.pseudo} avatar={winner.avatar_config} score={winner.score} subtitle={`Réflexe · ${state.totalRounds} rounds`} />
              ) : <p className="text-center text-white/50">Aucun joueur.</p>}
            </div>
            {sortedPlayers.length > 1 && (
              <section className="self-start">
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40">Classement complet</p>
                <div className="space-y-2">
                  {sortedPlayers.slice(1).map((p, i) => (
                    <ScoreboardRow key={p.id} rank={i + 2} pseudo={p.pseudo} avatar={p.avatar_config} score={p.score} avatarSize="sm" variant="tv" />
                  ))}
                </div>
              </section>
            )}
          </div>
          <div className="mt-12 flex justify-center">
            <button type="button" onClick={() => router.push("/dashboard")} className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#04040e] hover:bg-white/90">
              Retour au dashboard
            </button>
          </div>
        </div>
        <MuteFooter />
      </main>
    );
  }

  // Background color selon phase
  const bgClass =
    state.phase === "go" ? "bg-emerald-500"
    : state.phase === "wait" ? "bg-red-900"
    : "bg-ink";

  return (
    <main className={`relative flex min-h-screen flex-col items-center justify-center px-6 py-10 transition-colors duration-300 ${bgClass}`}>
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
          Round {state.roundIndex + 1} / {state.totalRounds}
        </p>

        {state.phase === "wait" && (
          <>
            <p className="mt-6 text-9xl">⛔</p>
            <h1 className="neon-title mt-6 text-5xl sm:text-7xl">ATTENDS…</h1>
            <p className="mt-4 text-lg text-white/70">Le signal vert va apparaître</p>
            <p className="mt-2 text-xs italic text-white/50">Taper avant = false start = 0 pt</p>
          </>
        )}

        {state.phase === "go" && (
          <>
            <p className="text-9xl">⚡</p>
            <h1 className="neon-title mt-6 text-6xl font-black text-white sm:text-9xl">TAP !</h1>
            <p className="mt-4 text-2xl font-bold text-white">Tape sur ton tel MAINTENANT</p>
            {secondsLeft !== null && (
              <p className="mt-4 text-sm text-white/70">Reveal dans {secondsLeft}s</p>
            )}
          </>
        )}

        {state.phase === "reveal" && (
          <>
            <h1 className="neon-title text-4xl sm:text-5xl">Résultats du round</h1>
            <div className="mt-8 mx-auto max-w-md space-y-2">
              {sortedByRank.map((a, i) => {
                const p = players.find((pl) => pl.id === a.player_id);
                if (!p) return null;
                const podium = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                return (
                  <div key={a.id} className={"flex items-center gap-3 rounded-2xl border p-3 " + (i === 0 ? "border-amber-300/60 bg-amber-500/10" : "border-white/10 bg-white/[0.04]")}>
                    <span className="text-2xl">{podium}</span>
                    <span className="flex-1 text-left font-bold text-white">{p.pseudo}</span>
                    <span className="text-sm tabular-nums text-white/70">
                      {a.false_start ? "❌ false start" :
                        a.reaction_ms !== null ? `${a.reaction_ms} ms` : "Trop tard"}
                    </span>
                    <span className="font-display text-lg font-black text-emerald-300">+{a.points}</span>
                  </div>
                );
              })}
            </div>
            {secondsLeft !== null && (
              <p className="mt-6 text-sm uppercase tracking-widest text-amber-300">Suivant dans {secondsLeft}s</p>
            )}
          </>
        )}

        <button type="button" onClick={handleEnd} disabled={actionPending} className="mt-12 rounded-xl border border-white/30 px-5 py-2 text-xs font-medium text-white/80 hover:bg-white/10">
          Terminer la partie
        </button>
      </div>
      <MuteFooter />
    </main>
  );
}
