/**
 * <PlayPetitBacGame /> — Vue téléphone du joueur pendant une partie Petit Bac.
 *
 * Affiche, selon la phase :
 *  - 'round'  : Grosse lettre + 6 inputs (un par catégorie) + timer
 *               Saisie debounced 400ms → UPSERT en BDD (1 INSERT puis UPDATEs)
 *  - 'reveal' : Récap perso "Tu as fait X bonnes réponses, +Y pts"
 *  - 'final'  : Score total + bouton voir classement TV
 *
 * Pourquoi UPSERT debounce :
 *  - Si on UPSERT à chaque keystroke → spam DB
 *  - Debounce 400ms → 1 UPSERT max toutes les 400ms par catégorie
 *  - Côté TV, on voit la progression en ~1s max
 */
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Avatar } from "@repo/ui/avatar";
import type { AvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import {
  ROUND_DURATION_SEC,
  PETITBAC_REVEAL_DURATION_SEC,
  type PetitBacState,
} from "@/lib/games/petit-bac";

interface MyAnswer {
  id: string;
  round: number;
  category: string;
  word: string;
  is_valid: boolean;
  points: number;
}

interface PlayPetitBacGameProps {
  sessionId: string;
  playerId: string;
  pseudo: string;
  avatar: AvatarConfig;
}

const DEBOUNCE_MS = 400;

export default function PlayPetitBacGame({
  sessionId,
  playerId,
  pseudo,
  avatar,
}: PlayPetitBacGameProps) {
  const [state, setState] = useState<PetitBacState | null>(null);
  const [myAnswers, setMyAnswers] = useState<MyAnswer[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  /**
   * Saisies locales en cours — clé = category, valeur = texte tapé.
   * Séparé de myAnswers (qui vient de la BDD) pour ne pas être écrasé par
   * les Realtime updates pendant que l'user tape.
   */
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  /** Map category → timeout id, pour debounce. */
  const debounceTimers = useRef<Record<string, NodeJS.Timeout | null>>({});

  // ─── Timer ───
  useEffect(() => {
    if (!state) return;
    let startedAt: number | null = null;
    let limit = 0;
    if (state.phase === "round" && state.roundStartedAt) {
      startedAt = new Date(state.roundStartedAt).getTime();
      limit = state.roundDurationSec ?? ROUND_DURATION_SEC;
    } else if (state.phase === "reveal" && state.revealStartedAt) {
      startedAt = new Date(state.revealStartedAt).getTime();
      limit = state.revealDurationSec ?? PETITBAC_REVEAL_DURATION_SEC;
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

  // ─── Realtime : load + subscribe ───
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
          .from("petit_bac_answers")
          .select("id, round, category, word, is_valid, points")
          .eq("player_id", playerId),
        supabase
          .schema("interactive" as never)
          .from("session_players")
          .select("score")
          .eq("id", playerId)
          .single(),
      ]);

      if (sessionRes.data) {
        setState((sessionRes.data as { current_state: PetitBacState }).current_state);
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
      .channel(`play-petitbac-${playerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "interactive",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const r = payload.new as { current_state: PetitBacState };
          setState(r.current_state);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "interactive",
          table: "petit_bac_answers",
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

  // Reset drafts à chaque changement de round
  useEffect(() => {
    if (state?.phase === "round") {
      setDrafts({});
    }
  }, [state?.round, state?.phase]);

  const myAnswersThisRound = useMemo(
    () => myAnswers.filter((a) => a.round === state?.round),
    [myAnswers, state?.round]
  );

  /**
   * Sauvegarde un mot pour une catégorie : INSERT au 1er char, UPDATE ensuite.
   * Debounce 400ms par catégorie.
   */
  function saveWord(category: string, word: string) {
    if (!state) return;

    // Reset le timer existant pour cette catégorie
    const existingTimer = debounceTimers.current[category];
    if (existingTimer) clearTimeout(existingTimer);

    debounceTimers.current[category] = setTimeout(async () => {
      const supabase = createClient();
      const existing = myAnswers.find(
        (a) => a.round === state.round && a.category === category
      );

      if (existing) {
        // UPDATE
        await supabase
          .schema("interactive" as never)
          .from("petit_bac_answers")
          .update({ word } as never)
          .eq("id", existing.id);
      } else {
        // INSERT
        await supabase
          .schema("interactive" as never)
          .from("petit_bac_answers")
          .insert({
            session_id: sessionId,
            player_id: playerId,
            round: state.round,
            category,
            word,
          } as never);
      }
    }, DEBOUNCE_MS);
  }

  function handleInputChange(category: string, value: string) {
    setDrafts((prev) => ({ ...prev, [category]: value }));
    saveWord(category, value);
  }

  // ═══════════════════ Loading ═══════════════════
  if (!state) {
    return (
      <div className="w-full max-w-sm text-center text-white/40">
        Chargement…
      </div>
    );
  }

  // ═══════════════════ FINAL ═══════════════════
  if (state.phase === "final") {
    const validCount = myAnswers.filter((a) => a.is_valid).length;
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive · PETIT BAC
        </p>
        <h1 className="neon-title mt-3 text-3xl">Partie terminée</h1>

        <div className="mt-8 flex justify-center">
          <Avatar config={avatar} size="xl" />
        </div>
        <p className="mt-4 font-display text-xl font-bold text-white">{pseudo}</p>

        <div className="card-ink mt-8 p-6">
          <p className="text-xs uppercase tracking-widest text-white/40">Ton score</p>
          <p className="mt-2 font-display text-5xl font-black tabular-nums text-amber-300">
            {myScore.toLocaleString("fr-FR")}
          </p>
          <p className="mt-3 text-sm text-white/60">
            <span className="font-bold text-emerald-300">{validCount}</span> mots
            valides sur {state.totalRounds * state.categories.length}
          </p>
        </div>

        <p className="mt-6 text-xs text-white/40">
          Regarde l&apos;écran TV pour voir le classement final 🏆
        </p>
      </div>
    );
  }

  // ═══════════════════ REVEAL — récap perso du round ═══════════════════
  if (state.phase === "reveal") {
    const validThisRound = myAnswersThisRound.filter((a) => a.is_valid).length;
    const pointsThisRound = myAnswersThisRound.reduce((s, a) => s + a.points, 0);

    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Round {state.round} / {state.totalRounds} — Lettre {state.letter}
        </p>

        <div className="mt-6 rounded-3xl border border-amber-400/40 bg-amber-500/10 p-6">
          <p className="text-5xl">📝</p>
          <h2 className="neon-title mt-3 text-2xl">Round terminé</h2>
          <p className="mt-3 font-display text-3xl font-black text-emerald-300">
            +{pointsThisRound} pts
          </p>
          <p className="mt-2 text-sm text-white/70">
            <span className="font-bold text-emerald-300">{validThisRound}</span>{" "}
            / {state.categories.length} mots valides
          </p>
        </div>

        {/* Détail catégories */}
        <div className="card-ink mt-6 space-y-2 p-4 text-left">
          {state.categories.map((cat) => {
            const ans = myAnswersThisRound.find((a) => a.category === cat);
            const word = ans?.word.trim() || "—";
            return (
              <div
                key={cat}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-white/50">{cat}</span>
                <span
                  className={
                    ans?.is_valid
                      ? "font-semibold text-emerald-300"
                      : word === "—"
                      ? "text-white/30"
                      : "text-red-300/70 line-through"
                  }
                >
                  {word}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-xs uppercase tracking-widest text-white/50">
          Score total
        </p>
        <p className="font-display text-3xl font-black tabular-nums text-amber-300">
          {myScore.toLocaleString("fr-FR")}
        </p>

        {secondsLeft !== null && (
          <p className="mt-4 text-xs uppercase tracking-widest text-amber-300">
            Round suivant dans {secondsLeft}s
          </p>
        )}
      </div>
    );
  }

  // ═══════════════════ ROUND — saisie ═══════════════════
  const filledCount = state.categories.filter((cat) => {
    const local = drafts[cat] ?? "";
    const remote =
      myAnswersThisRound.find((a) => a.category === cat)?.word ?? "";
    return (local || remote).trim().length > 0;
  }).length;

  return (
    <div className="w-full max-w-md">
      {/* Header : round + lettre + timer */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Round {state.round} / {state.totalRounds}
        </p>
        {secondsLeft !== null && (
          <span
            className={
              "rounded-full border px-3 py-1 font-display text-sm font-black tabular-nums " +
              (secondsLeft <= 10
                ? "border-red-400/60 bg-red-500/15 text-red-200"
                : "border-white/15 bg-white/[0.04] text-white")
            }
          >
            {secondsLeft}s
          </span>
        )}
      </div>

      {/* Grosse lettre */}
      <div className="mt-4 text-center">
        <p className="text-xs uppercase tracking-widest text-white/40">
          Lettre
        </p>
        <p className="font-display text-8xl font-black leading-none text-amber-300 drop-shadow-[0_0_30px_rgba(252,211,77,0.4)]">
          {state.letter}
        </p>
      </div>

      {/* Inputs catégories */}
      <div className="mt-6 space-y-3">
        {state.categories.map((cat) => {
          const remoteWord =
            myAnswersThisRound.find((a) => a.category === cat)?.word ?? "";
          const value = drafts[cat] ?? remoteWord;
          return (
            <div key={cat}>
              <label
                htmlFor={`cat-${cat}`}
                className="mb-1 block text-xs uppercase tracking-widest text-white/50"
              >
                {cat}
              </label>
              <input
                id={`cat-${cat}`}
                type="text"
                value={value}
                onChange={(e) => handleInputChange(cat, e.target.value.slice(0, 40))}
                placeholder={`Un ${cat.toLowerCase()} en ${state.letter}…`}
                maxLength={40}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white placeholder-white/30 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              />
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-white/50">
        <span className="font-bold text-amber-300">{filledCount}</span> /{" "}
        {state.categories.length} catégorie{state.categories.length > 1 ? "s" : ""}{" "}
        remplie{filledCount > 1 ? "s" : ""}
      </p>
      <p className="mt-1 text-center text-[11px] italic text-white/40">
        Tu peux modifier jusqu&apos;à la fin du round
      </p>
    </div>
  );
}
