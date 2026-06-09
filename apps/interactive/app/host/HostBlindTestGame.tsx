/**
 * <HostBlindTestGame /> — Vue TV pendant une partie Blind Test.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@repo/ui/avatar";
import { ScoreboardRow } from "@repo/ui/scoreboard-row";
import { WinnerCelebration } from "@repo/ui/winner-celebration";
import { parseAvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import { playSfx, AUDIO } from "@/lib/audio";
import {
  BLINDTEST_QUESTION_TIME_LIMIT_SEC,
  BLINDTEST_REVEAL_DURATION_SEC,
  type BlindTestState,
} from "@/lib/games/blindtest";
import {
  revealBlindTestAction,
  nextBlindTestRoundAction,
  endBlindTestAction,
} from "./blindtest-actions";
import MuteFooter from "./MuteFooter";
import { isGloballyMuted } from "@/lib/audio";

interface SessionPlayer {
  id: string;
  pseudo: string;
  avatar_config: ReturnType<typeof parseAvatarConfig>;
  score: number;
}

interface BlindTestAnswer {
  id: string;
  player_id: string;
  round_index: number;
  answer: string;
  is_correct: boolean;
  points: number;
}

interface HostBlindTestGameProps {
  sessionId: string;
  initialState: BlindTestState;
  status: string;
}

export default function HostBlindTestGame({
  sessionId,
  initialState,
  status: initialStatus,
}: HostBlindTestGameProps) {
  const router = useRouter();
  const [state, setState] = useState<BlindTestState>(initialState);
  const [status, setStatus] = useState(initialStatus);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [answers, setAnswers] = useState<BlindTestAnswer[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // SFX phase changes
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    if (prev === curr) return;
    if (curr === "reveal" && prev === "question") {
      playSfx(AUDIO.revealExplain, 0.5);
    } else if (curr === "question" && prev === "reveal") {
      playSfx(AUDIO.transition, 0.4);
    } else if (curr === "final") {
      playSfx(AUDIO.finalVictory, 0.6);
    }
    prevPhaseRef.current = curr;
  }, [state.phase]);

  // Lecture audio du morceau pendant la phase question
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (state.phase !== "question") {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const round = state.rounds[state.roundIndex];
    if (!round) return;

    audio.src = round.track.previewUrl;
    audio.volume = isGloballyMuted() ? 0 : 0.6;
    audio.play().catch((err) => {
      console.warn("[BlindTest] autoplay blocked:", err.message);
    });
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [state.phase, state.roundIndex, state.rounds]);

  // Realtime
  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [{ data: pData }, { data: aData }] = await Promise.all([
        supabase
          .schema("interactive" as never)
          .from("session_players")
          .select("id, pseudo, avatar_config, score")
          .eq("session_id", sessionId),
        supabase
          .schema("interactive" as never)
          .from("blindtest_answers")
          .select("id, player_id, round_index, answer, is_correct, points")
          .eq("session_id", sessionId),
      ]);

      setPlayers(
        ((pData ?? []) as Array<{
          id: string; pseudo: string; avatar_config: unknown; score: number;
        }>).map((r) => ({
          id: r.id,
          pseudo: r.pseudo,
          avatar_config: parseAvatarConfig(r.avatar_config),
          score: r.score,
        }))
      );
      setAnswers((aData ?? []) as BlindTestAnswer[]);
    }
    load();

    const channel = supabase
      .channel(`bt-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "session_players", filter: `session_id=eq.${sessionId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "blindtest_answers", filter: `session_id=eq.${sessionId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const r = payload.new as { status: string; current_state: BlindTestState };
          setStatus(r.status);
          setState(r.current_state);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Timer question + auto-reveal
  useEffect(() => {
    if (state.phase !== "question" || !state.questionStartedAt) {
      setSecondsLeft(null);
      return;
    }
    const startedAt = new Date(state.questionStartedAt).getTime();
    const limit = state.timeLimitSec ?? BLINDTEST_QUESTION_TIME_LIMIT_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        revealBlindTestAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.questionStartedAt, state.timeLimitSec, sessionId, actionPending]);

  // Timer reveal + auto-next
  useEffect(() => {
    if (state.phase !== "reveal" || !state.revealStartedAt) return;
    const startedAt = new Date(state.revealStartedAt).getTime();
    const limit = state.revealDurationSec ?? BLINDTEST_REVEAL_DURATION_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        nextBlindTestRoundAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.revealStartedAt, state.revealDurationSec, sessionId, actionPending]);

  const currentRound = useMemo(
    () => state.rounds[state.roundIndex] ?? null,
    [state.rounds, state.roundIndex]
  );
  const currentAnswers = useMemo(
    () => answers.filter((a) => a.round_index === state.roundIndex),
    [answers, state.roundIndex]
  );
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  async function handleReveal() {
    setActionPending(true);
    await revealBlindTestAction(sessionId);
    setActionPending(false);
  }
  async function handleNext() {
    setActionPending(true);
    await nextBlindTestRoundAction(sessionId);
    setActionPending(false);
  }
  async function handleEnd() {
    if (!confirm("Terminer la partie maintenant ?")) return;
    setActionPending(true);
    await endBlindTestAction(sessionId);
    setActionPending(false);
  }

  // ═══ Final ═══
  if (state.phase === "final" || status === "ended") {
    const winner = sortedPlayers[0];
    return (
      <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-10">
        <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-30" />
        <div className="relative mx-auto w-full max-w-7xl">
          <header className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Velito Interactive · BLIND TEST
            </p>
            <h2 className="neon-title mt-2 text-3xl">Partie terminée</h2>
          </header>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
            <div className="flex items-start justify-center">
              {winner ? (
                <WinnerCelebration
                  pseudo={winner.pseudo}
                  avatar={winner.avatar_config}
                  score={winner.score}
                  subtitle={`Blind Test · ${state.totalRounds} morceaux`}
                />
              ) : (
                <p className="text-center text-white/50">Aucun joueur.</p>
              )}
            </div>

            {sortedPlayers.length > 1 && (
              <section className="self-start">
                <p className="mb-3 text-center text-xs uppercase tracking-[0.3em] text-white/40 lg:text-left">
                  Classement complet
                </p>
                <div className="space-y-2">
                  {sortedPlayers.slice(1).map((p, i) => (
                    <ScoreboardRow
                      key={p.id}
                      rank={i + 2}
                      pseudo={p.pseudo}
                      avatar={p.avatar_config}
                      score={p.score}
                      avatarSize="sm"
                      variant="tv"
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#04040e] hover:bg-white/90"
            >
              Retour au dashboard
            </button>
          </div>
        </div>
        <MuteFooter />
      </main>
    );
  }

  if (!currentRound) {
    return <main className="grid min-h-screen place-items-center text-white/40">Round introuvable</main>;
  }

  const showReveal = state.phase === "reveal";
  const submittedCount = currentAnswers.length;

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl" />

      {/* Audio playback du morceau */}
      <audio ref={audioRef} preload="auto" />

      <div className="relative w-full max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Question {state.roundIndex + 1} / {state.totalRounds}
            </p>
            {currentRound.track.theme && (
              <p className="mt-1 text-sm font-semibold text-cyan-300">
                {currentRound.track.theme}
              </p>
            )}
          </div>

          {secondsLeft !== null && (
            <div
              className={
                "rounded-2xl border px-6 py-3 text-center transition " +
                (showReveal
                  ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                  : secondsLeft <= 5
                  ? "border-red-500/60 bg-red-500/15 text-red-200"
                  : "border-white/15 bg-white/[0.03] text-white")
              }
            >
              <p className="font-display text-4xl font-black tabular-nums">
                {secondsLeft}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-white/50">
                {showReveal ? "suivant dans" : "secondes"}
              </p>
            </div>
          )}
        </header>

        {/* Phase QUESTION — onde sonore + 4 options */}
        {!showReveal && (
          <>
            <div className="card-ink mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
              <p className="text-6xl">🎵</p>
              <p className="text-sm font-bold text-white/80">
                Reconnais ce morceau
              </p>
              <p className="text-xs text-white/40">
                Lecture en cours · {state.timeLimitSec ?? 20} s
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {currentRound.options.map((label, i) => {
                const letter = "ABCD"[i]!;
                const count = currentAnswers.filter((a) => a.answer === letter).length;
                return (
                  <div
                    key={letter}
                    className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.04] p-5"
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-cyan-500/20 font-display text-2xl font-black text-cyan-300">
                      {letter}
                    </span>
                    <p className="flex-1 text-base font-semibold text-white">
                      {label}
                    </p>
                    <span className="text-xs uppercase tracking-wider text-white/40">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-center text-sm text-white/60">
              <span className="font-bold text-cyan-300">{submittedCount}</span> /{" "}
              {players.length} ont coché
            </p>
          </>
        )}

        {/* Phase REVEAL — pochette + titre + artiste */}
        {showReveal && (
          <section className="mt-4 grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
            <div className="flex justify-center">
              {currentRound.track.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentRound.track.artworkUrl}
                  alt={currentRound.track.correctLabel}
                  className="aspect-square w-full max-w-sm rounded-2xl border border-white/15 object-cover shadow-2xl"
                />
              ) : (
                <div className="aspect-square w-full max-w-sm rounded-2xl border border-white/15 bg-gradient-to-br from-cyan-500/30 to-pink-500/30 grid place-items-center">
                  <span className="text-9xl">🎵</span>
                </div>
              )}
            </div>
            <div className="text-center lg:text-left">
              <p className="text-xs uppercase tracking-widest text-white/40">
                La bonne réponse
              </p>
              <p className="mt-2 font-display text-3xl font-black text-cyan-300 sm:text-4xl">
                {currentRound.track.correctLabel}
              </p>
              <p className="mt-4 text-xs uppercase tracking-widest text-white/40">
                Bonnes réponses
              </p>
              <p className="font-display text-3xl font-black text-emerald-300">
                {currentAnswers.filter((a) => a.is_correct).length} /{" "}
                {players.length}
              </p>
            </div>
          </section>
        )}

        {/* Boutons host */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {state.phase === "question" && (
            <button
              type="button"
              onClick={handleReveal}
              disabled={actionPending}
              className="btn-tenant"
            >
              {actionPending ? "Calcul…" : "Révéler maintenant"}
            </button>
          )}
          {state.phase === "reveal" && (
            <button
              type="button"
              onClick={handleNext}
              disabled={actionPending}
              className="btn-tenant"
            >
              {actionPending
                ? "Suivant…"
                : state.roundIndex + 1 >= state.totalRounds
                ? "Voir le gagnant"
                : "Question suivante"}
            </button>
          )}
          <button
            type="button"
            onClick={handleEnd}
            disabled={actionPending}
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white/70 hover:bg-white/[0.05]"
          >
            Terminer la partie
          </button>
        </div>

        {/* Scoreboard live */}
        {sortedPlayers.length > 0 && (
          <section className="mt-10">
            <p className="mb-3 text-xs uppercase tracking-widest text-white/40">
              Classement
            </p>
            <div className="space-y-2">
              {sortedPlayers.slice(0, 5).map((p, i) => (
                <ScoreboardRow
                  key={p.id}
                  rank={i + 1}
                  pseudo={p.pseudo}
                  avatar={p.avatar_config}
                  score={p.score}
                  avatarSize="sm"
                  variant="mobile"
                />
              ))}
            </div>
          </section>
        )}
      </div>
      <MuteFooter />
    </main>
  );
}
