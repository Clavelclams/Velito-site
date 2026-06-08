/**
 * <HostQuizGame /> — Vue TV pendant une partie de Quiz (Client Component).
 *
 * Affiche :
 *  - Phase 'question' : grosse question + 4 choix A/B/C/D + timer countdown
 *  - Phase 'reveal'   : réponse correcte highlightée + scoreboard live
 *  - Phase 'final'    : WinnerCelebration avec le gagnant
 *
 * Realtime :
 *  - Subscribe sur sessions + player_answers de cette session
 *  - À chaque vote joueur → compteur "X/Y ont répondu" mis à jour
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
  QUIZ_QUESTIONS,
  type QuizQuestion,
  QUESTION_TIME_LIMIT_SEC,
  REVEAL_DURATION_SEC,
} from "@/lib/games/quiz-questions";
import {
  revealAnswerAction,
  nextQuestionAction,
  endGameAction,
} from "./quiz-actions";

interface SessionState {
  phase: "choose_game" | "question" | "reveal" | "final";
  questionIndex: number;
  questionStartedAt?: string;
  revealStartedAt?: string;
  timeLimitSec?: number;
  revealDurationSec?: number;
}

interface SessionPlayer {
  id: string;
  pseudo: string;
  avatar_config: ReturnType<typeof parseAvatarConfig>;
  score: number;
}

interface PlayerAnswer {
  id: string;
  player_id: string;
  question_index: number;
  answer: string;
  is_correct: boolean;
  points: number;
}

interface HostQuizGameProps {
  sessionId: string;
  initialState: SessionState;
  status: string;
}

export default function HostQuizGame({
  sessionId,
  initialState,
  status: initialStatus,
}: HostQuizGameProps) {
  const router = useRouter();
  const [state, setState] = useState<SessionState>(initialState);
  const [status, setStatus] = useState(initialStatus);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Mémoire des SFX déjà joués pour ne pas spammer.
  // Garde la phase précédente pour détecter les transitions.
  const prevPhaseRef = useRef<string | null>(null);
  const prevAnswersCountRef = useRef(0);

  // ─── 1. Charge joueurs + réponses + subscribe Realtime ───
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
          .from("player_answers")
          .select("id, player_id, question_index, answer, is_correct, points")
          .eq("session_id", sessionId),
      ]);

      setPlayers(
        ((pData ?? []) as Array<{
          id: string;
          pseudo: string;
          avatar_config: unknown;
          score: number;
        }>).map((r) => ({
          id: r.id,
          pseudo: r.pseudo,
          avatar_config: parseAvatarConfig(r.avatar_config),
          score: r.score,
        }))
      );

      const newAnswers = (aData ?? []) as PlayerAnswer[];
      // SFX click quand un nouveau player_answer arrive
      if (newAnswers.length > prevAnswersCountRef.current) {
        playSfx(AUDIO.clickAnswer, 0.4);
      }
      prevAnswersCountRef.current = newAnswers.length;
      setAnswers(newAnswers);
    }

    load();

    const channel = supabase
      .channel(`quiz-game-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "interactive",
          table: "session_players",
          filter: `session_id=eq.${sessionId}`,
        },
        () => load() // Re-fetch global (simple pour MVP)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "interactive",
          table: "player_answers",
          filter: `session_id=eq.${sessionId}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "interactive",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const r = payload.new as {
            status: string;
            current_state: SessionState;
          };
          setStatus(r.status);
          setState(r.current_state);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // ─── SFX au changement de phase ───
  // reveal → joue 'reveal' (annonce bonne réponse) + 'wrong' s'il y a des erreurs
  // final  → joue 'final-victory'
  // question (après reveal) → joue 'transition' (whoosh)
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    if (prev === curr) return;

    if (curr === "reveal" && prev === "question") {
      playSfx(AUDIO.revealExplain, 0.5);
      // Si au moins une mauvaise réponse, on superpose un "buzz" léger
      const wrongCount = answers.filter(
        (a) => a.question_index === state.questionIndex && !a.is_correct
      ).length;
      if (wrongCount > 0) {
        setTimeout(() => playSfx(AUDIO.wrongAnswer, 0.3), 400);
      }
    } else if (curr === "question" && prev === "reveal") {
      playSfx(AUDIO.transition, 0.4);
    } else if (curr === "final") {
      playSfx(AUDIO.finalVictory, 0.6);
    }
    prevPhaseRef.current = curr;
  }, [state.phase, state.questionIndex, answers]);

  // ─── 2a. Timer countdown question + auto-reveal à 0 ───
  useEffect(() => {
    if (state.phase !== "question" || !state.questionStartedAt) {
      setSecondsLeft(null);
      return;
    }
    const startedAt = new Date(state.questionStartedAt).getTime();
    const limit = state.timeLimitSec ?? QUESTION_TIME_LIMIT_SEC;
    let revealTriggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      // Auto-reveal quand le timer atteint 0 (host n'a pas cliqué avant)
      if (remaining === 0 && !revealTriggered && !actionPending) {
        revealTriggered = true;
        revealAnswerAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.questionStartedAt, state.timeLimitSec, sessionId, actionPending]);

  // ─── 2b. Timer countdown reveal + auto-next à 0 ───
  useEffect(() => {
    if (state.phase !== "reveal" || !state.revealStartedAt) {
      return;
    }
    const startedAt = new Date(state.revealStartedAt).getTime();
    const limit = state.revealDurationSec ?? REVEAL_DURATION_SEC;
    let nextTriggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !nextTriggered && !actionPending) {
        nextTriggered = true;
        nextQuestionAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.revealStartedAt, state.revealDurationSec, sessionId, actionPending]);

  // ─── Helpers ───
  const currentQuestion: QuizQuestion | null = useMemo(() => {
    return QUIZ_QUESTIONS[state.questionIndex] ?? null;
  }, [state.questionIndex]);

  const currentAnswers = useMemo(
    () => answers.filter((a) => a.question_index === state.questionIndex),
    [answers, state.questionIndex]
  );

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  async function handleReveal() {
    setActionPending(true);
    await revealAnswerAction(sessionId);
    setActionPending(false);
  }

  async function handleNext() {
    setActionPending(true);
    await nextQuestionAction(sessionId);
    setActionPending(false);
  }

  async function handleEnd() {
    if (!confirm("Terminer le Quiz maintenant ?")) return;
    setActionPending(true);
    await endGameAction(sessionId);
    setActionPending(false);
  }

  // ═══════════════════ Phase FINAL — écran victoire ═══════════════════
  if (state.phase === "final" || status === "ended") {
    const winner = sortedPlayers[0];
    return (
      <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-10">
        <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-30" />
        <div className="relative mx-auto w-full max-w-7xl">
          <header className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Velito Interactive · QUIZ
            </p>
            <h2 className="neon-title mt-2 text-3xl">Partie terminée</h2>
          </header>

          {/* Layout 2 colonnes sur TV / desktop, 1 colonne sur mobile */}
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
            {/* ─── Colonne gauche : winner ─── */}
            <div className="flex items-start justify-center">
              {winner ? (
                <WinnerCelebration
                  pseudo={winner.pseudo}
                  avatar={winner.avatar_config}
                  score={winner.score}
                  subtitle={`Quiz · ${QUIZ_QUESTIONS.length} questions`}
                />
              ) : (
                <p className="text-center text-white/50">Aucun joueur.</p>
              )}
            </div>

            {/* ─── Colonne droite : classement complet ─── */}
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
      </main>
    );
  }

  // ═══════════════════ Phase QUESTION ou REVEAL ═══════════════════
  if (!currentQuestion) {
    return (
      <main className="grid min-h-screen place-items-center text-white/40">
        Question introuvable
      </main>
    );
  }

  const answeredCount = currentAnswers.length;
  const showReveal = state.phase === "reveal";

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-8 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-neon-violet/20 blur-3xl" />

      <div className="relative w-full max-w-5xl">
        {/* Header : numéro de question + thème + timer */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Question {state.questionIndex + 1} / {QUIZ_QUESTIONS.length}
            </p>
            {currentQuestion.theme && (
              <p className="mt-1 text-sm font-semibold text-tenant">
                {currentQuestion.theme}
              </p>
            )}
          </div>
          {/* Timer countdown — visible en phase question ET reveal */}
          {secondsLeft !== null && (state.phase === "question" || state.phase === "reveal") && (
            <div
              className={
                "rounded-2xl border px-6 py-3 text-center transition " +
                (state.phase === "reveal"
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
                {state.phase === "reveal" ? "suivant dans" : "secondes"}
              </p>
            </div>
          )}
        </header>

        {/* Question */}
        <h1 className="neon-title text-center text-3xl leading-tight sm:text-5xl">
          {currentQuestion.question}
        </h1>

        {/* 4 choix A/B/C/D */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(["A", "B", "C", "D"] as const).map((letter) => {
            const isCorrect = letter === currentQuestion.correct;
            const choiceCount = currentAnswers.filter((a) => a.answer === letter).length;
            return (
              <div
                key={letter}
                className={
                  "flex items-center gap-4 rounded-2xl border p-5 transition " +
                  (showReveal
                    ? isCorrect
                      ? "border-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-400"
                      : "border-white/10 bg-white/[0.02] opacity-50"
                    : "border-white/15 bg-white/[0.04]")
                }
              >
                <span
                  className={
                    "grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-2xl font-black " +
                    (showReveal && isCorrect
                      ? "bg-emerald-400 text-emerald-950"
                      : "bg-white/10 text-white/80")
                  }
                >
                  {letter}
                </span>
                <p className="flex-1 text-lg font-semibold text-white">
                  {currentQuestion.choices[letter]}
                </p>
                {showReveal && (
                  <span className="text-xs uppercase tracking-wider text-white/40">
                    {choiceCount} vote{choiceCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Compteur "X/Y ont coché" pendant la question */}
        {state.phase === "question" && (
          <p className="mt-8 text-center text-sm text-white/60">
            <span className="font-bold text-tenant">{answeredCount}</span> /{" "}
            {players.length} ont coché une réponse
          </p>
        )}

        {/* Boutons host */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {state.phase === "question" && (
            <button
              type="button"
              onClick={handleReveal}
              disabled={actionPending}
              className="btn-tenant"
            >
              {actionPending ? "Calcul…" : "Révéler la réponse"}
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
                : state.questionIndex + 1 >= QUIZ_QUESTIONS.length
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

        {/* Scoreboard live (top 5) */}
        {sortedPlayers.length > 0 && (
          <section className="mt-12">
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
    </main>
  );
}
