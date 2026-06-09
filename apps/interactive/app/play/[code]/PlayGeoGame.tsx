/**
 * <PlayGeoGame /> — Vue téléphone du joueur pendant une partie Géo.
 *
 * Phases :
 *  - 'round'  : carte interactive + label cible + pin du joueur
 *  - 'reveal' : récap personnel (sa distance, son rang, +points) + carte avec
 *               vraie cible + son pin
 *  - 'final'  : score total + bouton rejoindre nouvelle session
 *
 * UPSERT à chaque clic carte (UPDATE si déjà un pin pour ce round, INSERT sinon).
 */
"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Avatar } from "@repo/ui/avatar";
import type { AvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import {
  GEO_TARGETS,
  GEO_ROUND_DURATION_SEC,
  GEO_REVEAL_DURATION_SEC,
  type GeoState,
} from "@/lib/games/geo";
import NextSessionInput from "./NextSessionInput";

// Dynamic import : Leaflet utilise window/document → impossible en SSR
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[55vh] min-h-[320px] w-full place-items-center rounded-2xl border border-white/15 bg-white/[0.02] text-xs text-white/40">
      Chargement de la carte…
    </div>
  ),
});

interface MyGeo {
  id: string;
  round: number;
  guess_lat: number;
  guess_lng: number;
  distance_km: number;
  points: number;
  rank: number;
}

interface RoundClassement {
  player_id: string;
  pseudo: string;
  distance_km: number;
  points: number;
  rank: number;
}

interface PlayGeoGameProps {
  sessionId: string;
  playerId: string;
  pseudo: string;
  avatar: AvatarConfig;
}

export default function PlayGeoGame({
  sessionId,
  playerId,
  pseudo,
  avatar,
}: PlayGeoGameProps) {
  const [state, setState] = useState<GeoState | null>(null);
  const [myAnswers, setMyAnswers] = useState<MyGeo[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [classement, setClassement] = useState<RoundClassement[]>([]);

  // Timer
  useEffect(() => {
    if (!state) return;
    let startedAt: number | null = null;
    let limit = 0;
    if (state.phase === "round" && state.roundStartedAt) {
      startedAt = new Date(state.roundStartedAt).getTime();
      limit = state.roundDurationSec ?? GEO_ROUND_DURATION_SEC;
    } else if (state.phase === "reveal" && state.revealStartedAt) {
      startedAt = new Date(state.revealStartedAt).getTime();
      limit = state.revealDurationSec ?? GEO_REVEAL_DURATION_SEC;
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

  // Au passage en reveal : fetch le classement complet du round
  useEffect(() => {
    if (state?.phase !== "reveal") {
      setClassement([]);
      return;
    }
    const supabase = createClient();
    (async () => {
      const { data: ansData } = await supabase
        .schema("interactive" as never)
        .from("geo_answers")
        .select("player_id, distance_km, points, rank")
        .eq("session_id", sessionId)
        .eq("round", state.round)
        .order("rank", { ascending: true });

      const { data: playersData } = await supabase
        .schema("interactive" as never)
        .from("session_players")
        .select("id, pseudo")
        .eq("session_id", sessionId);

      const players = (playersData ?? []) as Array<{ id: string; pseudo: string }>;
      const rows = (ansData ?? []) as Array<{
        player_id: string; distance_km: number; points: number; rank: number;
      }>;

      setClassement(
        rows.map((r) => ({
          player_id: r.player_id,
          pseudo: players.find((p) => p.id === r.player_id)?.pseudo ?? "?",
          distance_km: Number(r.distance_km),
          points: r.points,
          rank: r.rank,
        }))
      );
    })();
  }, [state?.phase, state?.round, sessionId]);

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
          .from("geo_answers")
          .select("id, round, guess_lat, guess_lng, distance_km, points, rank")
          .eq("player_id", playerId),
        supabase
          .schema("interactive" as never)
          .from("session_players")
          .select("score")
          .eq("id", playerId)
          .single(),
      ]);

      if (sessionRes.data) {
        setState((sessionRes.data as { current_state: GeoState }).current_state);
      }
      if (ansRes.data) {
        setMyAnswers(ansRes.data as MyGeo[]);
      }
      if (playerRes.data) {
        setMyScore((playerRes.data as { score: number }).score);
      }
    }
    loadAll();

    const channel = supabase
      .channel(`play-geo-${playerId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const r = payload.new as { current_state: GeoState };
          setState(r.current_state);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "interactive", table: "geo_answers", filter: `player_id=eq.${playerId}` },
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

  // Reset pin à chaque nouveau round
  useEffect(() => {
    if (state?.phase === "round") setPin(null);
  }, [state?.round, state?.phase]);

  const myAnswerForCurrent = useMemo(
    () => myAnswers.find((a) => a.round === state?.round) ?? null,
    [myAnswers, state?.round]
  );

  const currentTarget = useMemo(
    () => (state ? GEO_TARGETS.find((t) => t.id === state.targetId) : null),
    [state]
  );

  // Sauve le pin (UPSERT) à chaque changement
  async function handlePinChange(latlng: [number, number]) {
    if (!state || state.phase !== "round" || submitting) return;
    setPin(latlng);
    setSubmitting(true);
    const supabase = createClient();
    const existing = myAnswerForCurrent;

    if (existing) {
      await supabase
        .schema("interactive" as never)
        .from("geo_answers")
        .update({ guess_lat: latlng[0], guess_lng: latlng[1] } as never)
        .eq("id", existing.id);
    } else {
      await supabase
        .schema("interactive" as never)
        .from("geo_answers")
        .insert({
          session_id: sessionId,
          player_id: playerId,
          round: state.round,
          guess_lat: latlng[0],
          guess_lng: latlng[1],
        } as never);
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
          Velito Interactive · GÉO
        </p>
        <h1 className="neon-title mt-3 text-3xl">Partie terminée</h1>

        <div className="mt-8 flex justify-center">
          <Avatar config={avatar} size="xl" />
        </div>
        <p className="mt-4 font-display text-xl font-bold text-white">{pseudo}</p>

        <div className="card-ink mt-8 p-6">
          <p className="text-xs uppercase tracking-widest text-white/40">Ton score</p>
          <p className="mt-2 font-display text-5xl font-black tabular-nums text-emerald-300">
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
  if (state.phase === "reveal" && currentTarget && myAnswerForCurrent) {
    const a = myAnswerForCurrent;
    return (
      <div className="w-full max-w-sm">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-white/40">
          Round {state.round} / {state.totalRounds}
        </p>

        <h1 className="mt-3 text-center text-xl font-bold text-white">
          {currentTarget.label}
        </h1>
        {currentTarget.hint && (
          <p className="mt-2 text-center text-xs italic text-emerald-300/80">
            💡 {currentTarget.hint}
          </p>
        )}

        <div className="mt-4">
          <LeafletMap
            initialCenter={[
              (currentTarget.lat + Number(a.guess_lat)) / 2,
              (currentTarget.lng + Number(a.guess_lng)) / 2,
            ]}
            initialZoom={3}
            pinPosition={[Number(a.guess_lat), Number(a.guess_lng)]}
            onPinChange={() => {}}
            readonly
            extraMarkers={[
              {
                lat: currentTarget.lat,
                lng: currentTarget.lng,
                label: currentTarget.label,
                color: "#10b981",
              },
            ]}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-widest text-white/40">Distance</p>
            <p className="mt-1 font-display text-xl font-black tabular-nums text-white">
              {Number(a.distance_km).toLocaleString("fr-FR")} km
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-widest text-white/40">Rang</p>
            <p className="mt-1 font-display text-xl font-black tabular-nums text-amber-300">
              {a.rank}
              {a.rank === 1 ? " 🥇" : a.rank === 2 ? " 🥈" : a.rank === 3 ? " 🥉" : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-center">
          <p className="font-display text-2xl font-black text-emerald-300">
            +{a.points} pts
          </p>
        </div>

        <p className="mt-4 text-center text-xs uppercase tracking-widest text-white/50">Score total</p>
        <p className="text-center font-display text-3xl font-black tabular-nums text-emerald-300">
          {myScore.toLocaleString("fr-FR")}
        </p>

        {/* Classement du round */}
        {classement.length > 0 && (
          <div className="mt-6 space-y-1">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Classement du round
            </p>
            {classement.slice(0, 5).map((c) => (
              <div
                key={c.player_id}
                className={
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm " +
                  (c.player_id === playerId
                    ? "border-emerald-400/60 bg-emerald-500/10 font-bold"
                    : "border-white/10 bg-white/[0.03]")
                }
              >
                <span className="w-5 text-center text-xs">
                  {c.rank === 1 ? "🥇" : c.rank === 2 ? "🥈" : c.rank === 3 ? "🥉" : c.rank}
                </span>
                <span className="flex-1 truncate text-left text-white">{c.pseudo}</span>
                <span className="text-xs tabular-nums text-white/60">
                  {c.distance_km.toLocaleString("fr-FR")} km
                </span>
                <span className="ml-2 font-display font-black text-emerald-300">+{c.points}</span>
              </div>
            ))}
          </div>
        )}

        {secondsLeft !== null && (
          <p className="mt-4 text-center text-xs uppercase tracking-widest text-amber-300">
            Suivant dans {secondsLeft}s
          </p>
        )}
      </div>
    );
  }

  // ═══ ROUND ═══
  if (!currentTarget) return null;

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Round {state.round} / {state.totalRounds}
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

      <h1 className="mt-3 text-center text-2xl font-bold leading-tight text-white">
        Trouve : <span className="text-emerald-300">{currentTarget.label}</span>
      </h1>
      {/* Hint caché pendant le round, révélé seulement après */}

      <div className="mt-4">
        <LeafletMap
          initialCenter={currentTarget.initialCenter ?? [46.7, 2.5]}
          initialZoom={currentTarget.initialZoom ?? 5}
          pinPosition={pin ?? (myAnswerForCurrent ? [Number(myAnswerForCurrent.guess_lat), Number(myAnswerForCurrent.guess_lng)] : null)}
          onPinChange={handlePinChange}
        />
      </div>

      <p className="mt-3 text-center text-xs text-white/50">
        {pin || myAnswerForCurrent
          ? "Pin placé · tu peux le bouger en cliquant ailleurs"
          : "Touche la carte pour placer ton pin"}
      </p>
    </div>
  );
}
