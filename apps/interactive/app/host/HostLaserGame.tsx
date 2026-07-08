/**
 * <HostLaserGame /> — Vue TV pendant une partie LASER.
 *
 * Phases :
 *  - 'aim'    : arène + zone active + décompte + compteur « N ont verrouillé ».
 *               On NE montre PAS les positions (secret jusqu'au reveal), juste
 *               le nombre de coups reçus (le host peut lire laser_moves via RLS).
 *  - 'reveal' : arène qui rejoue TOUS les lasers + avatars + éliminés, depuis
 *               current_state.lastResolution (calculé côté serveur).
 *  - 'final'  : WinnerCelebration du dernier survivant + scoreboard.
 *
 * Timers auto : fin de visée → révèle ; fin de reveal → manche suivante.
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
  AIM_DURATION_SEC,
  REVEAL_DURATION_SEC,
  type LaserState,
} from "@/lib/games/laser";
import {
  revealLaserRoundAction,
  nextLaserRoundAction,
  endLaserAction,
} from "./laser-actions";
import MuteFooter from "./MuteFooter";

interface SessionPlayer {
  id: string;
  pseudo: string;
  avatar_config: ReturnType<typeof parseAvatarConfig>;
  score: number;
  eliminated_round: number | null;
}

interface HostLaserGameProps {
  sessionId: string;
  initialState: LaserState;
  status: string;
}

const PLAYER_COLORS = [
  "#22d3ee", "#f43f5e", "#a78bfa", "#fbbf24",
  "#34d399", "#fb923c", "#ec4899", "#60a5fa",
];

export default function HostLaserGame({
  sessionId,
  initialState,
  status: initialStatus,
}: HostLaserGameProps) {
  const router = useRouter();
  const [state, setState] = useState<LaserState>(initialState);
  const [status, setStatus] = useState(initialStatus);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [lockedCount, setLockedCount] = useState(0);
  const [actionPending, setActionPending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // ─── Sons de transition ───
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const curr = state.phase;
    if (prev === curr) return;
    if (curr === "reveal") playSfx(AUDIO.revealExplain, 0.5);
    else if (curr === "aim" && prev === "reveal") playSfx(AUDIO.transition, 0.4);
    else if (curr === "final") playSfx(AUDIO.finalVictory, 0.6);
    prevPhaseRef.current = curr;
  }, [state.phase]);

  // ─── Realtime : joueurs + session + compteur de coups (phase aim) ───
  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: pData } = await supabase
        .schema("interactive" as never)
        .from("session_players")
        .select("id, pseudo, avatar_config, score, eliminated_round")
        .eq("session_id", sessionId);

      setPlayers(
        ((pData ?? []) as Array<{
          id: string; pseudo: string; avatar_config: unknown; score: number; eliminated_round: number | null;
        }>).map((r) => ({
          id: r.id,
          pseudo: r.pseudo,
          avatar_config: parseAvatarConfig(r.avatar_config),
          score: r.score,
          eliminated_round: r.eliminated_round,
        }))
      );
    }
    load();

    const channel = supabase
      .channel(`laser-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "session_players", filter: `session_id=eq.${sessionId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "laser_moves", filter: `session_id=eq.${sessionId}` },
        () => { /* recompte via effet dédié */ setLockedCount((c) => c) }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const r = payload.new as { status: string; current_state: LaserState };
          setStatus(r.status);
          setState(r.current_state);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // ─── Compteur de coups verrouillés pour la manche courante (phase aim) ───
  useEffect(() => {
    if (state.phase !== "aim") { setLockedCount(0); return; }
    const supabase = createClient();
    let cancelled = false;
    async function count() {
      const { count } = await supabase
        .schema("interactive" as never)
        .from("laser_moves")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .eq("round", state.round);
      if (!cancelled) setLockedCount(count ?? 0);
    }
    count();
    const iv = setInterval(count, 1000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [state.phase, state.round, sessionId]);

  // ─── Timer visée + auto-reveal ───
  useEffect(() => {
    if (state.phase !== "aim" || !state.aimStartedAt) { setSecondsLeft(null); return; }
    const startedAt = new Date(state.aimStartedAt).getTime();
    const limit = state.aimDurationSec ?? AIM_DURATION_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((limit * 1000 - (Date.now() - startedAt)) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        revealLaserRoundAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.aimStartedAt, state.aimDurationSec, sessionId, actionPending]);

  // ─── Timer reveal + auto-next ───
  useEffect(() => {
    if (state.phase !== "reveal" || !state.revealStartedAt) return;
    const startedAt = new Date(state.revealStartedAt).getTime();
    const limit = state.revealDurationSec ?? REVEAL_DURATION_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((limit * 1000 - (Date.now() - startedAt)) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        nextLaserRoundAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.revealStartedAt, state.revealDurationSec, sessionId, actionPending]);

  const alive = useMemo(() => players.filter((p) => p.eliminated_round === null), [players]);
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);
  const colorById = useMemo(() => {
    const m = new Map<string, string>();
    players.forEach((p, i) => m.set(p.id, PLAYER_COLORS[i % PLAYER_COLORS.length]!));
    return m;
  }, [players]);

  async function handleReveal() { setActionPending(true); await revealLaserRoundAction(sessionId); setActionPending(false); }
  async function handleNext() { setActionPending(true); await nextLaserRoundAction(sessionId); setActionPending(false); }
  async function handleEnd() {
    if (!confirm("Terminer la partie maintenant ?")) return;
    setActionPending(true); await endLaserAction(sessionId); setActionPending(false);
  }

  // ═══ FINAL ═══
  if (state.phase === "final" || status === "ended") {
    const winner = sortedPlayers[0];
    return (
      <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-10">
        <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-30" />
        <div className="relative mx-auto w-full max-w-7xl">
          <header className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Velito Interactive · LASER</p>
            <h2 className="neon-title mt-2 text-3xl">Dernier debout</h2>
          </header>
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
            <div className="flex items-start justify-center">
              {winner ? (
                <WinnerCelebration
                  pseudo={winner.pseudo}
                  avatar={winner.avatar_config}
                  score={winner.score}
                  subtitle="LASER · dernier survivant"
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

  const showReveal = state.phase === "reveal";
  const res = state.lastResolution;

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
      <div className="relative w-full max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Manche {state.round + 1}</p>
            <p className="mt-1 text-sm font-semibold text-emerald-300">
              {alive.length} joueur{alive.length > 1 ? "s" : ""} en lice
            </p>
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
              <p className="font-display text-4xl font-black tabular-nums">{secondsLeft}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/50">
                {showReveal ? "manche suivante" : "secondes"}
              </p>
            </div>
          )}
        </header>

        <h1 className="mb-4 text-center neon-title text-3xl sm:text-5xl">
          {showReveal ? "Feu !" : "Placez-vous… en secret"}
        </h1>

        {/* Arène */}
        <div className="mx-auto max-w-2xl">
          <svg
            viewBox="0 0 1 1"
            className="aspect-square w-full rounded-3xl border border-white/15 bg-white/[0.02]"
          >
            {/* Zone active */}
            <rect
              x={state.zone.min}
              y={state.zone.min}
              width={state.zone.max - state.zone.min}
              height={state.zone.max - state.zone.min}
              fill="rgba(16,185,129,0.06)"
              stroke="rgba(16,185,129,0.5)"
              strokeWidth={0.005}
            />
            {/* Reveal : lasers + positions + éliminés */}
            {showReveal && res && (
              <>
                {res.lasers.map((l) => (
                  <line
                    key={l.id}
                    x1={l.from.x} y1={l.from.y} x2={l.to.x} y2={l.to.y}
                    stroke={l.touche ? "#ef4444" : "rgba(239,68,68,0.35)"}
                    strokeWidth={0.008}
                    strokeLinecap="round"
                  />
                ))}
                {res.positions.map((p) => {
                  const elimine = res.eliminated.includes(p.playerId);
                  return (
                    <circle
                      key={p.playerId}
                      cx={p.x} cy={p.y} r={0.028}
                      fill={elimine ? "#7f1d1d" : "#fff"}
                      stroke={elimine ? "#ef4444" : (colorById.get(p.playerId) ?? "#fff")}
                      strokeWidth={0.009}
                    />
                  );
                })}
              </>
            )}
          </svg>
        </div>

        {/* Sous l'arène */}
        {!showReveal ? (
          <p className="mt-5 text-center text-sm text-white/60">
            <span className="font-bold text-emerald-300">{lockedCount}</span> / {alive.length} ont verrouillé leur tir
          </p>
        ) : (
          res && res.eliminated.length > 0 && (
            <p className="mt-5 text-center text-lg font-bold text-red-300">
              {res.eliminated.length} éliminé{res.eliminated.length > 1 ? "s" : ""} 💥
            </p>
          )
        )}

        {/* Boutons host */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {state.phase === "aim" && (
            <button type="button" onClick={handleReveal} disabled={actionPending} className="btn-tenant">
              {actionPending ? "Calcul…" : "Révéler les tirs"}
            </button>
          )}
          {state.phase === "reveal" && (
            <button type="button" onClick={handleNext} disabled={actionPending} className="btn-tenant">
              {actionPending ? "Suite…" : alive.length <= 1 ? "Voir le gagnant" : "Manche suivante"}
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

        {/* Joueurs en lice */}
        <section className="mt-8">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/40">En lice</p>
          <div className="flex flex-wrap justify-center gap-3">
            {players.map((p) => {
              const out = p.eliminated_round !== null;
              return (
                <div
                  key={p.id}
                  className={
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 " +
                    (out ? "border-white/10 bg-white/[0.02] opacity-40" : "border-emerald-400/40 bg-emerald-500/10")
                  }
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colorById.get(p.id) }} />
                  <Avatar config={p.avatar_config} size="xs" />
                  <span className={"text-sm " + (out ? "text-white/50 line-through" : "text-white")}>{p.pseudo}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <MuteFooter />
    </main>
  );
}
