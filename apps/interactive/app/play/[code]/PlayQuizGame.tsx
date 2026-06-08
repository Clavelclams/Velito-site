/**
 * <PlayQuizGame /> — Vue téléphone du joueur pendant une partie Quiz.
 *
 * Affiche, selon la phase du jeu (lue en Realtime depuis sessions.current_state) :
 *  - 'question' : 4 boutons A/B/C/D (cache après vote) + "En attente"
 *  - 'reveal'   : "Tu as eu juste ! +X" ou "Faux 😢" + score total
 *  - 'final'    : Récap personnel + bouton "Voir le classement final" (l'écran TV)
 *
 * Realtime :
 *  - Subscribe sur sessions UPDATE → bascule de phase
 *  - Subscribe sur ses propres player_answers UPDATE → quand le host fait reveal
 *    on récupère is_correct + points
 *  - Subscribe sur son session_player UPDATE → score cumulatif mis à jour
 */
"use client";

import { useEffect, useState, useMemo } from "react";
import { Avatar } from "@repo/ui/avatar";
import type { AvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import {
  QUIZ_QUESTIONS,
  type QuizQuestion,
} from "@/lib/games/quiz-questions";

interface SessionState {
  phase: "choose_game" | "question" | "reveal" | "final";
  questionIndex: number;
  questionStartedAt?: string;
  timeLimitSec?: number;
}

interface MyAnswer {
  question_index: number;
  answer: string;
  is_correct: boolean;
  points: number;
}

interface PlayQuizGameProps {
  sessionId: string;
  playerId: string;
  pseudo: string;
  avatar: AvatarConfig;
}

export default function PlayQuizGame({
  sessionId,
  playerId,
  pseudo,
  avatar,
}: PlayQuizGameProps) {
  const [state, setState] = useState<SessionState | null>(null);
  const [myAnswers, setMyAnswers] = useState<MyAnswer[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ─── Subscribe Realtime sur tout (session + answers + score) ───
  useEffect(() => {
    const supabase = createClient();

    async function loadAll() {
      const [sessionRes, ansRes, playerRes] = await Promise.all([
        supabase
          .schema("interactive" as never)
          .from("sessions")
          .select("current_state")
          .eq("id", sessionId)
          .single(),
        supabase
          .schema("interactive" as never)
          .from("player_answers")
          .select("question_index, answer, is_correct, points")
          .eq("player_id", playerId),
        supabase
          .schema("interactive" as never)
          .from("session_players")
          .select("score")
          .eq("id", playerId)
          .single(),
      ]);

      if (sessionRes.data) {
        setState((sessionRes.data as { current_state: SessionState }).current_state);
      }
      if (ansRes.data) {
        setMyAnswers(ansRes.data as MyAnswer[]);
      }
      if (playerRes.data) {
        setMyScore((playerRes.data as { score: number }).score);
      }
    }
    loadAll();

    const channel = supabase
      .channel(`play-quiz-${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "interactive",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const r = payload.new as { current_state: SessionState };
          setState(r.current_state);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "interactive",
          table: "player_answers",
          filter: `player_id=eq.${playerId}`,
        },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "interactive",
          table: "session_players",
          filter: `id=eq.${playerId}`,
        },
        (payload) => {
          const r = payload.new as { score: number };
          setMyScore(r.score);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, playerId]);

  const currentQuestion: QuizQuestion | null = useMemo(() => {
    if (!state) return null;
    return QUIZ_QUESTIONS[state.questionIndex] ?? null;
  }, [state]);

  const myAnswerForCurrent = useMemo(() => {
    if (!state) return null;
    return myAnswers.find((a) => a.question_index === state.questionIndex) ?? null;
  }, [state, myAnswers]);

  async function handleSubmitAnswer(choice: "A" | "B" | "C" | "D") {
    if (!state || submitting || myAnswerForCurrent) return;
    setSubmitting(true);
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase
      .schema("interactive" as never)
      .from("player_answers")
      .insert({
        session_id: sessionId,
        player_id: playerId,
        question_index: state.questionIndex,
        answer: choice,
      } as never);

    if (error) {
      console.error("[PlayQuizGame] insert answer error:", error.message);
      setErrorMsg("Impossible d'envoyer ta réponse.");
    } else {
      // Refresh local pour bloquer les boutons (optimistic update)
      setMyAnswers((prev) => [
        ...prev,
        {
          question_index: state.questionIndex,
          answer: choice,
          is_correct: false,
          points: 0,
        },
      ]);
    }
    setSubmitting(false);
  }

  // ═══════════════════ Loading ═══════════════════
  if (!state) {
    return (
      <div className="w-full max-w-sm text-center text-white/40">
        Chargement de la partie…
      </div>
    );
  }

  // ═══════════════════ FINAL — récap perso ═══════════════════
  if (state.phase === "final") {
    const correctCount = myAnswers.filter((a) => a.is_correct).length;
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive · QUIZ
        </p>
        <h1 className="neon-title mt-3 text-3xl">Partie terminée</h1>

        <div className="mt-8 flex justify-center">
          <Avatar config={avatar} size="xl" />
        </div>

        <p className="mt-4 font-display text-xl font-bold text-white">{pseudo}</p>

        <div className="card-ink mt-8 p-6">
          <p className="text-xs uppercase tracking-widest text-white/40">Ton score</p>
          <p className="mt-2 font-display text-5xl font-black tabular-nums text-tenant">
            {myScore.toLocaleString("fr-FR")}
          </p>
          <p className="mt-3 text-sm text-white/60">
            <span className="font-bold text-emerald-300">{correctCount}</span> /{" "}
            {QUIZ_QUESTIONS.length} bonnes réponses
          </p>
        </div>

        <p className="mt-6 text-xs text-white/40">
          Regarde l&apos;écran TV pour voir le classement final 🏆
        </p>
      </div>
    );
  }

  // ═══════════════════ Pas de question (erreur) ═══════════════════
  if (!currentQuestion) {
    return (
      <div className="w-full max-w-sm text-center text-white/40">
        En attente du host…
      </div>
    );
  }

  // ═══════════════════ REVEAL — montre si juste ou faux ═══════════════════
  if (state.phase === "reveal") {
    const wasCorrect = myAnswerForCurrent?.is_correct ?? false;
    const points = myAnswerForCurrent?.points ?? 0;
    const answered = !!myAnswerForCurrent;

    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Question {state.questionIndex + 1} / {QUIZ_QUESTIONS.length}
        </p>

        <div
          className={
            "mt-6 rounded-3xl border p-8 transition " +
            (answered
              ? wasCorrect
                ? "border-emerald-400/60 bg-emerald-500/10"
                : "border-red-400/60 bg-red-500/10"
              : "border-white/10 bg-white/[0.03]")
          }
        >
          <p className="text-7xl">
            {answered ? (wasCorrect ? "✅" : "❌") : "⏰"}
          </p>
          <h2 className="neon-title mt-4 text-3xl">
            {answered ? (wasCorrect ? "Bien joué !" : "Raté") : "Trop tard"}
          </h2>
          {answered && wasCorrect && (
            <p className="mt-3 font-display text-3xl font-black text-emerald-300">
              +{points} pts
            </p>
          )}
          <p className="mt-4 text-sm text-white/70">
            Bonne réponse :{" "}
            <span className="font-bold text-white">
              {currentQuestion.correct} · {currentQuestion.choices[currentQuestion.correct]}
            </span>
          </p>
        </div>

        <p className="mt-6 text-xs uppercase tracking-widest text-white/50">
          Ton score total
        </p>
        <p className="font-display text-3xl font-black tabular-nums text-tenant">
          {myScore.toLocaleString("fr-FR")}
        </p>

        <p className="mt-6 text-[11px] italic text-white/40">
          En attente de la question suivante…
        </p>
      </div>
    );
  }

  // ═══════════════════ QUESTION — 4 boutons OU "en attente" si déjà voté ═══════════════════
  return (
    <div className="w-full max-w-sm">
      <p className="text-center text-xs uppercase tracking-[0.3em] text-white/40">
        Question {state.questionIndex + 1} / {QUIZ_QUESTIONS.length}
      </p>

      <h1 className="mt-4 text-center text-xl font-bold leading-tight text-white sm:text-2xl">
        {currentQuestion.question}
      </h1>

      {/* Si déjà répondu → écran "en attente" */}
      {myAnswerForCurrent ? (
        <div className="card-ink mt-8 p-6 text-center">
          <p className="text-5xl">⏳</p>
          <p className="mt-3 text-sm text-white/70">
            Ta réponse <span className="font-bold text-white">{myAnswerForCurrent.answer}</span>{" "}
            est envoyée.
          </p>
          <p className="mt-1 text-xs text-white/40">
            En attente des autres joueurs et du host…
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3">
          {(["A", "B", "C", "D"] as const).map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => handleSubmitAnswer(letter)}
              disabled={submitting}
              className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4 text-left transition hover:border-tenant hover:bg-tenant/10 disabled:opacity-50"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-tenant/20 font-display text-2xl font-black text-tenant">
                {letter}
              </span>
              <span className="flex-1 text-sm font-medium text-white">
                {currentQuestion.choices[letter]}
              </span>
            </button>
          ))}
        </div>
      )}

      {errorMsg && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-200">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
