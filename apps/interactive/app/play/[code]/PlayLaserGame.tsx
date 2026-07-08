/**
 * <PlayLaserGame /> — Vue téléphone du joueur pendant une partie LASER.
 *
 * Phases :
 *  - 'aim'    : carré tactile → 1) placer son avatar (dans la zone active),
 *               2) viser (drag = direction du laser), 3) verrouiller.
 *               Les coups sont SECRETS (RLS host-only) → on ne relit jamais
 *               laser_moves ici : la position/l'angle vivent en state local et
 *               on les UPSERT dans la table.
 *  - 'reveal' : récap perso (touché ? survécu ?) depuis current_state.lastResolution.
 *  - 'final'  : gagné / éliminé + score.
 *
 * Repère normalisé [0,1] × [0,1], identique à la logique serveur (laser.ts).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@repo/ui/avatar";
import type { AvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import {
  extremiteLaser,
  AIM_DURATION_SEC,
  REVEAL_DURATION_SEC,
  type LaserState,
  type Point,
} from "@/lib/games/laser";
import NextSessionInput from "./NextSessionInput";

interface PlayLaserGameProps {
  sessionId: string;
  playerId: string;
  pseudo: string;
  avatar: AvatarConfig;
}

export default function PlayLaserGame({
  sessionId,
  playerId,
  pseudo,
  avatar,
}: PlayLaserGameProps) {
  const [state, setState] = useState<LaserState | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [myEliminatedRound, setMyEliminatedRound] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Coup en cours (state local — jamais relu depuis la base pendant 'aim').
  const [pos, setPos] = useState<Point | null>(null);
  const [angle, setAngle] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ─── Realtime : session + mon joueur (score, élimination) ───
  useEffect(() => {
    const supabase = createClient();

    async function loadAll() {
      const [sessionRes, playerRes] = await Promise.all([
        supabase
          .schema("interactive" as never)
          .from("sessions")
          .select("current_state")
          .eq("id", sessionId)
          .single(),
        supabase
          .schema("interactive" as never)
          .from("session_players")
          .select("score, eliminated_round")
          .eq("id", playerId)
          .single(),
      ]);
      if (sessionRes.data) {
        setState((sessionRes.data as { current_state: LaserState }).current_state);
      }
      if (playerRes.data) {
        const p = playerRes.data as { score: number; eliminated_round: number | null };
        setMyScore(p.score);
        setMyEliminatedRound(p.eliminated_round);
      }
    }
    loadAll();

    const channel = supabase
      .channel(`play-laser-${playerId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => setState((payload.new as { current_state: LaserState }).current_state),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "interactive", table: "session_players", filter: `id=eq.${playerId}` },
        (payload) => {
          const p = payload.new as { score: number; eliminated_round: number | null };
          setMyScore(p.score);
          setMyEliminatedRound(p.eliminated_round);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, playerId]);

  // ─── Timer ───
  useEffect(() => {
    if (!state) return;
    let startedAt: number | null = null;
    let limit = 0;
    if (state.phase === "aim" && state.aimStartedAt) {
      startedAt = new Date(state.aimStartedAt).getTime();
      limit = state.aimDurationSec ?? AIM_DURATION_SEC;
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

  // ─── Reset du coup à chaque nouvelle manche ───
  useEffect(() => {
    if (state?.phase === "aim") {
      setPos(null);
      setAngle(null);
      setLocked(false);
    }
  }, [state?.round, state?.phase]);

  // ─── Conversion coordonnées écran → repère normalisé [0,1] ───
  function toNorm(clientX: number, clientY: number): Point {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return { x, y };
  }

  function clampToZone(p: Point): Point {
    const z = state?.zone;
    if (!z) return p;
    return {
      x: Math.min(z.max, Math.max(z.min, p.x)),
      y: Math.min(z.max, Math.max(z.min, p.y)),
    };
  }

  function handlePointer(e: React.PointerEvent<SVGSVGElement>) {
    if (!state || state.phase !== "aim" || locked || myEliminatedRound !== null) return;
    const p = toNorm(e.clientX, e.clientY);
    if (!pos) {
      // 1er contact : place l'avatar (contraint à la zone active).
      setPos(clampToZone(p));
    } else {
      // Avatar posé : le contact définit la DIRECTION du laser.
      setAngle(Math.atan2(p.y - pos.y, p.x - pos.x));
    }
  }

  async function verrouiller() {
    if (!state || !pos || angle === null) return;
    setLocked(true);
    const supabase = createClient();
    // UPSERT : une ligne par (session, round, joueur). Pas besoin de relire.
    await supabase
      .schema("interactive" as never)
      .from("laser_moves")
      .upsert(
        {
          session_id: sessionId,
          player_id: playerId,
          round: state.round,
          pos_x: pos.x,
          pos_y: pos.y,
          angle,
        } as never,
        { onConflict: "session_id,round,player_id" } as never,
      );
  }

  function replacer() {
    if (locked) return;
    setPos(null);
    setAngle(null);
  }

  // ═══ Loading ═══
  if (!state) {
    return <div className="w-full max-w-sm text-center text-white/40">Chargement…</div>;
  }

  // ═══ FINAL ═══
  if (state.phase === "final") {
    const gagne = state.winners?.includes(playerId) ?? false;
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Velito Interactive · LASER</p>
        <h1 className="neon-title mt-3 text-3xl">{gagne ? "Victoire 🏆" : "Partie terminée"}</h1>
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
        <p className="mt-6 text-xs text-white/40">Regarde l&apos;écran TV pour le classement 🏆</p>
        <NextSessionInput />
      </div>
    );
  }

  // ═══ ÉLIMINÉ (hors final) → spectateur ═══
  if (myEliminatedRound !== null) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">LASER</p>
        <h1 className="mt-3 text-2xl font-black text-red-300">Éliminé</h1>
        <p className="mt-2 text-sm text-white/50">
          Sorti à la manche {myEliminatedRound + 1}. Regarde la suite sur la TV.
        </p>
        <div className="mt-8 flex justify-center opacity-60">
          <Avatar config={avatar} size="xl" />
        </div>
        <p className="mt-6 text-xs uppercase tracking-widest text-white/40">Ton score</p>
        <p className="font-display text-3xl font-black tabular-nums text-emerald-300">
          {myScore.toLocaleString("fr-FR")}
        </p>
      </div>
    );
  }

  // ═══ REVEAL ═══
  if (state.phase === "reveal") {
    const touchedThisRound = state.lastResolution?.eliminated.includes(playerId) ?? false;
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Manche {state.round + 1}
        </p>
        <h1 className={"mt-3 text-2xl font-black " + (touchedThisRound ? "text-red-300" : "text-emerald-300")}>
          {touchedThisRound ? "Touché ! 💥" : "Tu survis ✓"}
        </h1>
        <div className="mt-6"><ArenaSvg state={state} playerId={playerId} /></div>
        <p className="mt-4 text-xs uppercase tracking-widest text-white/40">Score</p>
        <p className="font-display text-3xl font-black tabular-nums text-emerald-300">
          {myScore.toLocaleString("fr-FR")}
        </p>
        {secondsLeft !== null && (
          <p className="mt-3 text-xs uppercase tracking-widest text-amber-300">
            Manche suivante dans {secondsLeft}s
          </p>
        )}
      </div>
    );
  }

  // ═══ AIM ═══
  const zone = state.zone;
  const bout = pos && angle !== null ? extremiteLaser(pos, angle) : null;

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Manche {state.round + 1}</p>
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

      <h1 className="mt-3 text-center text-lg font-bold text-white">
        {!pos ? "Place-toi dans la zone" : locked ? "Coup verrouillé" : "Vise : glisse ton doigt"}
      </h1>

      <svg
        ref={svgRef}
        viewBox="0 0 1 1"
        className="mt-4 aspect-square w-full touch-none rounded-2xl border border-white/15 bg-white/[0.02]"
        onPointerDown={handlePointer}
        onPointerMove={(e) => {
          if (e.buttons === 1) handlePointer(e);
        }}
      >
        {/* Arène complète (grille discrète) */}
        <rect x={0} y={0} width={1} height={1} fill="transparent" />
        {/* Zone active */}
        <rect
          x={zone.min}
          y={zone.min}
          width={zone.max - zone.min}
          height={zone.max - zone.min}
          fill="rgba(16,185,129,0.06)"
          stroke="rgba(16,185,129,0.5)"
          strokeWidth={0.006}
        />
        {/* Laser en aperçu */}
        {pos && bout && (
          <line
            x1={pos.x}
            y1={pos.y}
            x2={bout.x}
            y2={bout.y}
            stroke="#ef4444"
            strokeWidth={0.012}
            strokeLinecap="round"
          />
        )}
        {/* Avatar (point) */}
        {pos && (
          <circle cx={pos.x} cy={pos.y} r={0.035} fill="#fff" stroke="#ef4444" strokeWidth={0.01} />
        )}
      </svg>

      <div className="mt-4 flex items-center justify-center gap-3">
        {pos && !locked && (
          <button
            type="button"
            onClick={replacer}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70"
          >
            Replacer
          </button>
        )}
        <button
          type="button"
          onClick={verrouiller}
          disabled={!pos || angle === null || locked}
          className={
            "rounded-full px-6 py-2 font-display text-sm font-black transition " +
            (!pos || angle === null || locked
              ? "border border-white/10 text-white/30"
              : "bg-emerald-500 text-black")
          }
        >
          {locked ? "Verrouillé ✓" : "Verrouiller"}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-white/40">
        Personne ne voit ta position avant le décompte.
      </p>
    </div>
  );
}

/** Mini-arène du reveal : lasers + positions + éliminés. */
function ArenaSvg({ state, playerId }: { state: LaserState; playerId: string }) {
  const res = state.lastResolution;
  if (!res) return null;
  const posById = new Map(res.positions.map((p) => [p.playerId, p]));
  return (
    <svg viewBox="0 0 1 1" className="aspect-square w-full rounded-2xl border border-white/15 bg-white/[0.02]">
      <rect
        x={state.zone.min}
        y={state.zone.min}
        width={state.zone.max - state.zone.min}
        height={state.zone.max - state.zone.min}
        fill="rgba(16,185,129,0.05)"
        stroke="rgba(16,185,129,0.4)"
        strokeWidth={0.006}
      />
      {res.lasers.map((l) => (
        <line
          key={l.id}
          x1={l.from.x}
          y1={l.from.y}
          x2={l.to.x}
          y2={l.to.y}
          stroke={l.touche ? "#ef4444" : "rgba(239,68,68,0.4)"}
          strokeWidth={0.01}
          strokeLinecap="round"
        />
      ))}
      {res.positions.map((p) => {
        const elimine = res.eliminated.includes(p.playerId);
        const moi = p.playerId === playerId;
        return (
          <circle
            key={p.playerId}
            cx={p.x}
            cy={p.y}
            r={moi ? 0.04 : 0.03}
            fill={elimine ? "#7f1d1d" : "#fff"}
            stroke={moi ? "#10b981" : elimine ? "#ef4444" : "rgba(255,255,255,0.5)"}
            strokeWidth={0.01}
          />
        );
      })}
      {/* posById conservé pour extensions futures (labels) */}
      {posById.size === 0 && null}
    </svg>
  );
}
