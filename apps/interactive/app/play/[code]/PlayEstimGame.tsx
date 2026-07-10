/**
 * <PlayEstimGame /> — Vue téléphone du joueur pendant une partie Estim'.
 *
 * Phases :
 *  - 'round'  : question + input nombre + bouton "Valider" (UPSERT)
 *  - 'reveal' : récap perso (sa guess, la vraie réponse, son rang, +points)
 *  - 'final'  : score total + bouton voir classement TV
 */
"use client";

import { useEffect, useState, useMemo } from "react";
import { Avatar } from "@repo/ui/avatar";
import type { AvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import {
  ESTIM_QUESTIONS,
  ESTIM_ROUND_DURATION_SEC,
  ESTIM_REVEAL_DURATION_SEC,
  type EstimState,
} from "@/lib/games/estim";
import NextSessionInput from "./NextSessionInput";
import EstimImage from "../../host/EstimImage";

interface MyEstim {
  id: string;
  round: number;
  guess: number;
  diff_absolute: number;
  diff_percent: number;
  points: number;
  rank: number;
}

interface PlayEstimGameProps {
  sessionId: string;
  playerId: string;
  pseudo: string;
  avatar: AvatarConfig;
}

export default function PlayEstimGame({
  sessionId,
  playerId,
  pseudo,
  avatar,
}: PlayEstimGameProps) {
  const [state, setState] = useState<EstimState | null>(null);
  const [myAnswers, setMyAnswers] = useState<MyEstim[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Timer
  useEffect(() => {
    if (!state) return;
    let startedAt: number | null = null;
    let limit = 0;
    if (state.phase === "round" && state.roundStartedAt) {
      startedAt = new Date(state.roundStartedAt).getTime();
      limit = state.roundDurationSec ?? ESTIM_ROUND_DURATION_SEC;
    } else if (state.phase === "reveal" && state.revealStartedAt) {
      startedAt = new Date(state.revealStartedAt).getTime();
      limit = state.revealDurationSec ?? ESTIM_REVEAL_DURATION_SEC;
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

  // Realtime + load
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
          .from("estim_answers")
          .select("id, round, guess, diff_absolute, diff_percent, points, rank")
          .eq("player_id", playerId),
        supabase
          .schema("interactive" as never)
          .from("session_players")
          .select("score")
          .eq("id", playerId)
          .single(),
      ]);

      if (sessionRes.data) {
        setState((sessionRes.data as { current_state: EstimState }).current_state);
      }
      if (ansRes.data) {
        setMyAnswers(ansRes.data as MyEstim[]);
      }
      if (playerRes.data) {
        setMyScore((playerRes.data as { score: number }).score);
      }
    }
    loadAll();

    const channel = supabase
      .channel(`play-estim-${playerId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const r = payload.new as { current_state: EstimState };
          setState(r.current_state);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "estim_answers", filter: `player_id=eq.${playerId}` },
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

  // Reset draft à chaque changement de round
  useEffect(() => {
    if (state?.phase === "round") setDraft("");
  }, [state?.round, state?.phase]);

  const myAnswerForCurrent = useMemo(
    () => myAnswers.find((a) => a.round === state?.round) ?? null,
    [myAnswers, state?.round]
  );

  const currentQuestion = useMemo(
    () => (state ? ESTIM_QUESTIONS.find((q) => q.id === state.questionId) : null),
    [state]
  );

  async function handleSubmit() {
    if (!state || submitting) return;
    setErrorMsg(null);

    const value = Number(draft.replace(/[^\d.-]/g, ""));
    if (isNaN(value)) {
      setErrorMsg("Tape un nombre valide");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const existing = myAnswerForCurrent;

    if (existing) {
      const { error } = await supabase
        .schema("interactive" as never)
        .from("estim_answers")
        .update({ guess: value } as never)
        .eq("id", existing.id);
      if (error) {
        console.error("[PlayEstim] update error:", error.message);
        setErrorMsg("Impossible de changer ton estimation.");
      }
    } else {
      const { error } = await supabase
        .schema("interactive" as never)
        .from("estim_answers")
        .insert({
          session_id: sessionId,
          player_id: playerId,
          round: state.round,
          guess: value,
        } as never);
      if (error) {
        console.error("[PlayEstim] insert error:", error.message);
        setErrorMsg("Impossible d'envoyer ton estimation.");
      }
    }
    setSubmitting(false);
  }

  // ═══ Loading ═══
  if (!state) {
    return (
      <div className="w-full max-w-sm text-center text-white/40">
        Chargement…
      </div>
    );
  }

  // ═══ FINAL ═══
  if (state.phase === "final") {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive · HOW MUCH?!
        </p>
        <h1 className="neon-title mt-3 text-3xl">Partie terminée</h1>

        <div className="mt-8 flex justify-center">
          <Avatar config={avatar} size="xl" />
        </div>
        <p className="mt-4 font-display text-xl font-bold text-white">{pseudo}</p>

        <div className="card-ink mt-8 p-6">
          <p className="text-xs uppercase tracking-widest text-white/40">Ton score</p>
          <p className="mt-2 font-display text-5xl font-black tabular-nums text-pink-300">
            {myScore.toLocaleString("fr-FR")}
          </p>
        </div>

        <p className="mt-6 text-xs text-white/40">
          Regarde l&apos;écran TV pour voir le classement final 🏆
        </p>

        <NextSessionInput />
      </div>
    );
  }

  // ═══ REVEAL ═══
  if (state.phase === "reveal" && currentQuestion && myAnswerForCurrent) {
    const a = myAnswerForCurrent;
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Question {state.round} / {state.totalRounds}
        </p>

        <div
          className={
            "card-ink mt-6 p-6 text-center " +
            (currentQuestion.joke ? "border-amber-400/40 bg-amber-500/5" : "")
          }
        >
          <p className="text-xs uppercase tracking-widest text-white/40">
            {currentQuestion.joke ? "La vraie réponse" : "Le vrai prix"}
          </p>
          {currentQuestion.joke ? (
            <>
              <p className="mt-2 font-display text-4xl font-black tracking-wider text-amber-300">
                INESTIMABLE
              </p>
              <p className="mt-1 text-xs italic text-white/60">
                +50 pts pour tout le monde 🎁
              </p>
            </>
          ) : (
            <p className="mt-2 font-display text-4xl font-black tabular-nums text-pink-300">
              {currentQuestion.priceEur.toLocaleString("fr-FR")} €
            </p>
          )}
          <p className="mt-1 text-sm text-white/70">{currentQuestion.label}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-widest text-white/40">Ton estimation</p>
            <p className="mt-1 font-display text-xl font-black tabular-nums text-white">
              {Number(a.guess).toLocaleString("fr-FR")} €
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-widest text-white/40">Écart</p>
            <p className="mt-1 font-display text-xl font-black tabular-nums text-amber-300">
              {Number(a.diff_percent).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-widest text-emerald-300">
            Rang : {a.rank}
            {a.rank === 1 ? " 🥇" : a.rank === 2 ? " 🥈" : a.rank === 3 ? " 🥉" : ""}
          </p>
          <p className="mt-1 font-display text-2xl font-black text-emerald-300">
            +{a.points} pts
          </p>
        </div>

        <p className="mt-6 text-xs uppercase tracking-widest text-white/50">Score total</p>
        <p className="font-display text-3xl font-black tabular-nums text-pink-300">
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

  // ═══ ROUND ═══
  if (!currentQuestion) return null;

  const displayDraft = draft || (myAnswerForCurrent ? String(myAnswerForCurrent.guess) : "");

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Question {state.round} / {state.totalRounds}
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

      <div className="mt-3">
        <EstimImage
          src={currentQuestion.image}
          emoji={currentQuestion.emoji}
          label={currentQuestion.label}
          className="h-44 w-full"
        />
      </div>

      <p className="mt-3 text-center text-xs uppercase tracking-widest text-white/40">
        Combien ça vaut ?
      </p>
      <h1 className="mt-1 text-center text-lg font-bold leading-tight text-white">
        {currentQuestion.label}
      </h1>
      {currentQuestion.hint && (
        <p className="mt-1 text-center text-[11px] italic text-white/40">
          {currentQuestion.hint}
        </p>
      )}

      <div className="card-ink mt-4 p-5">
        <label
          htmlFor="estim-guess"
          className="mb-2 block text-xs uppercase tracking-widest text-white/50"
        >
          Ton estimation (en €)
        </label>
        <input
          id="estim-guess"
          type="number"
          inputMode="numeric"
          autoComplete="off"
          value={draft || displayDraft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tape ton prix…"
          className="w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-center font-display text-3xl font-black tabular-nums text-white placeholder-white/20 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30"
        />
        <p className="mt-1 text-center text-xs text-white/40">€</p>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || draft.trim().length === 0}
          className="btn-tenant mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? "Envoi…"
            : myAnswerForCurrent
            ? "Mettre à jour"
            : "Valider"}
        </button>

        {errorMsg && (
          <p className="mt-3 text-center text-xs text-red-300">{errorMsg}</p>
        )}
      </div>

      {myAnswerForCurrent && (
        <p className="mt-4 text-center text-xs text-white/50">
          Estimation envoyée :{" "}
          <span className="font-bold text-pink-300">
            {Number(myAnswerForCurrent.guess).toLocaleString("fr-FR")} €
          </span>{" "}
          · tu peux encore changer
        </p>
      )}
    </div>
  );
}
