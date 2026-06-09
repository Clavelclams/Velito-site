/**
 * <HostPetitBacGame /> — Vue TV pendant une partie Petit Bac.
 *
 * Affiche :
 *  - Phase 'round'  : grosse lettre + 6 barres de progression (1/cat) avec
 *                     "X / Y joueurs ont rempli cette catégorie" + timer
 *  - Phase 'reveal' : grille des réponses (lignes = catégories, colonnes = joueurs)
 *  - Phase 'final'  : WinnerCelebration + scoreboard
 *
 * Realtime : subscribe petit_bac_answers + sessions + session_players.
 *
 * Auto-countdowns :
 *  - Timer round à 0 → revealPetitBacRoundAction
 *  - Timer reveal à 0 → nextPetitBacRoundAction
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
import LetterReveal from "./LetterReveal";
import MuteFooter from "./MuteFooter";
import {
  ROUND_DURATION_SEC,
  PETITBAC_REVEAL_DURATION_SEC,
  type PetitBacState,
} from "@/lib/games/petit-bac";
import {
  revealPetitBacRoundAction,
  nextPetitBacRoundAction,
  endPetitBacAction,
} from "./petitbac-actions";

interface SessionPlayer {
  id: string;
  pseudo: string;
  avatar_config: ReturnType<typeof parseAvatarConfig>;
  score: number;
}

interface PetitBacAnswer {
  id: string;
  player_id: string;
  round: number;
  category: string;
  word: string;
  is_valid: boolean;
  points: number;
}

interface HostPetitBacGameProps {
  sessionId: string;
  initialState: PetitBacState;
  status: string;
}

export default function HostPetitBacGame({
  sessionId,
  initialState,
  status: initialStatus,
}: HostPetitBacGameProps) {
  const router = useRouter();
  const [state, setState] = useState<PetitBacState>(initialState);
  const [status, setStatus] = useState(initialStatus);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [answers, setAnswers] = useState<PetitBacAnswer[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // SFX au changement de phase (similar à HostQuizGame)
  const prevPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    if (prev === curr) return;

    if (curr === "reveal" && prev === "round") {
      // Round terminé → son énergique
      playSfx(AUDIO.roundEnd, 0.5);
    } else if (curr === "round" && prev === "reveal") {
      // Nouveau round → whoosh transition
      playSfx(AUDIO.transition, 0.4);
    } else if (curr === "final") {
      playSfx(AUDIO.finalVictory, 0.6);
    }
    prevPhaseRef.current = curr;
  }, [state.phase]);

  // ─── Realtime : players + answers + session state ───
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
          .from("petit_bac_answers")
          .select("id, player_id, round, category, word, is_valid, points")
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
      setAnswers((aData ?? []) as PetitBacAnswer[]);
    }

    load();

    const channel = supabase
      .channel(`petitbac-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "interactive",
          table: "session_players",
          filter: `session_id=eq.${sessionId}`,
        },
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "interactive",
          table: "petit_bac_answers",
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
          const r = payload.new as { status: string; current_state: PetitBacState };
          setStatus(r.status);
          setState(r.current_state);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // ─── Timer round + auto-reveal ───
  useEffect(() => {
    if (state.phase !== "round" || !state.roundStartedAt) {
      setSecondsLeft(null);
      return;
    }
    const startedAt = new Date(state.roundStartedAt).getTime();
    const limit = state.roundDurationSec ?? ROUND_DURATION_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        revealPetitBacRoundAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.roundStartedAt, state.roundDurationSec, sessionId, actionPending]);

  // ─── Timer reveal + auto-next ───
  useEffect(() => {
    if (state.phase !== "reveal" || !state.revealStartedAt) return;
    const startedAt = new Date(state.revealStartedAt).getTime();
    const limit = state.revealDurationSec ?? PETITBAC_REVEAL_DURATION_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        nextPetitBacRoundAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.revealStartedAt, state.revealDurationSec, sessionId, actionPending]);

  const currentAnswers = useMemo(
    () => answers.filter((a) => a.round === state.round),
    [answers, state.round]
  );

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  /**
   * Compteur par catégorie : combien de joueurs ont saisi un mot non-vide
   * (peu importe si valide ou pas — l'objectif c'est de montrer la progression
   * en live au host pour qu'il voit l'engagement)
   */
  const filledByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of state.categories) {
      const count = currentAnswers.filter(
        (a) => a.category === cat && a.word.trim().length > 0
      ).length;
      map.set(cat, count);
    }
    return map;
  }, [currentAnswers, state.categories]);

  async function handleReveal() {
    setActionPending(true);
    await revealPetitBacRoundAction(sessionId);
    setActionPending(false);
  }

  async function handleNext() {
    setActionPending(true);
    await nextPetitBacRoundAction(sessionId);
    setActionPending(false);
  }

  async function handleEnd() {
    if (!confirm("Terminer la partie maintenant ?")) return;
    setActionPending(true);
    await endPetitBacAction(sessionId);
    setActionPending(false);
  }

  // ═══════════════════ Phase FINAL ═══════════════════
  if (state.phase === "final" || status === "ended") {
    const winner = sortedPlayers[0];
    return (
      <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-10">
        <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-30" />
        <div className="relative mx-auto w-full max-w-7xl">
          <header className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Velito Interactive · PETIT BAC
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
                  subtitle={`${state.totalRounds} rounds`}
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
        <MuteFooter />
      </main>
    );
  }

  // ═══════════════════ Phase ROUND ou REVEAL ═══════════════════
  const showReveal = state.phase === "reveal";

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl" />

      <div className="relative w-full max-w-6xl">
        {/* Header : round + lettre + timer + mute */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Round {state.round} / {state.totalRounds}
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-300">
              {showReveal ? "Révélation" : "À toi de jouer"}
            </p>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-4">
            {secondsLeft !== null && (
              <div
                className={
                  "rounded-2xl border px-6 py-3 text-center transition " +
                  (showReveal
                    ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                    : secondsLeft <= 10
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
          </div>
        </header>

        {/* Lettre énorme au centre */}
        <div className="mt-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            La lettre du round
          </p>
          <div className="mt-2 flex items-center justify-center">
            {/* Animation roulette : défile + ralentit + s'arrête sur state.letter
                roundKey = state.round → relance l'animation à chaque nouveau round */}
            <LetterReveal targetLetter={state.letter} roundKey={state.round} />
          </div>
        </div>

        {/* Phase ROUND — barres de progression par catégorie */}
        {!showReveal && (
          <section className="mt-10">
            <p className="mb-4 text-center text-xs uppercase tracking-[0.3em] text-white/40">
              Progression des joueurs
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.categories.map((cat) => {
                const filled = filledByCategory.get(cat) ?? 0;
                const total = players.length || 1;
                const ratio = (filled / total) * 100;
                return (
                  <div
                    key={cat}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-semibold text-white">{cat}</p>
                      <p className="text-xs text-white/50 tabular-nums">
                        <span className="font-bold text-amber-300">{filled}</span>
                        {" / "}
                        {total}
                      </p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Phase REVEAL — grille réponses */}
        {showReveal && (
          <section className="mt-10 overflow-x-auto">
            <p className="mb-4 text-center text-xs uppercase tracking-[0.3em] text-white/40">
              Les réponses
            </p>
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-white/10 bg-ink p-3 text-left text-xs uppercase tracking-wider text-white/40">
                    Catégorie
                  </th>
                  {players.map((p) => (
                    <th
                      key={p.id}
                      className="border-b border-white/10 p-3 text-center text-xs"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Avatar config={p.avatar_config} size="xs" />
                        <span className="font-medium text-white/80">{p.pseudo}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.categories.map((cat) => (
                  <tr key={cat}>
                    <td className="sticky left-0 z-10 border-b border-white/[0.06] bg-ink p-3 font-semibold text-white/80">
                      {cat}
                    </td>
                    {players.map((p) => {
                      const ans = currentAnswers.find(
                        (a) => a.player_id === p.id && a.category === cat
                      );
                      const word = ans?.word.trim() || "—";
                      const valid = ans?.is_valid ?? false;
                      return (
                        <td
                          key={p.id}
                          className={
                            "border-b border-white/[0.06] p-3 text-center " +
                            (valid
                              ? "bg-emerald-500/10 font-semibold text-emerald-200"
                              : word === "—"
                              ? "text-white/30"
                              : "text-red-300/70 line-through")
                          }
                        >
                          {word}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Boutons host */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
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
                : "Round suivant"}
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
      <MuteFooter />
    </main>
  );
}
