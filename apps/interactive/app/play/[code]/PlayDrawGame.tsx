/**
 * <PlayDrawGame /> — manette mobile du jeu Dessin (Pictionary).
 *
 * Comportement dynamique :
 *  - Si je suis le dessinateur → Canvas tactile + mot à dessiner affiché en haut
 *    Toutes les 300ms : snapshot PNG broadcast sur le channel Realtime
 *  - Sinon → image broadcastée + barre de saisie + classement live
 *
 * Realtime :
 *  - postgres_changes sur sessions.current_state → suivre phase (drawing/reveal/final)
 *  - postgres_changes sur draw_guesses → afficher les guesses des autres joueurs
 *  - broadcast event "snapshot" → live du dessin
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@repo/ui/avatar";
import { type AvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import { submitDrawGuessAction } from "../../host/draw-actions";
import { DRAW_SNAPSHOT_INTERVAL_MS, type DrawState } from "@/lib/games/draw";

interface PlayDrawGameProps {
  sessionId: string;
  playerId: string;
  pseudo: string;
  avatar: AvatarConfig;
}

export default function PlayDrawGame({
  sessionId,
  playerId,
  pseudo,
  avatar,
}: PlayDrawGameProps) {
  const [state, setState] = useState<DrawState | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<string | null>(null);
  const [guess, setGuess] = useState("");
  const [guessFeedback, setGuessFeedback] = useState<
    { type: "ok" | "ko"; text: string } | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(60);

  const isDrawer = state?.current?.drawerPlayerId === playerId;

  // ════════════════════════════════════════════════════════════════
  // 1. Charge l'état de la session + subscribe Realtime
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    const supabase = createClient();

    async function loadState() {
      const { data } = await supabase
        .schema("interactive" as never)
        .from("sessions")
        .select("current_state")
        .eq("id", sessionId)
        .single();
      const cs = (data as { current_state: DrawState } | null)?.current_state;
      if (cs) setState(cs);
    }
    void loadState();

    // Subscribe aux changements de state (phases + nouveaux rounds)
    const stateChannel = supabase
      .channel(`draw-state-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "interactive",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const cs = (payload.new as { current_state: DrawState }).current_state;
          if (cs) {
            setState(cs);
            // Reset feedback & guess à chaque changement de phase
            setGuess("");
            setGuessFeedback(null);
            if (cs.phase === "drawing") {
              setLiveSnapshot(null); // nouveau round, on efface le dessin précédent
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(stateChannel);
    };
  }, [sessionId]);

  // ════════════════════════════════════════════════════════════════
  // 2. Broadcast Realtime pour le canvas live
  // ════════════════════════════════════════════════════════════════
  // Channel Realtime pour broadcast du canvas. Type any car ReturnType<channel>
  // est compliqué (RealtimeChannel non exporté simplement par @supabase).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const broadcastChannelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`draw-canvas-${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    // Écoute les snapshots si on n'est PAS le dessinateur
    channel.on("broadcast", { event: "snapshot" }, (payload) => {
      const png = (payload.payload as { png?: string } | undefined)?.png;
      if (png) setLiveSnapshot(png);
    });

    channel.subscribe();
    broadcastChannelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, [sessionId]);

  // ════════════════════════════════════════════════════════════════
  // 3. Timer countdown 60s (purement visuel — le reveal est déclenché côté host)
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!state?.current || state.phase !== "drawing") return;
    const startedAt = new Date(state.current.startedAt).getTime();
    const limitMs = state.timeLimitSec * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, Math.ceil((limitMs - elapsed) / 1000));
      setTimeLeftSec(left);
      if (left === 0) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [state?.current, state?.phase, state?.timeLimitSec]);

  // ════════════════════════════════════════════════════════════════
  // Helpers
  // ════════════════════════════════════════════════════════════════
  async function handleSubmitGuess(e: React.FormEvent) {
    e.preventDefault();
    if (!guess.trim() || submitting) return;
    setSubmitting(true);
    setGuessFeedback(null);
    try {
      const result = await submitDrawGuessAction(sessionId, playerId, guess.trim());
      if (!result.success) {
        setGuessFeedback({ type: "ko", text: result.error });
      } else if (result.correct) {
        setGuessFeedback({
          type: "ok",
          text: `Trouvé ! +${result.points} pts 🎉`,
        });
        setGuess("");
      } else {
        setGuessFeedback({ type: "ko", text: "Non, continue !" });
        setGuess("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // Rendu : selon phase
  // ════════════════════════════════════════════════════════════════

  if (!state) {
    return (
      <div className="w-full max-w-sm text-center text-white/50">Chargement…</div>
    );
  }

  if (state.phase === "final") {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive · Dessin
        </p>
        <h1 className="neon-title mt-3 text-4xl">Bravo 🎨</h1>
        <p className="mt-4 text-sm text-white/60">
          Partie terminée ! Classement sur l&apos;écran.
        </p>
        <div className="mt-6 flex justify-center">
          <Avatar config={avatar} size="xl" className="ring-4 ring-tenant/40" />
        </div>
        <p className="mt-4 font-display text-xl text-white">{pseudo}</p>
      </div>
    );
  }

  if (state.phase === "reveal" && state.lastReveal) {
    const r = state.lastReveal;
    const youFound = r.guessers.find((g) => g.playerId === playerId);
    const youWereDrawer = r.drawerPlayerId === playerId;
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Round {state.roundIndex + 1} / {state.totalRounds}
        </p>
        <h2 className="neon-title mt-3 text-3xl">Le mot était</h2>
        <p className="mt-2 font-display text-4xl font-black text-tenant">
          {r.word}
        </p>
        <p className="mt-4 text-sm text-white/60">
          {r.drawerPseudo} a fait deviner à{" "}
          <span className="font-bold text-white">{r.guessers.length}</span> /{" "}
          {r.totalGuessers} joueurs
        </p>

        {youWereDrawer && (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-widest text-emerald-200">
              Toi (dessinateur)
            </p>
            <p className="mt-1 font-display text-2xl text-white">+{r.drawerPoints} pts</p>
          </div>
        )}

        {youFound && (
          <div className="mt-6 rounded-2xl border border-tenant/30 bg-tenant/10 p-4">
            <p className="text-xs uppercase tracking-widest text-tenant">
              Tu as trouvé
            </p>
            <p className="mt-1 font-display text-2xl text-white">
              +{youFound.points} pts en {(youFound.elapsedMs / 1000).toFixed(1)}s
            </p>
          </div>
        )}

        {!youFound && !youWereDrawer && (
          <p className="mt-6 text-sm text-white/40 italic">
            Tu n&apos;as pas trouvé ce coup-ci !
          </p>
        )}

        <p className="mt-6 text-xs text-white/30">
          Prochain round dans quelques secondes…
        </p>
      </div>
    );
  }

  // ────────────── phase = "drawing" ──────────────
  if (state.phase === "drawing" && state.current) {
    if (isDrawer) {
      return (
        <DrawerView
          sessionId={sessionId}
          word={state.current.word}
          timeLeftSec={timeLeftSec}
          broadcastChannel={broadcastChannelRef}
        />
      );
    }

    return (
      <GuesserView
        drawerPseudo={state.current.drawerPseudo}
        timeLeftSec={timeLeftSec}
        liveSnapshot={liveSnapshot}
        guess={guess}
        setGuess={setGuess}
        guessFeedback={guessFeedback}
        submitting={submitting}
        onSubmit={handleSubmitGuess}
      />
    );
  }

  return (
    <div className="w-full max-w-sm text-center text-white/50">Préparation…</div>
  );
}

// ════════════════════════════════════════════════════════════════════
// <DrawerView /> — le joueur qui dessine
// ════════════════════════════════════════════════════════════════════

interface DrawerViewProps {
  sessionId: string;
  word: string;
  timeLeftSec: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  broadcastChannel: React.MutableRefObject<any>;
}

function DrawerView({ sessionId, word, timeLeftSec, broadcastChannel }: DrawerViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastBroadcastRef = useRef<number>(0);

  // Init canvas blanc
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 4;
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function broadcastSnapshot() {
    const canvas = canvasRef.current;
    if (!canvas || !broadcastChannel.current) return;
    const now = Date.now();
    if (now - lastBroadcastRef.current < DRAW_SNAPSHOT_INTERVAL_MS) return;
    lastBroadcastRef.current = now;
    // Compression : on baisse la qualité avec JPEG (PNG ne le supporte pas)
    const png = canvas.toDataURL("image/jpeg", 0.5);
    void broadcastChannel.current.send({
      type: "broadcast",
      event: "snapshot",
      payload: { png, t: now },
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e);
    const canvas = canvasRef.current;
    canvas?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = getPos(e);
    const last = lastPosRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPosRef.current = pos;
    broadcastSnapshot();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    const canvas = canvasRef.current;
    canvas?.releasePointerCapture(e.pointerId);
    broadcastSnapshot(); // snapshot final du trait
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 4;
    broadcastSnapshot();
  }

  return (
    <div className="w-full max-w-md text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
        À toi de dessiner !
      </p>

      <div className="card-ink mt-3 p-4">
        <p className="text-xs uppercase tracking-widest text-white/40">
          Ton mot
        </p>
        <p className="mt-1 font-display text-4xl font-black text-tenant">
          {word}
        </p>
      </div>

      <p className="mt-3 text-sm text-white/70">
        Temps restant :{" "}
        <span
          className={`font-display font-black ${
            timeLeftSec <= 10 ? "text-red-400" : "text-white"
          }`}
        >
          {timeLeftSec}s
        </span>
      </p>

      <canvas
        ref={canvasRef}
        width={500}
        height={500}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: "none" }}
        className="mt-4 aspect-square w-full rounded-2xl border-4 border-tenant/40 bg-white shadow-2xl"
      />

      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.05]"
        >
          🗑️ Effacer
        </button>
      </div>

      <p className="mt-3 text-[11px] text-white/40 italic">
        Pas d&apos;écriture ! On dessine uniquement.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// <GuesserView /> — les joueurs qui devinent
// ════════════════════════════════════════════════════════════════════

interface GuesserViewProps {
  drawerPseudo: string;
  timeLeftSec: number;
  liveSnapshot: string | null;
  guess: string;
  setGuess: (v: string) => void;
  guessFeedback: { type: "ok" | "ko"; text: string } | null;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function GuesserView({
  drawerPseudo,
  timeLeftSec,
  liveSnapshot,
  guess,
  setGuess,
  guessFeedback,
  submitting,
  onSubmit,
}: GuesserViewProps) {
  const found = guessFeedback?.type === "ok";

  return (
    <div className="w-full max-w-md text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
        {drawerPseudo} dessine
      </p>

      <p className="mt-2 text-sm text-white/70">
        Temps restant :{" "}
        <span
          className={`font-display font-black ${
            timeLeftSec <= 10 ? "text-red-400" : "text-white"
          }`}
        >
          {timeLeftSec}s
        </span>
      </p>

      {/* Aperçu live du dessin (max-w-md, ratio carré) */}
      <div className="mt-4 aspect-square w-full overflow-hidden rounded-2xl border-2 border-white/15 bg-white">
        {liveSnapshot ? (
          <img
            src={liveSnapshot}
            alt="Dessin en cours"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-black/40">
            En attente du premier trait…
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value.slice(0, 40))}
          placeholder={found ? "Tu as trouvé !" : "Tape ta réponse…"}
          disabled={found || submitting}
          autoComplete="off"
          maxLength={40}
          className="flex-1 rounded-xl border border-white/15 bg-ink px-4 py-3 text-white placeholder-white/30 outline-none focus:border-tenant focus:ring-2 focus:ring-tenant/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!guess.trim() || found || submitting}
          className="btn-tenant disabled:cursor-not-allowed disabled:opacity-50"
        >
          OK
        </button>
      </form>

      {guessFeedback && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            guessFeedback.type === "ok"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border border-orange-500/20 bg-orange-500/10 text-orange-200"
          }`}
        >
          {guessFeedback.text}
        </p>
      )}
    </div>
  );
}
