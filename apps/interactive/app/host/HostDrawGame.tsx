/**
 * <HostDrawGame /> — Vue TV du jeu Dessin (Pictionary).
 *
 * Affichage central de la soirée — c'est ce que tout le monde regarde au Moxy.
 *
 * Layout :
 *   ┌────────────────────────────────────────────────────────┐
 *   │  Header   : pseudo dessinateur + timer + round x/N     │
 *   │  Centre   : <img> du dessin live (broadcast Realtime)  │
 *   │            + indice "_ _ _ _ _" du mot (nb de lettres) │
 *   │  Footer   : chat des guesses + classement live à droite│
 *   │  Controls : "Révéler" + "Suivant"                      │
 *   └────────────────────────────────────────────────────────┘
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@repo/ui/avatar";
import { parseAvatarConfig, type AvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import { playSfx, AUDIO } from "@/lib/audio";
import {
  revealDrawAction,
  nextDrawRoundAction,
  endDrawAction,
} from "./draw-actions";
import { type DrawState } from "@/lib/games/draw";
import MuteFooter from "./MuteFooter";

interface SessionPlayer {
  id: string;
  pseudo: string;
  avatar_config: AvatarConfig;
  score: number;
}

interface DrawGuessRow {
  id: string;
  player_id: string;
  guess: string;
  is_correct: boolean;
  points: number;
  answered_at: string;
}

interface HostDrawGameProps {
  sessionId: string;
  initialState: DrawState;
  status: string;
}

export default function HostDrawGame({
  sessionId,
  initialState,
  status: initialStatus,
}: HostDrawGameProps) {
  const router = useRouter();
  const [state, setState] = useState<DrawState>(initialState);
  const [status, setStatus] = useState(initialStatus);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [guesses, setGuesses] = useState<DrawGuessRow[]>([]);
  const [liveSnapshot, setLiveSnapshot] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [actionPending, setActionPending] = useState(false);

  // ════════════════════════════════════════════════════════════════
  // 1. Charge les joueurs + subscribe Realtime sur scores / state / guesses
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    const supabase = createClient();

    async function loadPlayers() {
      const { data } = await supabase
        .schema("interactive" as never)
        .from("session_players")
        .select("id, pseudo, avatar_config, score")
        .eq("session_id", sessionId);
      const rows = (data ?? []) as Array<{
        id: string;
        pseudo: string;
        avatar_config: unknown;
        score: number;
      }>;
      setPlayers(
        rows.map((r) => ({
          id: r.id,
          pseudo: r.pseudo,
          avatar_config: parseAvatarConfig(r.avatar_config),
          score: r.score ?? 0,
        }))
      );
    }
    void loadPlayers();

    const channel = supabase
      .channel(`draw-host-${sessionId}`)
      // 1. Sync state
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "interactive",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as { current_state: DrawState; status: string };
          if (row.current_state) {
            const prevPhase = state.phase;
            const newPhase = row.current_state.phase;
            setState(row.current_state);
            if (row.status) setStatus(row.status);
            // SFX selon transition
            if (newPhase === "reveal" && prevPhase === "drawing") {
              playSfx(AUDIO.revealExplain, 0.5);
            }
            if (newPhase === "drawing" && prevPhase === "reveal") {
              playSfx(AUDIO.transition, 0.4);
              setLiveSnapshot(null);
              setGuesses([]);
            }
          }
        }
      )
      // 2. Sync scores
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "interactive",
          table: "session_players",
          filter: `session_id=eq.${sessionId}`,
        },
        () => void loadPlayers()
      )
      // 3. Sync guesses (live chat + détection bonne réponse)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "interactive",
          table: "draw_guesses",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as DrawGuessRow;
          setGuesses((prev) => [...prev, row]);
          if (row.is_correct) {
            playSfx(AUDIO.clickAnswer, 0.6);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ════════════════════════════════════════════════════════════════
  // 2. Subscribe Realtime broadcast pour le canvas live
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`draw-canvas-${sessionId}`);
    channel.on("broadcast", { event: "snapshot" }, (payload) => {
      const png = (payload.payload as { png?: string } | undefined)?.png;
      if (png) setLiveSnapshot(png);
    });
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // ════════════════════════════════════════════════════════════════
  // 3. Timer countdown — déclenche le reveal automatique à 0s
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!state.current || state.phase !== "drawing") return;
    const startedAt = new Date(state.current.startedAt).getTime();
    const limitMs = state.timeLimitSec * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, Math.ceil((limitMs - elapsed) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !actionPending) {
        clearInterval(interval);
        void handleReveal();
      }
    }, 250);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.current, state.phase, state.timeLimitSec]);

  // ════════════════════════════════════════════════════════════════
  // Helpers
  // ════════════════════════════════════════════════════════════════
  const drawerPlayer = useMemo(
    () => players.find((p) => p.id === state.current?.drawerPlayerId),
    [players, state.current?.drawerPlayerId]
  );

  /** Indice du mot : on garde la longueur et les espaces, on cache les lettres. */
  const wordHint = useMemo(() => {
    if (!state.current?.word) return "";
    return state.current.word
      .split("")
      .map((c) => (c === " " ? "  " : "_"))
      .join(" ");
  }, [state.current?.word]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  const pseudoMap = useMemo(() => {
    const m = new Map<string, { pseudo: string; avatar: AvatarConfig }>();
    players.forEach((p) => m.set(p.id, { pseudo: p.pseudo, avatar: p.avatar_config }));
    return m;
  }, [players]);

  async function handleReveal() {
    if (actionPending) return;
    setActionPending(true);
    await revealDrawAction(sessionId);
    setActionPending(false);
  }

  async function handleNext() {
    if (actionPending) return;
    setActionPending(true);
    await nextDrawRoundAction(sessionId);
    setActionPending(false);
  }

  async function handleEnd() {
    if (!confirm("Terminer la partie maintenant ?")) return;
    setActionPending(true);
    await endDrawAction(sessionId);
    setActionPending(false);
    router.push("/dashboard");
  }

  // ════════════════════════════════════════════════════════════════
  // Rendu phase 'final' — Podium
  // ════════════════════════════════════════════════════════════════
  if (state.phase === "final" || status === "ended") {
    const top3 = sortedPlayers.slice(0, 3);
    return (
      <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-8 py-12">
        <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
        <MuteFooter />

        <p className="text-xs uppercase tracking-[0.4em] text-white/40">
          Velito Interactive · Dessin
        </p>
        <h1 className="neon-title mt-3 text-7xl">Bravo 🎨</h1>
        <p className="mt-4 text-xl text-white/60">Classement final</p>

        <div className="mt-12 grid w-full max-w-4xl grid-cols-3 gap-6">
          {top3.map((p, i) => {
            const medal = ["🥇", "🥈", "🥉"][i] ?? "•";
            return (
              <div
                key={p.id}
                className={
                  "card-ink flex flex-col items-center gap-3 p-6 " +
                  (i === 0
                    ? "border-tenant/50 scale-110"
                    : "border-white/15")
                }
              >
                <span className="text-5xl">{medal}</span>
                <Avatar config={p.avatar_config} size="xl" />
                <p className="font-display text-2xl font-black text-white">
                  {p.pseudo}
                </p>
                <p className="font-display text-3xl font-black text-tenant">
                  {p.score} pts
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 w-full max-w-2xl space-y-2">
          {sortedPlayers.slice(3).map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-sm text-white/40">{i + 4}.</span>
                <Avatar config={p.avatar_config} size="sm" />
                <span className="font-display text-base text-white">{p.pseudo}</span>
              </div>
              <span className="font-display text-base text-white/70">
                {p.score} pts
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="btn-tenant mt-12"
        >
          Retour au dashboard
        </button>
      </main>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Rendu phase 'reveal' — Mot révélé + classement du round
  // ════════════════════════════════════════════════════════════════
  if (state.phase === "reveal" && state.lastReveal) {
    const r = state.lastReveal;
    const drawer = pseudoMap.get(r.drawerPlayerId);

    return (
      <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-8 py-12">
        <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
        <MuteFooter />

        <p className="text-xs uppercase tracking-[0.4em] text-white/40">
          Round {state.roundIndex + 1} / {state.totalRounds}
        </p>
        <h2 className="neon-title mt-3 text-4xl">Le mot était</h2>
        <p className="mt-4 font-display text-8xl font-black text-tenant">
          {r.word}
        </p>

        {/* Dessin final + dessinateur */}
        <div className="mt-8 grid w-full max-w-5xl grid-cols-2 gap-6">
          <div className="card-ink p-4">
            <p className="mb-3 text-xs uppercase tracking-widest text-white/40">
              Le dessin
            </p>
            <div className="aspect-square overflow-hidden rounded-xl bg-white">
              {liveSnapshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={liveSnapshot}
                  alt="Dessin final"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="grid h-full place-items-center text-black/40">
                  Pas de dessin capturé
                </div>
              )}
            </div>
          </div>

          <div className="card-ink p-6">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Dessinateur
            </p>
            {drawer && (
              <div className="mt-4 flex items-center gap-4">
                <Avatar config={drawer.avatar} size="xl" />
                <div>
                  <p className="font-display text-3xl font-black text-white">
                    {r.drawerPseudo}
                  </p>
                  <p className="mt-1 text-lg text-emerald-300">
                    +{r.drawerPoints} pts
                  </p>
                  <p className="mt-1 text-sm text-white/50">
                    {r.guessers.length} / {r.totalGuessers} ont trouvé
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="text-xs uppercase tracking-widest text-white/40">
                Trouveurs (par ordre)
              </p>
              <div className="mt-3 space-y-2">
                {r.guessers.length === 0 && (
                  <p className="text-sm italic text-white/40">
                    Personne n&apos;a trouvé 😅
                  </p>
                )}
                {r.guessers.map((g, i) => {
                  const info = pseudoMap.get(g.playerId);
                  return (
                    <div
                      key={g.playerId}
                      className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-xs text-white/50">{i + 1}.</span>
                        {info && <Avatar config={info.avatar} size="sm" />}
                        <span className="font-display text-base text-white">
                          {g.pseudo}
                        </span>
                        <span className="text-xs text-white/40">
                          {(g.elapsedMs / 1000).toFixed(1)}s
                        </span>
                      </div>
                      <span className="font-display text-base text-tenant">
                        +{g.points}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={actionPending}
          className="btn-tenant mt-12 text-xl"
        >
          {actionPending
            ? "..."
            : state.roundIndex + 1 >= state.totalRounds
              ? "Voir le classement final"
              : "Round suivant"}
        </button>
      </main>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Rendu phase 'drawing' — Vue principale (TV pendant le jeu)
  // ════════════════════════════════════════════════════════════════
  const recentGuesses = guesses.slice(-8).reverse();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden px-8 py-6">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-30" />
      <MuteFooter />

      {/* Header : round + timer + dessinateur */}
      <header className="relative flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Velito Interactive · Dessin
          </p>
          <p className="mt-1 font-display text-xl font-black text-white">
            Round {state.roundIndex + 1} / {state.totalRounds}
          </p>
        </div>

        {drawerPlayer && (
          <div className="flex items-center gap-3 rounded-2xl border border-tenant/30 bg-tenant/10 px-4 py-2">
            <Avatar config={drawerPlayer.avatar_config} size="md" />
            <div>
              <p className="text-xs uppercase tracking-widest text-tenant/70">
                Dessine
              </p>
              <p className="font-display text-xl font-black text-white">
                {drawerPlayer.pseudo}
              </p>
            </div>
          </div>
        )}

        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-white/40">
            Temps
          </p>
          <p
            className={
              "font-display text-5xl font-black " +
              (secondsLeft <= 10 ? "text-red-400 animate-pulse" : "text-white")
            }
          >
            {secondsLeft}s
          </p>
        </div>
      </header>

      {/* Corps : dessin live + chat à droite */}
      <div className="relative mt-6 grid flex-1 grid-cols-3 gap-6">
        {/* Centre : dessin live */}
        <div className="col-span-2 flex flex-col">
          <div className="flex-1 overflow-hidden rounded-3xl border-4 border-white/15 bg-white shadow-2xl">
            {liveSnapshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={liveSnapshot}
                alt="Dessin en cours"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="grid h-full place-items-center text-2xl text-black/30">
                {drawerPlayer ? `${drawerPlayer.pseudo} prépare son dessin…` : "..."}
              </div>
            )}
          </div>

          {/* Indice du mot — nombre de lettres */}
          <div className="mt-4 rounded-2xl border border-white/15 bg-ink-700/70 px-6 py-3 text-center">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Mot à deviner ({state.current?.word.length} lettres)
            </p>
            <p className="mt-2 font-mono text-3xl tracking-[0.4em] text-white">
              {wordHint}
            </p>
          </div>
        </div>

        {/* Droite : chat des guesses + classement live */}
        <aside className="flex flex-col gap-4">
          {/* Chat */}
          <div className="card-ink flex-1 p-4">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Propositions live
            </p>
            <div className="mt-3 space-y-2">
              {recentGuesses.length === 0 && (
                <p className="text-sm italic text-white/30">
                  En attente des premières réponses…
                </p>
              )}
              {recentGuesses.map((g) => {
                const info = pseudoMap.get(g.player_id);
                return (
                  <div
                    key={g.id}
                    className={
                      "flex items-center justify-between rounded-lg px-3 py-2 " +
                      (g.is_correct
                        ? "border border-emerald-500/40 bg-emerald-500/15"
                        : "bg-white/[0.04]")
                    }
                  >
                    <div className="flex items-center gap-2">
                      {info && <Avatar config={info.avatar} size="sm" />}
                      <span className="font-display text-sm font-bold text-white">
                        {info?.pseudo ?? "?"}
                      </span>
                      <span
                        className={
                          "text-sm " +
                          (g.is_correct ? "text-emerald-200" : "text-white/60")
                        }
                      >
                        {g.is_correct ? `a trouvé +${g.points}` : g.guess}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Classement live */}
          <div className="card-ink p-4">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Classement
            </p>
            <div className="mt-3 space-y-1.5">
              {sortedPlayers.slice(0, 5).map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-xs text-white/40">{i + 1}.</span>
                    <Avatar config={p.avatar_config} size="sm" />
                    <span className="font-display text-sm font-bold text-white">
                      {p.pseudo}
                    </span>
                  </div>
                  <span className="font-display text-sm text-tenant">
                    {p.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer : controls */}
      <footer className="relative mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={handleReveal}
          disabled={actionPending}
          className="btn-tenant"
        >
          {actionPending ? "..." : "🔓 Révéler maintenant"}
        </button>
        <button
          type="button"
          onClick={handleEnd}
          disabled={actionPending}
          className="rounded-xl border border-white/20 px-5 py-3 text-sm text-white/70 hover:bg-white/[0.05]"
        >
          Terminer la partie
        </button>
      </footer>
    </main>
  );
}
