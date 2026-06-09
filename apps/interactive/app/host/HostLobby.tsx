/**
 * <HostLobby /> — Vue TV/animateur d'une session en cours (Client Component).
 *
 * Affiche :
 *  - Le code session en très gros (visible de loin)
 *  - Un vrai QR code qui pointe vers /play/[code]
 *  - La grille des joueurs connectés AVEC leurs avatars
 *  - Le bouton "Lancer la partie" (visible quand status === 'lobby')
 *
 * Realtime :
 *  - On subscribe au channel "session-{sessionId}" Supabase Realtime
 *  - À chaque INSERT/UPDATE/DELETE sur interactive.session_players (filtré
 *    par session_id), on re-fetch ou patch local
 *  - On affiche les joueurs en LIVE — pas de refresh manuel
 *
 * Plus tard : recevoir un broadcast "game_start" du serveur → naviguer vers
 * /host/game/[gameId] qui contient la machine à états du jeu choisi.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@repo/ui/avatar";
import { type AvatarConfig, parseAvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import { endSessionAction } from "./actions";
import { startQuizAction } from "./quiz-actions";
import { startPetitBacAction } from "./petitbac-actions";
import { startEstimAction } from "./estim-actions";
import { startGeoAction } from "./geo-actions";
import { startBlindTestAction } from "./blindtest-actions";
import { startReflexAction } from "./reflex-actions";
import { startLoupGarouAction } from "./loupgarou-actions";
import { startDrawAction } from "./draw-actions";
import { useBackgroundMusic, playSfx, AUDIO } from "@/lib/audio";
import MuteFooter from "./MuteFooter";

interface SessionPlayer {
  id: string;
  pseudo: string;
  avatar_config: AvatarConfig;
  joined_at: string;
  score: number;
}

interface HostLobbyProps {
  sessionId: string;
  code: string;
  status: string;
  playBaseUrl: string;
  /** Type de jeu pré-sélectionné depuis la galerie. Null = pas encore choisi. */
  gameType?: "quiz" | "petit_bac" | "blind_test" | "estim" | "geo" | "reflex" | "loup_garou" | "draw" | null;
}

export default function HostLobby({
  sessionId,
  code,
  status: initialStatus,
  playBaseUrl,
  gameType,
}: HostLobbyProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [status, setStatus] = useState(initialStatus);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  /** Nombre de rounds (seulement utilisé par Blind Test pour l'instant) */
  const [numRounds, setNumRounds] = useState(12);
  /** Thème Quiz sélectionné (Mix = tous thèmes). */
  const [quizTheme, setQuizTheme] = useState<
    "Mix" | "Culture G" | "Sport" | "Amiens" | "Gaming" | "Musique" | "Cinéma"
  >("Mix");

  const joinUrl = `${playBaseUrl}/play/${code}`;
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  // Musique de fond du lobby — transition cards → game
  // Note : le toggleMute est maintenant géré par MuteFooter (footer global)
  useBackgroundMusic(AUDIO.lobbyMusic, 0.22);

  // 1. Générer le QR code (chargement dynamique pour pas alourdir le bundle initial)
  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((qr) => {
      qr.toDataURL(joinUrl, {
        width: 320,
        margin: 1,
        color: { dark: "#0e0e1a", light: "#ffffff" },
      }).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  // 2. Charger les joueurs déjà présents + subscribe Realtime
  useEffect(() => {
    const supabase = createClient();
    supabaseRef.current = supabase;

    async function loadPlayers() {
      const { data, error } = await supabase
        .schema("interactive" as never)
        .from("session_players")
        .select("id, pseudo, avatar_config, joined_at, score")
        .eq("session_id", sessionId)
        .order("joined_at", { ascending: true });
      if (error) {
        console.error("[HostLobby] loadPlayers error:", error.message);
        return;
      }
      const rows = (data ?? []) as Array<{
        id: string;
        pseudo: string;
        avatar_config: unknown;
        joined_at: string;
        score: number;
      }>;
      setPlayers(
        rows.map((r) => ({
          id: r.id,
          pseudo: r.pseudo,
          avatar_config: parseAvatarConfig(r.avatar_config),
          joined_at: r.joined_at,
          score: r.score,
        }))
      );
    }
    loadPlayers();

    // Subscribe Realtime au channel de la session
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "interactive",
          table: "session_players",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as {
              id: string;
              pseudo: string;
              avatar_config: unknown;
              joined_at: string;
              score: number;
            };
            setPlayers((prev) => {
              if (prev.some((p) => p.id === r.id)) return prev;
              // SFX "nouveau joueur" — son discord-like
              playSfx(AUDIO.playerJoin, 0.4);
              return [
                ...prev,
                {
                  id: r.id,
                  pseudo: r.pseudo,
                  avatar_config: parseAvatarConfig(r.avatar_config),
                  joined_at: r.joined_at,
                  score: r.score,
                },
              ];
            });
          } else if (payload.eventType === "UPDATE") {
            const r = payload.new as { id: string; score: number };
            setPlayers((prev) =>
              prev.map((p) => (p.id === r.id ? { ...p, score: r.score } : p))
            );
          } else if (payload.eventType === "DELETE") {
            const r = payload.old as { id: string };
            setPlayers((prev) => prev.filter((p) => p.id !== r.id));
          }
        }
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
          const r = payload.new as { status: string };
          setStatus(r.status);
          // Quand la session passe en 'playing', on refresh la page server
          // pour que /host/page.tsx route vers HostQuizGame/HostPetitBacGame.
          // Sans ce refresh, l'animateur devait F5 manuellement.
          if (r.status === "playing" || r.status === "ended") {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.joined_at.localeCompare(b.joined_at)),
    [players]
  );

  async function handleStart() {
    if (sortedPlayers.length === 0) {
      alert("Attends qu'au moins un joueur rejoigne avant de lancer.");
      return;
    }
    setActionPending(true);
    // Route selon le game_type pré-sélectionné depuis la galerie /dashboard.
    // Si non set (cas legacy), on tombe sur Quiz par défaut.
    if (gameType === "petit_bac") {
      await startPetitBacAction(sessionId);
    } else if (gameType === "estim") {
      await startEstimAction(sessionId);
    } else if (gameType === "geo") {
      await startGeoAction(sessionId);
    } else if (gameType === "blind_test") {
      await startBlindTestAction(sessionId, numRounds);
    } else if (gameType === "reflex") {
      await startReflexAction(sessionId);
    } else if (gameType === "loup_garou") {
      await startLoupGarouAction(sessionId);
    } else if (gameType === "draw") {
      await startDrawAction(sessionId);
    } else {
      await startQuizAction(sessionId, quizTheme);
    }
    setActionPending(false);
  }

  async function handleEnd() {
    if (!confirm("Tu veux vraiment terminer cette session ?")) return;
    setActionPending(true);
    await endSessionAction(sessionId);
    setActionPending(false);
    router.push("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-8 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-neon-violet/25 blur-3xl" />

      {/* Bouton mute global (couvre musique + SFX) */}
      <MuteFooter />

      {/* ─── Header : titre + QR + code ─── */}
      <div className="relative grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">
            Velito Interactive
          </p>
          <h1 className="neon-title mt-4 text-6xl sm:text-7xl">
            Rejoins
            <br />
            la partie
          </h1>
          <p className="mt-6 text-xl text-white/70">
            Scanne le QR code ou va sur{" "}
            <span className="font-semibold text-tenant">
              {playBaseUrl.replace(/^https?:\/\//, "")}/play/{code.toUpperCase()}
            </span>
          </p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-ink-700/70 px-6 py-4">
            <span className="text-sm text-white/50">CODE</span>
            <span className="font-display text-5xl font-black tracking-[0.3em] text-tenant">
              {code.toUpperCase()}
            </span>
          </div>
        </div>

        {/* QR code (généré côté client via qrcode lib) */}
        <div className="flex justify-center">
          <div className="card-ink flex aspect-square w-72 items-center justify-center bg-white p-2">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR code pour rejoindre la session ${code}`}
                className="h-full w-full"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs text-black/50">
                Génération du QR…
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Lobby joueurs (Realtime live) ─── */}
      <div className="relative mt-14 w-full max-w-6xl">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-sm uppercase tracking-widest text-white/40">
            Joueurs connectés
          </p>
          <p className="font-display text-2xl font-black text-tenant">
            {sortedPlayers.length}
          </p>
        </div>

        {sortedPlayers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center text-white/40">
            En attente des premiers joueurs…<br />
            <span className="text-xs">
              Affiche bien le code sur la TV pour que les gens scannent.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {sortedPlayers.map((p) => (
              <div
                key={p.id}
                className="card-ink flex flex-col items-center gap-3 p-4"
              >
                <Avatar config={p.avatar_config} size="lg" />
                <p className="font-display text-base font-bold tracking-wide text-white">
                  {p.pseudo}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Bouton Lancer (visible en mode lobby uniquement) ─── */}
      {status === "lobby" && (
        <div className="relative mt-10 flex flex-col items-center gap-4">
          {/* Sélecteur nombre de rounds — seulement pour Blind Test */}
          {gameType === "blind_test" && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs uppercase tracking-widest text-white/50">
                Nombre de morceaux
              </p>
              <div className="flex gap-2">
                {[7, 12, 15].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumRounds(n)}
                    className={
                      "rounded-xl border px-4 py-2 font-display text-lg font-black transition " +
                      (numRounds === n
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-300"
                        : "border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]")
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sélecteur thème — seulement pour Quiz (ou quand pas de game_type set = fallback Quiz) */}
          {(gameType === "quiz" || !gameType) && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs uppercase tracking-widest text-white/50">
                Thème du Quiz
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {(["Mix", "Culture G", "Sport", "Amiens", "Gaming", "Musique", "Cinéma"] as const).map(
                  (t) => {
                    const emoji = {
                      Mix: "🎲",
                      "Culture G": "🧠",
                      Sport: "⚽",
                      Amiens: "🏛️",
                      Gaming: "🎮",
                      Musique: "🎵",
                      Cinéma: "🎬",
                    }[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setQuizTheme(t)}
                        className={
                          "rounded-xl border px-3 py-2 text-sm font-bold transition " +
                          (quizTheme === t
                            ? "border-violet-400 bg-violet-500/20 text-violet-200"
                            : "border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]")
                        }
                      >
                        <span aria-hidden="true">{emoji}</span> {t}
                      </button>
                    );
                  }
                )}
              </div>
              <p className="text-[10px] text-white/30">
                {quizTheme === "Mix"
                  ? "Toutes thématiques mélangées (70 questions)"
                  : "10 questions sur ce thème"}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleStart}
            disabled={actionPending || sortedPlayers.length === 0}
            className="btn-tenant disabled:cursor-not-allowed disabled:opacity-40"
          >
            {actionPending ? "Lancement…" : "Lancer la partie"}
          </button>
          <button
            type="button"
            onClick={handleEnd}
            disabled={actionPending}
            className="rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-white/70 transition hover:bg-white/[0.05]"
          >
            Annuler la session
          </button>
          </div>
        </div>
      )}
    </main>
  );
}
