/**
 * <PlayBlindTestGame /> — Vue téléphone du joueur pendant Blind Test.
 * Pattern identique au Quiz : cocher/changeable jusqu'au timer 0.
 */
"use client";

import { useEffect, useState, useMemo } from "react";
import { Avatar } from "@repo/ui/avatar";
import type { AvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import {
  BLINDTEST_QUESTION_TIME_LIMIT_SEC,
  BLINDTEST_REVEAL_DURATION_SEC,
  type BlindTestState,
} from "@/lib/games/blindtest";
import NextSessionInput from "./NextSessionInput";

interface MyAnswer {
  id: string;
  round_index: number;
  answer: string;
  is_correct: boolean;
  points: number;
}

interface PlayBlindTestGameProps {
  sessionId: string;
  playerId: string;
  pseudo: string;
  avatar: AvatarConfig;
}

export default function PlayBlindTestGame({
  sessionId,
  playerId,
  pseudo,
  avatar,
}: PlayBlindTestGameProps) {
  const [state, setState] = useState<BlindTestState | null>(null);
  const [myAnswers, setMyAnswers] = useState<MyAnswer[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Timer
  useEffect(() => {
    if (!state) return;
    let startedAt: number | null = null;
    let limit = 0;
    if (state.phase === "question" && state.questionStartedAt) {
      startedAt = new Date(state.questionStartedAt).getTime();
      limit = state.timeLimitSec ?? BLINDTEST_QUESTION_TIME_LIMIT_SEC;
    } else if (state.phase === "reveal" && state.revealStartedAt) {
      startedAt = new Date(state.revealStartedAt).getTime();
      limit = state.revealDurationSec ?? BLINDTEST_REVEAL_DURATION_SEC;
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

  // Realtime
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
          .from("blindtest_answers")
          .select("id, round_index, answer, is_correct, points")
          .eq("player_id", playerId),
        supabase
          .schema("interactive" as never)
          .from("session_players")
          .select("score")
          .eq("id", playerId)
          .single(),
      ]);

      if (sessionRes.data) {
        setState((sessionRes.data as { current_state: BlindTestState }).current_state);
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
      .channel(`play-bt-${playerId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const r = payload.new as { current_state: BlindTestState };
          setState(r.current_state);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "blindtest_answers", filter: `player_id=eq.${playerId}` },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "interactive", table: "session_players", filter: `id=eq.${playerId}` },
        (payload) => setMyScore((payload.new as { score: number }).score)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, playerId]);

  const currentRound = useMemo(
    () => (state ? state.rounds[state.roundIndex] ?? null : null),
    [state]
  );

  const myAnswerForCurrent = useMemo(
    () => myAnswers.find((a) => a.round_index === state?.roundIndex) ?? null,
    [myAnswers, state?.roundIndex]
  );

  async function handleSelect(letter: "A" | "B" | "C" | "D") {
    if (!state || submitting || state.phase !== "question") return;
    if (myAnswerForCurrent?.answer === letter) return;

    setSubmitting(true);
    setErrorMsg(null);

    const supabase = createClient();
    const existing = myAnswerForCurrent;

    // Optimistic
    if (existing) {
      setMyAnswers((prev) =>
        prev.map((a) =>
          a.round_index === state.roundIndex ? { ...a, answer: letter } : a
        )
      );
    } else {
      setMyAnswers((prev) => [
        ...prev,
        {
          id: "optimistic",
          round_index: state.roundIndex,
          answer: letter,
          is_correct: false,
          points: 0,
        },
      ]);
    }

    if (existing && existing.id !== "optimistic") {
      const { error } = await supabase
        .schema("interactive" as never)
        .from("blindtest_answers")
        .update({ answer: letter } as never)
        .eq("id", existing.id);
      if (error) {
        setErrorMsg("Impossible de changer ta réponse.");
        setMyAnswers((prev) =>
          prev.map((a) =>
            a.id === existing.id ? { ...a, answer: existing.answer } : a
          )
        );
      }
    } else {
      const { data, error } = await supabase
        .schema("interactive" as never)
        .from("blindtest_answers")
        .insert({
          session_id: sessionId,
          player_id: playerId,
          round_index: state.roundIndex,
          answer: letter,
        } as never)
        .select("id")
        .single();
      if (error) {
        setErrorMsg("Impossible d'envoyer ta réponse.");
        setMyAnswers((prev) =>
          prev.filter((a) => a.round_index !== state.roundIndex)
        );
      } else {
        const realId = (data as { id: string }).id;
        setMyAnswers((prev) =>
          prev.map((a) =>
            a.id === "optimistic" && a.round_index === state.roundIndex
              ? { ...a, id: realId }
              : a
          )
        );
      }
    }
    setSubmitting(false);
  }

  if (!state) {
    return (
      <div className="w-full max-w-sm text-center text-white/40">
        Chargement…
      </div>
    );
  }

  // FINAL
  if (state.phase === "final") {
    const correctCount = myAnswers.filter((a) => a.is_correct).length;
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive · BLIND TEST
        </p>
        <h1 className="neon-title mt-3 text-3xl">Partie terminée</h1>

        <div className="mt-8 flex justify-center">
          <Avatar config={avatar} size="xl" />
        </div>
        <p className="mt-4 font-display text-xl font-bold text-white">{pseudo}</p>

        <div className="card-ink mt-8 p-6">
          <p className="text-xs uppercase tracking-widest text-white/40">Ton score</p>
          <p className="mt-2 font-display text-5xl font-black tabular-nums text-cyan-300">
            {myScore.toLocaleString("fr-FR")}
          </p>
          <p className="mt-3 text-sm text-white/60">
            <span className="font-bold text-emerald-300">{correctCount}</span> /{" "}
            {state.totalRounds} bonnes réponses
          </p>
        </div>

        <p className="mt-6 text-xs text-white/40">
          Regarde l&apos;écran TV pour voir le classement final 🏆
        </p>

        <NextSessionInput />
      </div>
    );
  }

  if (!currentRound) return null;

  // REVEAL
  if (state.phase === "reveal") {
    const wasCorrect = myAnswerForCurrent?.is_correct ?? false;
    const points = myAnswerForCurrent?.points ?? 0;
    const answered = !!myAnswerForCurrent;

    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Question {state.roundIndex + 1} / {state.totalRounds}
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
            C&apos;était :{" "}
            <span className="font-bold text-white">
              {currentRound.track.correctLabel}
            </span>
          </p>
        </div>

        <p className="mt-6 text-xs uppercase tracking-widest text-white/50">Score total</p>
        <p className="font-display text-3xl font-black tabular-nums text-cyan-300">
          {myScore.toLocaleString("fr-FR")}
        </p>

        {secondsLeft !== null && (
          <p className="mt-4 text-xs uppercase tracking-widest text-amber-300">
            Suivant dans {secondsLeft}s
          </p>
        )}
      </div>
    );
  }

  // QUESTION — 4 boutons
  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Question {state.roundIndex + 1} / {state.totalRounds}
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

      <h1 className="mt-4 text-center text-xl font-bold leading-tight text-white">
        Quel est ce morceau ?
      </h1>
      <p className="mt-1 text-center text-[11px] italic text-white/40">
        🎧 Écoute la TV
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3">
        {currentRound.options.map((label, i) => {
          const letter = "ABCD"[i] as "A" | "B" | "C" | "D";
          const isSelected = myAnswerForCurrent?.answer === letter;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => handleSelect(letter)}
              disabled={submitting}
              className={
                "flex items-center gap-4 rounded-2xl border p-4 text-left transition disabled:opacity-50 " +
                (isSelected
                  ? "border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-400 shadow-[0_0_24px_-8px_rgba(34,211,238,0.5)]"
                  : "border-white/15 bg-white/[0.04] hover:border-cyan-400/60 hover:bg-cyan-500/10")
              }
            >
              <span
                className={
                  "grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-2xl font-black transition " +
                  (isSelected
                    ? "bg-cyan-400 text-[#04040e]"
                    : "bg-cyan-500/20 text-cyan-300")
                }
              >
                {letter}
              </span>
              <span className="flex-1 text-sm font-medium text-white">
                {label}
              </span>
              {isSelected && <span className="text-xl">✓</span>}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-white/50">
        {myAnswerForCurrent
          ? `Réponse provisoire : ${myAnswerForCurrent.answer} · tu peux encore changer`
          : "Coche ton choix — validation auto au décompte 0"}
      </p>

      {errorMsg && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-200">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
