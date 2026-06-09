/**
 * <HostGeoGame /> — Vue TV pendant une partie Géo.
 *
 * Phases :
 *  - 'round'  : grande carte + cible + compteur "X/Y ont pinned"
 *  - 'reveal' : grande carte avec vraie cible (vert) + pins de tous les joueurs
 *               (couleurs par avatar) + podium des plus proches
 *  - 'final'  : WinnerCelebration + scoreboard
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Avatar } from "@repo/ui/avatar";
import { ScoreboardRow } from "@repo/ui/scoreboard-row";
import { WinnerCelebration } from "@repo/ui/winner-celebration";
import { parseAvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import { playSfx, AUDIO } from "@/lib/audio";
import {
  GEO_TARGETS,
  GEO_ROUND_DURATION_SEC,
  GEO_REVEAL_DURATION_SEC,
  type GeoState,
} from "@/lib/games/geo";
import {
  revealGeoRoundAction,
  nextGeoRoundAction,
  endGeoAction,
} from "./geo-actions";
import MuteFooter from "./MuteFooter";

// Carte côté TV — même composant que côté joueur
const LeafletMap = dynamic(
  () => import("../play/[code]/LeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[60vh] w-full place-items-center rounded-2xl border border-white/15 bg-white/[0.02] text-sm text-white/40">
        Chargement de la carte…
      </div>
    ),
  }
);

interface SessionPlayer {
  id: string;
  pseudo: string;
  avatar_config: ReturnType<typeof parseAvatarConfig>;
  score: number;
}

interface GeoAnswer {
  id: string;
  player_id: string;
  round: number;
  guess_lat: number;
  guess_lng: number;
  distance_km: number;
  points: number;
  rank: number;
}

interface HostGeoGameProps {
  sessionId: string;
  initialState: GeoState;
  status: string;
}

// Couleurs pour distinguer les pins joueurs sur la carte de reveal
const PLAYER_COLORS = [
  "#22d3ee", "#f43f5e", "#a78bfa", "#fbbf24",
  "#34d399", "#fb923c", "#ec4899", "#60a5fa",
];

export default function HostGeoGame({
  sessionId,
  initialState,
  status: initialStatus,
}: HostGeoGameProps) {
  const router = useRouter();
  const [state, setState] = useState<GeoState>(initialState);
  const [status, setStatus] = useState(initialStatus);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [answers, setAnswers] = useState<GeoAnswer[]>([]);
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
          .from("geo_answers")
          .select("id, player_id, round, guess_lat, guess_lng, distance_km, points, rank")
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
      setAnswers((aData ?? []) as GeoAnswer[]);
    }
    load();
    const channel = supabase
      .channel(`geo-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "session_players", filter: `session_id=eq.${sessionId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "geo_answers", filter: `session_id=eq.${sessionId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const r = payload.new as { status: string; current_state: GeoState };
          setStatus(r.status);
          setState(r.current_state);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Timer round + auto-reveal
  useEffect(() => {
    if (state.phase !== "round" || !state.roundStartedAt) {
      setSecondsLeft(null);
      return;
    }
    const startedAt = new Date(state.roundStartedAt).getTime();
    const limit = state.roundDurationSec ?? GEO_ROUND_DURATION_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        revealGeoRoundAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.roundStartedAt, state.roundDurationSec, sessionId, actionPending]);

  // Timer reveal + auto-next
  useEffect(() => {
    if (state.phase !== "reveal" || !state.revealStartedAt) return;
    const startedAt = new Date(state.revealStartedAt).getTime();
    const limit = state.revealDurationSec ?? GEO_REVEAL_DURATION_SEC;
    let triggered = false;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.round((limit * 1000 - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !triggered && !actionPending) {
        triggered = true;
        nextGeoRoundAction(sessionId).catch(console.error);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [state.phase, state.revealStartedAt, state.revealDurationSec, sessionId, actionPending]);

  const currentTarget = useMemo(
    () => GEO_TARGETS.find((t) => t.id === state.targetId) ?? null,
    [state.targetId]
  );
  const currentAnswers = useMemo(
    () => answers.filter((a) => a.round === state.round),
    [answers, state.round]
  );
  const sortedByDistance = useMemo(
    () => [...currentAnswers].sort((a, b) => Number(a.distance_km) - Number(b.distance_km)),
    [currentAnswers]
  );
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  async function handleReveal() {
    setActionPending(true);
    await revealGeoRoundAction(sessionId);
    setActionPending(false);
  }
  async function handleNext() {
    setActionPending(true);
    await nextGeoRoundAction(sessionId);
    setActionPending(false);
  }
  async function handleEnd() {
    if (!confirm("Terminer la partie maintenant ?")) return;
    setActionPending(true);
    await endGeoAction(sessionId);
    setActionPending(false);
  }

  // Marqueurs reveal : cible verte + pins joueurs colorés
  const revealMarkers = useMemo(() => {
    if (!currentTarget) return [];
    const markers: Array<{ lat: number; lng: number; label?: string; color?: string }> = [
      {
        lat: currentTarget.lat,
        lng: currentTarget.lng,
        label: `🎯 ${currentTarget.label}`,
        color: "#10b981",
      },
    ];
    sortedByDistance.forEach((a, i) => {
      const p = players.find((pl) => pl.id === a.player_id);
      markers.push({
        lat: Number(a.guess_lat),
        lng: Number(a.guess_lng),
        label: `${p?.pseudo ?? "?"} · ${Number(a.distance_km).toLocaleString("fr-FR")} km`,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      });
    });
    return markers;
  }, [currentTarget, sortedByDistance, players]);

  // ═══ Final ═══
  if (state.phase === "final" || status === "ended") {
    const winner = sortedPlayers[0];
    return (
      <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-10">
        <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-30" />
        <div className="relative mx-auto w-full max-w-7xl">
          <header className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Velito Interactive · GÉO
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
                  subtitle={`Géo · ${state.totalRounds} cibles`}
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

  if (!currentTarget) {
    return (
      <main className="grid min-h-screen place-items-center text-white/40">
        Cible introuvable
      </main>
    );
  }

  const showReveal = state.phase === "reveal";
  const submittedCount = currentAnswers.length;

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />

      <div className="relative w-full max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Round {state.round} / {state.totalRounds}
            </p>
            {currentTarget.theme && (
              <p className="mt-1 text-sm font-semibold text-emerald-300">
                {currentTarget.theme}
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

        {/* Cible (le hint n'est révélé qu'au reveal pour pas spoiler) */}
        <div className="mb-4 text-center">
          <p className="text-xs uppercase tracking-widest text-white/40">
            Trouve sur la carte
          </p>
          <h1 className="neon-title mt-1 text-3xl sm:text-5xl">
            {currentTarget.label}
          </h1>
          {showReveal && currentTarget.hint && (
            <p className="mt-2 text-sm italic text-emerald-300/80">
              💡 {currentTarget.hint}
            </p>
          )}
        </div>

        {/* Globe animé pendant le round, carte avec pins au reveal */}
        {!showReveal ? (
          <div className="mx-auto grid h-[55vh] max-w-2xl place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-blue-500/10">
            <div className="text-center">
              <div
                className="text-[14rem] leading-none"
                style={{
                  animation: "spin 20s linear infinite",
                  display: "inline-block",
                }}
              >
                🌍
              </div>
              <p className="mt-4 text-sm uppercase tracking-widest text-white/40">
                Cherche sur ton tel
              </p>
            </div>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <LeafletMap
            initialCenter={currentTarget.initialCenter ?? [46.7, 2.5]}
            initialZoom={currentTarget.initialZoom ?? 5}
            pinPosition={null}
            onPinChange={() => {}}
            readonly
            extraMarkers={revealMarkers}
          />
        )}

        {/* Compteur ou podium — classement INVERSÉ : 3 derniers d'abord pour suspense top */}
        {!showReveal ? (
          <p className="mt-4 text-center text-sm text-white/60">
            <span className="font-bold text-emerald-300">{submittedCount}</span> /{" "}
            {players.length} ont placé leur pin
          </p>
        ) : (
          <section className="mt-6 space-y-2">
            {/* On affiche les 3 derniers en premier (anti-suspense), puis montée vers le top */}
            {(() => {
              const total = sortedByDistance.length;
              // <3 joueurs : on n'affiche RIEN avant le top (juste le 1er)
              // 3-4 joueurs : on affiche juste le dernier
              // 5+ joueurs : on affiche les 3 derniers
              const losersCount = total <= 2 ? 0 : total <= 4 ? 1 : 3;
              const losers = sortedByDistance.slice(-losersCount).reverse(); // du dernier au moins pire
              const top = sortedByDistance.slice(0, total - losersCount); // du 1er au n-losersCount
              const orderToDisplay = [...losers, ...top.reverse()]; // losers d'abord, puis top de bas en haut

              return orderToDisplay.map((a) => {
                const i = sortedByDistance.findIndex((x) => x.id === a.id);
                const p = players.find((pl) => pl.id === a.player_id);
                if (!p) return null;
                const podium = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                return (
                  <div
                    key={a.id}
                    className={
                      "flex items-center gap-4 rounded-2xl border p-3 transition " +
                      (i === 0
                        ? "border-amber-300/60 bg-amber-500/10"
                        : i === 1
                        ? "border-slate-300/60 bg-slate-300/10"
                        : i === 2
                        ? "border-orange-400/40 bg-orange-500/10"
                        : "border-white/10 bg-white/[0.02]")
                    }
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border-2 border-white"
                      style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                    />
                    <span className="w-8 text-center text-2xl">{podium ?? `${i + 1}`}</span>
                    <Avatar config={p.avatar_config} size="sm" />
                    <div className="flex-1">
                      <p className="font-bold text-white">{p.pseudo}</p>
                      <p className="text-xs text-white/50">
                        {Number(a.distance_km).toLocaleString("fr-FR")} km
                      </p>
                    </div>
                    <p className="font-display text-xl font-black text-emerald-300">
                      +{a.points}
                    </p>
                  </div>
                );
              });
            })()}
          </section>
        )}

        {/* Boutons host */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
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
                : "Cible suivante"}
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
          <section className="mt-8">
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
