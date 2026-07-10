/**
 * <HostEstimGame /> — Vue TV pendant une partie Estim'.
 *
 * Phases :
 *  - 'round'  : question + grille des estimations live + timer
 *  - 'reveal' : vraie réponse + podium des plus proches + bonus rangs
 *  - 'final'  : WinnerCelebration + scoreboard
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
  ESTIM_QUESTIONS,
  ESTIM_ROUND_DURATION_SEC,
  ESTIM_REVEAL_DURATION_SEC,
  type EstimState,
} from "@/lib/games/estim";
import {
  revealEstimRoundAction,
  nextEstimRoundAction,
  endEstimAction,
} from "./estim-actions";
import MuteFooter from "./MuteFooter";
import EstimImage from "./EstimImage";

interface SessionPlayer {
  id: string;
  pseudo: string;
  avatar_config: ReturnType<typeof parseAvatarConfig>;
  score: number;
}

interface EstimAnswer {
  id: string;
  player_id: string;
  round: number;
  guess: number;
  diff_absolute: number;
  diff_percent: number;
  points: number;
  rank: number;
}

interface HostEstimGameProps {
  sessionId: string;
  initialState: EstimState;
  status: string;
}

export default function HostEstimGame({
  sessionId,
  initialState,
  status: initialStatus,
}: HostEstimGameProps) {
  const router = useRouter();
  const [state, setState] = useState<EstimState>(initialState);
  const [status, setStatus] = useState(initialStatus);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [answers, setAnswers] = useState<EstimAnswer[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    if (prev === curr) return;

    if (curr === "reveal" && prev === "round") {
      playSfx(AUDIO.revealExplain, 0.5);
    } else if (curr === "round" && prev === "reveal") {
      playSfx(AUDIO.transition, 0.4);
    } else if (curr === "final") {
      playSfx(AUDIO.finalVictory, 0.6);
    }
    prevPhaseRef.current = curr;
  }, [state.phase]);

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
          .from("estim_answers")
          .select("id, player_id, round, guess, diff_absolute, diff_percent, points, rank")
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
      setAnswers((aData ?? []) as EstimAnswer[]);
    }

    load();

    const channel = supabase
      .channel(`estim-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "session_players", filter: `session_id=eq.${sessionId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "estim_answers", filter: `session_id=eq.${sessionId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const r = payload.new as { status: string; current_state: EstimState };
          setStatus(r.status);
          setState(r.current_state);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Timer round + auto-reveal
  useEffect(() => {
    if (state.phase !== "round" || !state.roundStartedAt) {
      setSecondsLeft(null);
      return;
    }
    const startedAt = new Date(state.roundStartedAt).getTime();
    const limit = state.roundDurationSec ?? ESTIM_ROUND_DURATION_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        revealEstimRoundAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.roundStartedAt, state.roundDurationSec, sessionId, actionPending]);

  // Timer reveal + auto-next
  useEffect(() => {
    if (state.phase !== "reveal" || !state.revealStartedAt) return;
    const startedAt = new Date(state.revealStartedAt).getTime();
    const limit = state.revealDurationSec ?? ESTIM_REVEAL_DURATION_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        nextEstimRoundAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.revealStartedAt, state.revealDurationSec, sessionId, actionPending]);

  const currentQuestion = useMemo(
    () => ESTIM_QUESTIONS.find((q) => q.id === state.questionId) ?? null,
    [state.questionId]
  );

  const currentAnswers = useMemo(
    () => answers.filter((a) => a.round === state.round),
    [answers, state.round]
  );

  const sortedByDiff = useMemo(
    () =>
      [...currentAnswers].sort((a, b) => Number(a.diff_percent) - Number(b.diff_percent)),
    [currentAnswers]
  );

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  async function handleReveal() {
    setActionPending(true);
    await revealEstimRoundAction(sessionId);
    setActionPending(false);
  }
  async function handleNext() {
    setActionPending(true);
    await nextEstimRoundAction(sessionId);
    setActionPending(false);
  }
  async function handleEnd() {
    if (!confirm("Terminer la partie maintenant ?")) return;
    setActionPending(true);
    await endEstimAction(sessionId);
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
              Velito Interactive · HOW MUCH?!
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
                  subtitle={`How Much?! · ${state.totalRounds} questions`}
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

  if (!currentQuestion) {
    return (
      <main className="grid min-h-screen place-items-center text-white/40">
        Question introuvable
      </main>
    );
  }

  const showReveal = state.phase === "reveal";
  const submittedCount = currentAnswers.length;

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-pink-500/15 blur-3xl" />

      <div className="relative w-full max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Question {state.round} / {state.totalRounds}
            </p>
            {currentQuestion.theme && (
              <p className="mt-1 text-sm font-semibold text-pink-300">
                {currentQuestion.theme}
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

        {/* Question : image + label */}
        <div className="mx-auto max-w-2xl">
          <EstimImage
            src={currentQuestion.image}
            emoji={currentQuestion.emoji}
            label={currentQuestion.label}
            className="h-72 w-full"
          />
        </div>
        <p className="mt-4 text-center text-xs uppercase tracking-widest text-white/40">
          Combien ça vaut ?
        </p>
        <h1 className="neon-title mt-1 text-center text-2xl leading-tight sm:text-4xl">
          {currentQuestion.label}
        </h1>
        {currentQuestion.hint && (
          <p className="mt-2 text-center text-xs italic text-white/40">
            {currentQuestion.hint}
          </p>
        )}

        {/* Phase ROUND — grille live des estimations */}
        {!showReveal && (
          <section className="mt-8">
            <p className="mb-3 text-center text-xs uppercase tracking-[0.3em] text-white/40">
              Estimations en direct ({submittedCount}/{players.length})
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {players.map((p) => {
                const a = currentAnswers.find((x) => x.player_id === p.id);
                return (
                  <div
                    key={p.id}
                    className={
                      "flex flex-col items-center gap-2 rounded-2xl border p-4 transition " +
                      (a
                        ? "border-pink-400/40 bg-pink-500/10"
                        : "border-white/10 bg-white/[0.02]")
                    }
                  >
                    <Avatar config={p.avatar_config} size="sm" />
                    <p className="text-sm font-bold text-white">{p.pseudo}</p>
                    <p className="font-display text-xl font-black tabular-nums text-pink-300">
                      {a ? `${Number(a.guess).toLocaleString("fr-FR")} €` : "…"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Phase REVEAL — vrai prix (ou INESTIMABLE en mode joke) + podium */}
        {showReveal && (
          <section className="mt-8">
            <div
              className={
                "card-ink p-6 text-center " +
                (currentQuestion.joke ? "border-amber-400/40 bg-amber-500/5" : "")
              }
            >
              <p className="text-xs uppercase tracking-widest text-white/40">
                {currentQuestion.joke ? "La vraie réponse" : "Le vrai prix"}
              </p>
              {currentQuestion.joke ? (
                <>
                  <p className="mt-2 font-display text-5xl font-black tracking-wider text-amber-300 drop-shadow-[0_0_40px_rgba(252,211,77,0.4)] sm:text-6xl">
                    INESTIMABLE
                  </p>
                  <p className="mt-3 text-sm italic text-white/60">
                    🎁 +50 pts pour tout le monde, on rigole tous ensemble
                  </p>
                </>
              ) : (
                <p className="mt-2 font-display text-6xl font-black tabular-nums text-pink-300 drop-shadow-[0_0_40px_rgba(244,114,182,0.35)]">
                  {currentQuestion.priceEur.toLocaleString("fr-FR")} €
                </p>
              )}
            </div>

            <div className="mt-6 space-y-2">
              {sortedByDiff.map((a, i) => {
                const p = players.find((pl) => pl.id === a.player_id);
                if (!p) return null;
                const podium = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <div
                    key={a.id}
                    className={
                      "flex items-center gap-4 rounded-2xl border p-4 transition " +
                      (i === 0
                        ? "border-amber-300/60 bg-amber-500/10"
                        : i === 1
                        ? "border-slate-300/60 bg-slate-300/10"
                        : i === 2
                        ? "border-orange-400/40 bg-orange-500/10"
                        : "border-white/10 bg-white/[0.02]")
                    }
                  >
                    <span className="w-8 text-center text-2xl">{podium ?? `${i + 1}`}</span>
                    <Avatar config={p.avatar_config} size="sm" />
                    <div className="flex-1">
                      <p className="font-bold text-white">{p.pseudo}</p>
                      <p className="text-xs text-white/50">
                        {Number(a.guess).toLocaleString("fr-FR")} € ·{" "}
                        écart {Number(a.diff_percent).toFixed(1)}%
                      </p>
                    </div>
                    <p className="font-display text-xl font-black text-emerald-300">
                      +{a.points}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Boutons host */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {state.phase === "round" && (
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
                : state.round >= state.totalRounds
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
