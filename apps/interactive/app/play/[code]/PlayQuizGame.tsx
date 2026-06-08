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
  QUESTION_TIME_LIMIT_SEC,
  REVEAL_DURATION_SEC,
} from "@/lib/games/quiz-questions";

interface SessionState {
  phase: "choose_game" | "question" | "reveal" | "final";
  questionIndex: number;
  questionStartedAt?: string;
  revealStartedAt?: string;
  timeLimitSec?: number;
  revealDurationSec?: number;
}

interface MyAnswer {
  id: string;
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
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Compteur côté joueur : question OU reveal selon la phase
  useEffect(() => {
    if (!state) return;
    let startedAt: number | null = null;
    let limit = 0;
    if (state.phase === "question" && state.questionStartedAt) {
      startedAt = new Date(state.questionStartedAt).getTime();
      limit = state.timeLimitSec ?? QUESTION_TIME_LIMIT_SEC;
    } else if (state.phase === "reveal" && state.revealStartedAt) {
      startedAt = new Date(state.revealStartedAt).getTime();
      limit = state.revealDurationSec ?? REVEAL_DURATION_SEC;
    } else {
      setSecondsLeft(null);
      return;
    }
    const start = startedAt;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setSecondsLeft(Math.max(0, Math.round((limit * 1000 - elapsed) / 1000)));
    }, 200);
    return () => clearInterval(interval);
  }, [state]);

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
          .select("id, question_index, answer, is_correct, points")
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

  /**
   * Toggle/change la réponse cochée.
   *
   * Mécanique :
   *  - 1er clic = INSERT (answered_at = NOW figé pour le scoring vitesse)
   *  - clics suivants = UPDATE seulement du champ 'answer'
   *  - le joueur peut changer tant que la phase est 'question' (la RLS bloque
   *    automatiquement les UPDATE après le reveal)
   *  - validation finale = au timer 0 côté host, qui scorera la dernière sélection
   *
   * Optimistic update : on bascule l'UI immédiatement avant le retour serveur.
   */
  async function handleSelectAnswer(choice: "A" | "B" | "C" | "D") {
    if (!state || submitting || state.phase !== "question") return;

    // Si déjà la même réponse cochée → no-op
    if (myAnswerForCurrent?.answer === choice) return;

    setSubmitting(true);
    setErrorMsg(null);

    const supabase = createClient();
    const existing = myAnswerForCurrent;

    // Optimistic update : on bascule l'UI immédiatement
    if (existing) {
      setMyAnswers((prev) =>
        prev.map((a) =>
          a.question_index === state.questionIndex ? { ...a, answer: choice } : a
        )
      );
    } else {
      setMyAnswers((prev) => [
        ...prev,
        {
          id: "optimistic",
          question_index: state.questionIndex,
          answer: choice,
          is_correct: false,
          points: 0,
        },
      ]);
    }

    if (existing && existing.id !== "optimistic") {
      // Changement d'avis → UPDATE
      const { error } = await supabase
        .schema("interactive" as never)
        .from("player_answers")
        .update({ answer: choice } as never)
        .eq("id", existing.id);

      if (error) {
        console.error("[PlayQuizGame] update answer error:", error.message);
        setErrorMsg("Impossible de changer ta réponse.");
        // Rollback optimistic
        setMyAnswers((prev) =>
          prev.map((a) =>
            a.id === existing.id ? { ...a, answer: existing.answer } : a
          )
        );
      }
    } else {
      // Premier clic → INSERT
      const { data, error } = await supabase
        .schema("interactive" as never)
        .from("player_answers")
        .insert({
          session_id: sessionId,
          player_id: playerId,
          question_index: state.questionIndex,
          answer: choice,
        } as never)
        .select("id")
        .single();

      if (error) {
        console.error("[PlayQuizGame] insert answer error:", error.message);
        setErrorMsg("Impossible d'envoyer ta réponse.");
        // Rollback : retire la ligne optimiste
        setMyAnswers((prev) =>
          prev.filter((a) => a.question_index !== state.questionIndex)
        );
      } else {
        // Remplace l'id optimistic par le vrai id
        const realId = (data as { id: string }).id;
        setMyAnswers((prev) =>
          prev.map((a) =>
            a.id === "optimistic" && a.question_index === state.questionIndex
              ? { ...a, id: realId }
              : a
          )
        );
      }
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

        {secondsLeft !== null ? (
          <p className="mt-6 text-xs uppercase tracking-widest text-amber-300">
            Suivant dans {secondsLeft}s
          </p>
        ) : (
          <p className="mt-6 text-[11px] italic text-white/40">
            En attente de la question suivante…
          </p>
        )}
      </div>
    );
  }

  // ═══════════════════ QUESTION — 4 boutons OU "en attente" si déjà voté ═══════════════════
  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Question {state.questionIndex + 1} / {QUIZ_QUESTIONS.length}
        </p>
        {secondsLeft !== null && (
          <span
            className={
              "rounded-full border px-3 py-1 font-display text-sm font-black tabular-nums " +
              (secondsLeft <= 5
                ? "border-red-400/60 bg-red-500/15 text-red-200"
                : "border-white/15 bg-white/[0.04] text-white")
            }
          >
            {secondsLeft}s
          </span>
        )}
      </div>

      <h1 className="mt-4 text-center text-xl font-bold leading-tight text-white sm:text-2xl">
        {currentQuestion.question}
      </h1>

      {/* 4 boutons toujours actifs — le joueur peut changer d'avis */}
      <div className="mt-6 grid grid-cols-1 gap-3">
        {(["A", "B", "C", "D"] as const).map((letter) => {
          const isSelected = myAnswerForCurrent?.answer === letter;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => handleSelectAnswer(letter)}
              disabled={submitting}
              className={
                "flex items-center gap-4 rounded-2xl border p-4 text-left transition disabled:opacity-50 " +
                (isSelected
                  ? "border-tenant bg-tenant/20 ring-2 ring-tenant shadow-[0_0_24px_-8px_var(--tenant)]"
                  : "border-white/15 bg-white/[0.04] hover:border-tenant/60 hover:bg-tenant/10")
              }
            >
              <span
                className={
                  "grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-2xl font-black transition " +
                  (isSelected
                    ? "bg-tenant text-[#04040e]"
                    : "bg-tenant/20 text-tenant")
                }
              >
                {letter}
              </span>
              <span className="flex-1 text-sm font-medium text-white">
                {currentQuestion.choices[letter]}
              </span>
              {isSelected && <span className="text-xl">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Indicateur de statut sous les boutons */}
      <p className="mt-4 text-center text-xs text-white/50">
        {myAnswerForCurrent
          ? `Réponse provisoire : ${myAnswerForCurrent.answer} · tu peux encore changer`
          : "Coche ta réponse — validation auto au décompte 0"}
      </p>

      {errorMsg && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-200">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
      