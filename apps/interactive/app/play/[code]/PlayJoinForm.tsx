/**
 * <PlayJoinForm /> — formulaire d'arrivée dans une partie Interactive.
 *
 * Composant Client rendu par la page Server (qui a déjà résolu la session).
 *
 * Flow UX :
 *  1. Étape "avatar"     : picker (galerie + customs Gentil/Méchant)
 *  2. Étape "pseudo"     : récap avatar + champ pseudo + bouton "Entrer"
 *  3. Submit → INSERT dans interactive.session_players (Supabase RLS permet
 *     l'INSERT pour anon si la session est en mode 'lobby')
 *  4. Étape "waiting"    : "Tu es dans la partie ! Attends que l'animateur lance."
 *  5. Subscribe Realtime → quand la session passe en 'playing', on bascule
 *     vers l'écran de jeu (à implémenter)
 *
 * Persistance avatar :
 *  - Stocké en localStorage (clé velito-interactive-avatar) pour pré-remplir
 *    au prochain join
 *  - L'avatar choisi est aussi INSERT en jsonb dans session_players
 */
"use client";

import { useEffect, useState } from "react";
import { AvatarPicker } from "@repo/ui/avatar-picker";
import { Avatar } from "@repo/ui/avatar";
import {
  DEFAULT_AVATAR,
  parseAvatarConfig,
  type AvatarConfig,
} from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import PlayQuizGame from "./PlayQuizGame";
import PlayPetitBacGame from "./PlayPetitBacGame";
import PlayEstimGame from "./PlayEstimGame";
import PlayGeoGame from "./PlayGeoGame";

const AVATAR_STORAGE_KEY = "velito-interactive-avatar";
const PSEUDO_STORAGE_KEY = "velito-interactive-pseudo";
const PLAYER_STORAGE_KEY = "velito-interactive-player";

interface PlayJoinFormProps {
  sessionId: string;
  code: string;
  /** Type de jeu pré-sélectionné (peut changer après start si null). */
  gameType?: "quiz" | "petit_bac" | "blind_test" | "estim" | "geo" | null;
}

type Step = "avatar" | "ready" | "waiting" | "playing";

export default function PlayJoinForm({ sessionId, code, gameType }: PlayJoinFormProps) {
  const [step, setStep] = useState<Step>("avatar");
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [pseudo, setPseudo] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // 1. Au mount : restaurer avatar + pseudo + check si déjà joueur dans cette session
  useEffect(() => {
    try {
      const avatarRaw = localStorage.getItem(AVATAR_STORAGE_KEY);
      if (avatarRaw) setAvatar(parseAvatarConfig(JSON.parse(avatarRaw)));

      // Restaure le pseudo précédent (persistance globale, pas par session)
      const savedPseudo = localStorage.getItem(PSEUDO_STORAGE_KEY);
      if (savedPseudo) setPseudo(savedPseudo);

      // Check si on a déjà rejoint cette session (rejoint en cours)
      const playerRaw = localStorage.getItem(PLAYER_STORAGE_KEY);
      if (playerRaw) {
        const parsed = JSON.parse(playerRaw) as { sessionId: string; playerId: string };
        if (parsed.sessionId === sessionId) {
          setPlayerId(parsed.playerId);
          setStep("waiting");
          return;
        }
      }

      // Si on a un avatar + pseudo en mémoire ET qu'on n'est pas déjà dans la session,
      // on peut sauter directement à l'étape "ready" (preview avatar+pseudo)
      if (avatarRaw && savedPseudo) {
        setStep("ready");
      }
    } catch {
      /* localStorage indispo, on reste sur le default */
    }
    setHydrated(true);
  }, [sessionId]);

  // 2. Subscribe Realtime sur la session → si elle passe en 'playing', on bascule
  useEffect(() => {
    if (step !== "waiting") return;
    const supabase = createClient();
    const channel = supabase
      .channel(`play-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "interactive",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: string }).status;
          if (newStatus === "playing") {
            setStep("playing");
          } else if (newStatus === "ended") {
            setError("La session a été terminée par l'animateur.");
            setStep("ready");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [step, sessionId]);

  function handleAvatarSelect(config: AvatarConfig) {
    setAvatar(config);
    try {
      localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* ignore */
    }
    setStep("ready");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (pseudo.trim().length < 2) {
      setError("Pseudo trop court (2 caractères minimum).");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .schema("interactive" as never)
        .from("session_players")
        .insert({
          session_id: sessionId,
          pseudo: pseudo.trim(),
          avatar_config: avatar,
        } as never)
        .select("id")
        .single();

      if (insertError) {
        // Cas typique : pseudo déjà pris dans cette session (UNIQUE constraint)
        if (insertError.message?.includes("duplicate") || insertError.code === "23505") {
          setError("Ce pseudo est déjà pris dans cette partie. Choisis-en un autre.");
        } else {
          setError("Impossible de rejoindre la session. Réessaye.");
        }
        console.error("[PlayJoinForm] insert error:", insertError.message);
        return;
      }

      const row = data as { id: string };
      setPlayerId(row.id);

      // Mémorise qu'on est joueur dans cette session (lié au sessionId)
      try {
        localStorage.setItem(
          PLAYER_STORAGE_KEY,
          JSON.stringify({ sessionId, playerId: row.id })
        );
        // Sauve le pseudo en global pour le réutiliser à la prochaine partie
        localStorage.setItem(PSEUDO_STORAGE_KEY, pseudo.trim());
      } catch {
        /* ignore */
      }

      setStep("waiting");
    } finally {
      setSubmitting(false);
    }
  }

  // ═══════════════════ Étape AVATAR ═══════════════════
  if (step === "avatar") {
    return (
      <div className="w-full max-w-md">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive
        </p>
        <h1 className="neon-title mt-3 text-center text-4xl">Crée ton perso</h1>
        <p className="mt-2 text-center text-sm text-white/60">
          Tu rejoins la session{" "}
          <span className="font-display font-black tracking-widest text-tenant">
            {code.toUpperCase()}
          </span>
        </p>

        <div className="card-ink mt-6 p-5">
          {hydrated ? (
            <AvatarPicker
              initial={avatar}
              onSelect={handleAvatarSelect}
              ctaLabel="C'est moi"
            />
          ) : (
            <div className="grid place-items-center py-20 text-xs text-white/30">
              Chargement…
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════ Étape READY (pseudo + submit) ═══════════════════
  if (step === "ready") {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive
        </p>
        <h1 className="neon-title mt-3 text-4xl">Presque prêt</h1>
        <p className="mt-2 text-sm text-white/60">
          Session{" "}
          <span className="font-display font-black tracking-widest text-tenant">
            {code.toUpperCase()}
          </span>
        </p>

        <div className="mt-6 flex justify-center">
          <Avatar config={avatar} size="xl" className="ring-4 ring-white/15" />
        </div>
        <button
          type="button"
          onClick={() => setStep("avatar")}
          className="mt-2 text-[11px] text-white/40 underline-offset-2 transition hover:text-white hover:underline"
        >
          Changer de perso
        </button>

        <form onSubmit={handleSubmit} className="card-ink mt-6 space-y-4 p-6 text-left">
          <div>
            <label
              htmlFor="pseudo"
              className="mb-1.5 block text-xs uppercase tracking-widest text-white/50"
            >
              Ton pseudo
            </label>
            <input
              id="pseudo"
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value.slice(0, 24))}
              placeholder="Ex : Riza, MamaTeam, K7…"
              maxLength={24}
              minLength={2}
              autoComplete="off"
              required
              className="w-full rounded-xl border border-white/15 bg-ink px-4 py-3 text-white placeholder-white/30 outline-none focus:border-tenant focus:ring-2 focus:ring-tenant/30"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pseudo.trim().length < 2 || submitting}
            className="btn-tenant w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Entrée…" : "Entrer dans la partie"}
          </button>
        </form>
      </div>
    );
  }

  // ═══════════════════ Étape WAITING (en attente du host) ═══════════════════
  if (step === "waiting") {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive
        </p>
        <h1 className="neon-title mt-3 text-4xl">Tu es dans la partie 🎮</h1>
        <p className="mt-2 text-sm text-white/60">
          Session{" "}
          <span className="font-display font-black tracking-widest text-tenant">
            {code.toUpperCase()}
          </span>
        </p>

        <div className="mt-8 flex justify-center">
          <Avatar
            config={avatar}
            size="xl"
            className="ring-4 ring-tenant/40"
            pulse
          />
        </div>

        <p className="mt-6 text-sm text-white/70">
          Le pseudo <span className="font-bold text-white">{pseudo}</span> est validé.
        </p>
        <p className="mt-2 text-xs text-white/40">
          Attends que l&apos;animateur lance la partie. L&apos;écran se mettra à jour automatiquement.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-wider text-white/50">
          <span className="h-2 w-2 animate-pulse rounded-full bg-tenant" />
          En attente du lancement
        </div>
      </div>
    );
  }

  // ═══════════════════ Étape PLAYING — délègue au composant Game spécifique ═══════════════════
  if (!playerId) {
    return (
      <div className="w-full max-w-sm text-center text-white/50">
        Session corrompue. Recharge la page.
      </div>
    );
  }

  // Route selon game_type.
  if (gameType === "petit_bac") {
    return (
      <PlayPetitBacGame
        sessionId={sessionId}
        playerId={playerId}
        pseudo={pseudo}
        avatar={avatar}
      />
    );
  }
  if (gameType === "estim") {
    return (
      <PlayEstimGame
        sessionId={sessionId}
        playerId={playerId}
        pseudo={pseudo}
        avatar={avatar}
      />
    );
  }
  if (gameType === "geo") {
    return (
      <PlayGeoGame
        sessionId={sessionId}
        playerId={playerId}
        pseudo={pseudo}
        avatar={avatar}
      />
    );
  }

  return (
    <PlayQuizGame
      sessionId={sessionId}
      playerId={playerId}
      pseudo={pseudo}
      avatar={avatar}
    />
  );
}
