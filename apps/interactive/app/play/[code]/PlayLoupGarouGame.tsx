/**
 * <PlayLoupGarouGame /> — Vue téléphone du joueur Loup-Garou.
 *
 * Affiche son rôle privé (fetché via RPC get_my_lg_role avec token).
 * Selon la phase + son rôle, affiche l'action à faire ou un écran "Tu dors 🌙".
 */
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Avatar } from "@repo/ui/avatar";
import type { AvatarConfig } from "@repo/ui/avatar-data";
import { createClient } from "@/lib/supabase/client";
import {
  ROLE_LABELS,
  ROLE_EMOJIS,
  ROLE_DESCRIPTIONS,
  type LGRole,
  type LGState,
} from "@/lib/games/loup-garou";
import NextSessionInput from "./NextSessionInput";

interface PlayLoupGarouGameProps {
  sessionId: string;
  playerId: string;
  pseudo: string;
  avatar: AvatarConfig;
}

interface MyRole {
  role: LGRole;
  alive: boolean;
  is_mayor: boolean;
  lover_of: string | null;
  witch_life_potion_used: boolean;
  witch_death_potion_used: boolean;
  hunter_shot_taken: boolean;
}

interface PlayerSummary {
  id: string;
  pseudo: string;
  alive: boolean;
}

const PLAYER_TOKEN_KEY = "velito-interactive-player-token";

export default function PlayLoupGarouGame({
  sessionId,
  playerId,
  pseudo,
  avatar,
}: PlayLoupGarouGameProps) {
  const [state, setState] = useState<LGState | null>(null);
  const [myRole, setMyRole] = useState<MyRole | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerSummary[]>([]);
  const [wolfTeammates, setWolfTeammates] = useState<string[]>([]);
  const [seerSawRole, setSeerSawRole] = useState<{ pseudo: string; role: LGRole } | null>(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);

  // Player token — useState (PAS useMemo) pour que le re-render soit déclenché
  // quand on le récupère depuis la DB. Le useMemo précédent ne s'invalidait jamais
  // → playerToken restait null → loadMyRole skipait → joueur bloqué sur "Chargement".
  const [playerToken, setPlayerToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(PLAYER_TOKEN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        return parsed[playerId] ?? null;
      }
    } catch {}
    return null;
  });

  // Fetch token depuis la BDD si pas en localStorage (premier join, autre device, etc.)
  // RLS : SELECT public sur player_token autorisé.
  useEffect(() => {
    if (playerToken) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .schema("interactive" as never)
        .from("session_players")
        .select("player_token")
        .eq("id", playerId)
        .single();
      if (cancelled || !data) return;
      const token = (data as { player_token: string }).player_token;
      if (!token) return;
      // 1. Persiste en localStorage pour les prochains mounts
      try {
        const raw = localStorage.getItem(PLAYER_TOKEN_KEY);
        const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        map[playerId] = token;
        localStorage.setItem(PLAYER_TOKEN_KEY, JSON.stringify(map));
      } catch {}
      // 2. Set le state React → déclenche le re-render + loadMyRole peut tourner
      setPlayerToken(token);
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId, playerToken]);

  // Fetch role + state
  const loadMyRole = useCallback(async () => {
    if (!playerToken) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .schema("interactive" as never)
      .rpc("get_my_lg_role", {
        p_player_id: playerId,
        p_player_token: playerToken,
      });
    if (!error && data && Array.isArray(data) && data.length > 0) {
      setMyRole(data[0] as MyRole);
    }
  }, [playerId, playerToken]);

  useEffect(() => {
    const supabase = createClient();

    async function loadAll() {
      const [sessionRes, playersRes, rolesRes] = await Promise.all([
        supabase.schema("interactive" as never).from("sessions").select("current_state").eq("id", sessionId).single(),
        supabase.schema("interactive" as never).from("session_players").select("id, pseudo").eq("session_id", sessionId),
        supabase.schema("interactive" as never).from("lg_player_roles").select("player_id, role, alive").eq("session_id", sessionId),
      ]);
      if (sessionRes.data) {
        setState((sessionRes.data as { current_state: LGState }).current_state);
      }
      const players = (playersRes.data ?? []) as Array<{ id: string; pseudo: string }>;
      const roles = (rolesRes.data ?? []) as Array<{ player_id: string; role: string; alive: boolean }>;
      setAllPlayers(players.map((p) => ({
        id: p.id,
        pseudo: p.pseudo,
        alive: roles.find((r) => r.player_id === p.id)?.alive ?? true,
      })));
      // Si je suis loup, voir mes congénères
      const myRoleData = roles.find((r) => r.player_id === playerId);
      if (myRoleData?.role === "wolf" || myRoleData?.role === "white_wolf") {
        setWolfTeammates(roles.filter((r) => r.role === "wolf").map((r) => r.player_id));
      }
      loadMyRole();
    }
    loadAll();

    const channel = supabase.channel(`play-lg-${playerId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` }, (payload) => {
        const newState = (payload.new as { current_state: LGState }).current_state;
        setState((prevState) => {
          // Reset seerSawRole si on change de phase (sinon Voyante voit le résultat du tour précédent
          // sans avoir cliqué — bug remonté en prod le 09/06/2026)
          if (prevState?.phase !== newState.phase) {
            setSeerSawRole(null);
          }
          return newState;
        });
        setVoteSubmitted(false); // reset à chaque changement de phase
        loadMyRole();
      })
      .on("postgres_changes", { event: "*", schema: "interactive", table: "lg_player_roles", filter: `session_id=eq.${sessionId}` }, () => {
        loadAll();
        // Quand un INSERT/UPDATE arrive sur lg_player_roles, mon rôle peut venir d'arriver
        loadMyRole();
      })
      .subscribe();

    // Retry périodique de loadMyRole si on n'a pas encore notre rôle
    // (sécurité au cas où le Realtime aurait raté un event)
    const retryInterval = setInterval(() => {
      loadMyRole();
    }, 3000);
    setTimeout(() => clearInterval(retryInterval), 30000); // arrête après 30s
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, playerId, loadMyRole]);

  // Cas où le state n'est pas encore chargé (premier render)
  if (!state) {
    return <div className="w-full max-w-sm text-center text-white/40">Connexion à la partie…</div>;
  }

  // Cas où la partie n'a pas encore démarré → pas de rôle distribué
  if (!myRole && state.phase === "setup") {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-9xl">⏳</p>
        <h1 className="neon-title mt-4 text-2xl">En attente</h1>
        <p className="mt-2 text-sm text-white/60">
          L&apos;animateur va lancer la partie. Ton rôle te sera révélé dans un instant.
        </p>
      </div>
    );
  }

  // Cas où la partie a démarré mais myRole pas encore arrivé (Realtime un peu en retard)
  if (!myRole) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-9xl">🌙</p>
        <h1 className="neon-title mt-4 text-2xl">Récupération de ton rôle…</h1>
        <p className="mt-3 text-xs text-white/40">
          Si ça bloque plus de 10 secondes, recharge la page.
        </p>
      </div>
    );
  }

  // ─── PARTIE TERMINÉE ──────────────────────────────────────────────────
  // Layout compact : tout doit tenir dans le viewport mobile sans scroll.
  // Le NextSessionInput est mis en avant car c'est la prochaine action attendue.
  if (state.phase === "ended") {
    const won =
      (state.winnerCamp === "wolves" && (myRole.role === "wolf" || myRole.role === "white_wolf")) ||
      (state.winnerCamp === "village" && myRole.role !== "wolf" && myRole.role !== "white_wolf") ||
      (state.winnerCamp === "white_wolf" && myRole.role === "white_wolf" && myRole.alive) ||
      (state.winnerCamp === "lovers" && myRole.lover_of);
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
          Loup-Garou · Terminé
        </p>
        <h1 className={"mt-2 font-display text-3xl font-black " + (won ? "text-emerald-300" : "text-red-300")}>
          {won ? "VICTOIRE 🏆" : "Défaite"}
        </h1>
        <p className="mt-2 text-xs text-white/60">
          Tu étais {ROLE_EMOJIS[myRole.role]} <span className="font-bold">{ROLE_LABELS[myRole.role]}</span>
        </p>
        <NextSessionInput />
      </div>
    );
  }

  // ─── MORT ─────────────────────────────────────────────────────────────
  // On masque toujours le rôle du mort derrière un shield (sinon un voisin
  // voit qui tu étais — spoiler des autres rôles encore vivants par déduction).
  if (!myRole.alive) {
    return (
      <PrivacyShield
        revealLabel="Voir ton rôle (tu es mort)"
        cycle={state.cycleNumber}
        phaseLabel="Mort"
        autoHideMs={10000}
      >
        <div className="w-full max-w-sm text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Tu es mort 💀
          </p>
          <h1 className="neon-title mt-3 text-2xl">{ROLE_LABELS[myRole.role]}</h1>
          <p className="mt-4 text-sm text-white/60">
            Tu peux suivre la partie sur l&apos;écran TV.
          </p>
          <p className="mt-2 text-xs text-white/40">
            Pas un mot sur ce que tu sais. Sois honnête.
          </p>
        </div>
      </PrivacyShield>
    );
  }

  return (
    <PhaseActionPanel
      state={state}
      myRole={myRole}
      playerId={playerId}
      playerToken={playerToken ?? ""}
      sessionId={sessionId}
      pseudo={pseudo}
      avatar={avatar}
      allPlayers={allPlayers}
      wolfTeammates={wolfTeammates}
      seerSawRole={seerSawRole}
      setSeerSawRole={setSeerSawRole}
      voteSubmitted={voteSubmitted}
      setVoteSubmitted={setVoteSubmitted}
    />
  );
}

function PhaseActionPanel({
  state, myRole, playerId, playerToken, sessionId, pseudo, avatar, allPlayers, wolfTeammates,
  seerSawRole, setSeerSawRole, voteSubmitted, setVoteSubmitted,
}: {
  state: LGState; myRole: MyRole; playerId: string; playerToken: string;
  sessionId: string; pseudo: string; avatar: AvatarConfig;
  allPlayers: PlayerSummary[]; wolfTeammates: string[];
  seerSawRole: { pseudo: string; role: LGRole } | null;
  setSeerSawRole: (v: { pseudo: string; role: LGRole } | null) => void;
  voteSubmitted: boolean;
  setVoteSubmitted: (v: boolean) => void;
}) {
  const supabase = createClient();
  const alivePlayers = allPlayers.filter((p) => p.alive && p.id !== playerId);

  async function submitVote(voteRound: string, targetId: string, target2Id?: string) {
    // UPSERT
    await supabase.schema("interactive" as never).from("lg_votes").upsert({
      session_id: sessionId,
      vote_round: voteRound,
      voter_id: playerId,
      target_id: targetId,
      target2_id: target2Id,
    } as never, { onConflict: "vote_round,voter_id" });
    setVoteSubmitted(true);
  }

  async function seerPeek(targetId: string) {
    const { data, error } = await supabase
      .schema("interactive" as never)
      .rpc("lg_seer_peek", {
        p_session_id: sessionId,
        p_seer_id: playerId,
        p_seer_token: playerToken,
        p_target_id: targetId,
      });
    if (!error && data && Array.isArray(data) && data[0]) {
      const targetPseudo = allPlayers.find((p) => p.id === targetId)?.pseudo ?? "?";
      const role = (data[0] as { target_role: LGRole }).target_role;
      setSeerSawRole({ pseudo: targetPseudo, role });
    }
  }

  const phase = state.phase;
  const cycle = state.cycleNumber;

  // ─── CUPIDON première nuit ───
  if (phase === "cupid_link" && myRole.role === "cupid") {
    const [first, setFirst] = useState<string | null>(null);
    return (
      <CupidPicker
        allPlayers={allPlayers}
        playerId={playerId}
        first={first}
        setFirst={setFirst}
        onSubmit={(t1, t2) => submitVote("cupid_link", t1, t2)}
        voteSubmitted={voteSubmitted}
      />
    );
  }

  // ─── Lovers reveal ───
  if (phase === "lovers_reveal") {
    if (myRole.lover_of) {
      const lover = allPlayers.find((p) => p.id === myRole.lover_of);
      return (
        <PrivacyShield revealLabel="Voir ton amoureux" cycle={cycle} phaseLabel="Cupidon" autoHideMs={12000}>
          <Panel title="💘 Tu es amoureux">
            <p>Tu aimes <span className="font-bold text-pink-300">{lover?.pseudo}</span>. Si l&apos;un de vous meurt, l&apos;autre mourra de chagrin. Vous gagnez ensemble.</p>
          </Panel>
        </PrivacyShield>
      );
    }
    return <SleepScreen />;
  }

  // ─── Élection Maire ───
  if (phase === "mayor_election") {
    return (
      <VotePanel
        title="👑 Élis ton Maire"
        subtitle="Le Maire a un vote double et tranche les égalités"
        candidates={allPlayers.filter((p) => p.alive)}
        onVote={(targetId) => submitVote("day_0_mayor", targetId)}
        voteSubmitted={voteSubmitted}
      />
    );
  }

  // ─── Nuit — VOYANTE ───
  if (phase === "night_seer") {
    if (myRole.role !== "seer") return <SleepScreen />;
    if (seerSawRole) {
      return (
        <PrivacyShield revealLabel="Voir ce que tu as vu" cycle={cycle} phaseLabel="Voyante" autoHideMs={15000}>
          <Panel title="🔮 Voyante">
            <p><span className="font-bold">{seerSawRole.pseudo}</span> est :</p>
            <p className="mt-2 font-display text-3xl font-black text-cyan-300">
              {ROLE_EMOJIS[seerSawRole.role]} {ROLE_LABELS[seerSawRole.role]}
            </p>
            <p className="mt-4 text-xs italic text-white/50">Garde ce secret. Personne ne doit savoir.</p>
          </Panel>
        </PrivacyShield>
      );
    }
    return (
      <PrivacyShield revealLabel="Voir ton action (Voyante)" cycle={cycle} phaseLabel="Voyante">
        <Panel title="🔮 Voyante — choisis un joueur">
          <div className="mt-4 grid grid-cols-2 gap-2">
            {alivePlayers.map((p) => (
              <button key={p.id} onClick={() => seerPeek(p.id)} className="rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-3 text-sm font-medium text-white hover:bg-cyan-500/15">
                {p.pseudo}
              </button>
            ))}
          </div>
        </Panel>
      </PrivacyShield>
    );
  }

  // ─── Nuit — LOUPS ───
  if (phase === "night_wolves") {
    if (myRole.role !== "wolf" && myRole.role !== "white_wolf") return <SleepScreen />;
    const wolves = allPlayers.filter((p) => wolfTeammates.includes(p.id) && p.id !== playerId);
    return (
      <PrivacyShield revealLabel="Voir ton action (Loup)" cycle={cycle} phaseLabel="Les Loups">
        <Panel title="🐺 Les Loups">
          {wolves.length > 0 && (
            <p className="mb-3 text-xs text-white/60">Tes congénères : <span className="font-bold text-red-300">{wolves.map((w) => w.pseudo).join(", ")}</span></p>
          )}
          <VotePanel
            title="Choisis la victime"
            candidates={alivePlayers.filter((p) => !wolfTeammates.includes(p.id))}
            onVote={(targetId) => submitVote(`night_${cycle}_wolves`, targetId)}
            voteSubmitted={voteSubmitted}
            inline
          />
        </Panel>
      </PrivacyShield>
    );
  }

  // ─── Nuit — LOUP BLANC ───
  if (phase === "night_white_wolf") {
    if (myRole.role !== "white_wolf") return <SleepScreen />;
    const wolves = allPlayers.filter((p) => wolfTeammates.includes(p.id) && p.alive);
    return (
      <PrivacyShield revealLabel="Voir ton action (Loup Blanc)" cycle={cycle} phaseLabel="Loup Blanc">
        <VotePanel
          title="👹 Loup Blanc — dévore un loup ou passe"
          subtitle="Tu peux tuer un loup pour gagner seul à la fin"
          candidates={wolves}
          onVote={(targetId) => submitVote(`night_${cycle}_white_wolf`, targetId)}
          voteSubmitted={voteSubmitted}
          allowSkip
          onSkip={() => setVoteSubmitted(true)}
        />
      </PrivacyShield>
    );
  }

  // ─── Nuit — SORCIÈRE ───
  if (phase === "night_witch") {
    if (myRole.role !== "witch") return <SleepScreen />;
    return (
      <PrivacyShield revealLabel="Voir ton action (Sorcière)" cycle={cycle} phaseLabel="Sorcière">
        <WitchPanel
          state={state}
          myRole={myRole}
          allPlayers={allPlayers}
          playerId={playerId}
          onSave={(targetId) => submitVote(`night_${cycle}_witch_save`, targetId)}
          onKill={(targetId) => submitVote(`night_${cycle}_witch_kill`, targetId)}
          voteSubmitted={voteSubmitted}
        />
      </PrivacyShield>
    );
  }

  // ─── Jour — VOTE VILLAGE ───
  if (phase === "day_vote") {
    return (
      <VotePanel
        title={myRole.is_mayor ? "👑 Vote (Maire = vote double)" : "Vote du village"}
        subtitle="Qui veux-tu éliminer ?"
        candidates={alivePlayers}
        onVote={(targetId) => submitVote(`day_${cycle}_village`, targetId)}
        voteSubmitted={voteSubmitted}
      />
    );
  }

  // ─── Chasseur tire ───
  if (phase === "hunter_shot" && state.hunterToShootId === playerId) {
    return (
      <VotePanel
        title="🏹 Tire ta dernière balle"
        subtitle="Tu meurs, mais tu emportes un joueur avec toi"
        candidates={alivePlayers.filter((p) => p.id !== playerId)}
        onVote={(targetId) => submitVote(`hunter_${cycle}_${playerId}`, targetId)}
        voteSubmitted={voteSubmitted}
      />
    );
  }

  // ─── Day reveal / debate / resolve — phase publique, on cache le rôle
  // par défaut (sinon quelqu'un qui passe à côté lit "Tu es Voyante" en gros).
  if (phase === "day_reveal" || phase === "day_debate" || phase === "day_resolve") {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          {phase === "day_debate" ? "🗣️ Discute à voix haute" : "☀️ Le jour"}
        </p>
        <p className="mt-2 text-sm text-white/60">
          Regarde la TV pour le détail.
        </p>
        <div className="mt-6">
          <PrivacyShield revealLabel="Rappel de mon rôle" cycle={cycle} phaseLabel="Le jour" autoHideMs={8000}>
            <Panel title="🎭 Ton rôle">
              <RoleCard role={myRole.role} />
            </Panel>
          </PrivacyShield>
        </div>
      </div>
    );
  }

  // Par défaut : dort
  return <SleepScreen myRole={myRole} />;
}

// ─── Sous-composants ────────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">{title}</p>
      <div className="card-ink mt-4 p-5 text-left text-sm text-white/80">{children}</div>
    </div>
  );
}

function SleepScreen({ myRole: _myRole }: { myRole?: MyRole }) {
  // Anti-trahison : on n'affiche PLUS "Tu es Voyante" en bas (sinon quelqu'un
  // qui regarde ton tel pendant que tu dors voit ton rôle). Le rôle est dispo
  // uniquement via le PrivacyShield au-dessus de cette vue dans les phases
  // d'action. Ici on affiche juste la lune.
  return (
    <div className="w-full max-w-sm text-center">
      <p className="text-9xl">🌙</p>
      <h1 className="neon-title mt-4 text-2xl">Tu dors</h1>
      <p className="mt-1 text-xs text-white/40">L&apos;action continue ailleurs.</p>
    </div>
  );
}

/**
 * <PrivacyShield /> — Masque le contenu sensible derrière un écran neutre.
 *
 * Par défaut : on voit un écran "Velito Interactive · LG · Cycle X" avec un
 * bouton "👁️ Voir mon rôle / mon action".
 * Au clic → reveal du contenu enfant + bouton "🙈 Cacher".
 * Si `autoHideMs` > 0, le contenu se re-cache automatiquement après ce délai
 * (protection si tu cliques "Voir" et que tu poses ton tel sans cacher).
 *
 * Usage type :
 *   <PrivacyShield revealLabel="Voir mon rôle" cycle={1} phase="Setup">
 *     <RoleCard role={myRole.role} />
 *   </PrivacyShield>
 */
function PrivacyShield({
  children,
  revealLabel = "Voir",
  cycle,
  phaseLabel,
  autoHideMs = 0,
}: {
  children: React.ReactNode;
  revealLabel?: string;
  cycle?: number;
  phaseLabel?: string;
  autoHideMs?: number;
}) {
  const [revealed, setRevealed] = useState(false);

  // Auto-hide après autoHideMs si > 0
  useEffect(() => {
    if (!revealed || !autoHideMs) return;
    const timer = setTimeout(() => setRevealed(false), autoHideMs);
    return () => clearTimeout(timer);
  }, [revealed, autoHideMs]);

  if (!revealed) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Velito Interactive · Loup-Garou
        </p>
        {cycle !== undefined && (
          <p className="mt-1 text-xs text-white/50">
            Cycle {cycle}
            {phaseLabel && <span> · {phaseLabel}</span>}
          </p>
        )}
        <div className="mt-12 mb-8">
          <p className="text-8xl">🎭</p>
        </div>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="btn-tenant"
        >
          👁️ {revealLabel}
        </button>
        <p className="mt-6 text-[11px] italic text-white/40">
          Personne ne doit voir ton écran.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {children}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setRevealed(false)}
          className="rounded-xl border border-white/20 px-4 py-2 text-xs text-white/70 hover:bg-white/[0.05]"
        >
          🙈 Cacher
        </button>
      </div>
    </div>
  );
}

function RoleCard({ role }: { role: LGRole }) {
  return (
    <div className="mt-2">
      <p className="text-7xl">{ROLE_EMOJIS[role]}</p>
      <p className="mt-2 font-display text-xl font-black text-white">{ROLE_LABELS[role]}</p>
      <p className="mt-2 text-xs italic text-white/60">{ROLE_DESCRIPTIONS[role]}</p>
    </div>
  );
}

function VotePanel({
  title, subtitle, candidates, onVote, voteSubmitted, inline, allowSkip, onSkip,
}: {
  title: string; subtitle?: string;
  candidates: PlayerSummary[];
  onVote: (targetId: string) => void;
  voteSubmitted: boolean;
  inline?: boolean;
  allowSkip?: boolean;
  onSkip?: () => void;
}) {
  const Wrapper = inline ? "div" : Panel;
  const inner = (
    <>
      {!inline && <p className="text-xs uppercase tracking-[0.3em] text-white/40">{title}</p>}
      {inline && <p className="mb-2 text-xs uppercase tracking-widest text-white/50">{title}</p>}
      {subtitle && <p className={inline ? "mb-2 text-xs text-white/50" : "mt-1 text-xs text-white/60"}>{subtitle}</p>}
      {voteSubmitted ? (
        <p className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-center text-emerald-300">
          ✓ Vote envoyé · attente résolution
        </p>
      ) : (
        <>
          <div className={inline ? "mt-2 grid grid-cols-2 gap-2" : "card-ink mt-3 grid grid-cols-2 gap-2 p-3"}>
            {candidates.map((p) => (
              <button key={p.id} onClick={() => onVote(p.id)} className="rounded-xl border border-white/15 bg-white/[0.04] p-3 text-sm font-medium text-white hover:bg-white/[0.08]">
                {p.pseudo}
              </button>
            ))}
          </div>
          {allowSkip && (
            <button onClick={() => onSkip?.()} className="mt-3 w-full rounded-xl border border-white/20 bg-white/[0.04] p-2 text-xs text-white/60 hover:bg-white/[0.08]">
              Passer ce tour
            </button>
          )}
        </>
      )}
    </>
  );
  if (inline) {
    return <div>{inner}</div>;
  }
  return <Wrapper title={title}>{inner}</Wrapper>;
}

function CupidPicker({
  allPlayers, playerId, first, setFirst, onSubmit, voteSubmitted,
}: {
  allPlayers: PlayerSummary[]; playerId: string;
  first: string | null;
  setFirst: (v: string | null) => void;
  onSubmit: (t1: string, t2: string) => void;
  voteSubmitted: boolean;
}) {
  const candidates = allPlayers.filter((p) => p.alive);
  if (voteSubmitted) {
    return <Panel title="💘 Cupidon"><p>Tes 2 amoureux sont scellés. Ils se reconnaîtront tout à l&apos;heure.</p></Panel>;
  }
  return (
    <Panel title="💘 Cupidon — choisis 2 amoureux">
      <p className="mb-2 text-xs text-white/50">
        {first ? "Choisis le 2e amoureux" : "Choisis le 1er amoureux (peut être toi)"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              if (!first) setFirst(p.id);
              else if (first !== p.id) onSubmit(first, p.id);
            }}
            className={
              "rounded-xl border p-3 text-sm font-medium text-white " +
              (first === p.id ? "border-pink-400 bg-pink-500/20" :
               "border-white/15 bg-white/[0.04] hover:bg-white/[0.08]")
            }
          >
            {p.pseudo}{p.id === playerId ? " (toi)" : ""}{first === p.id ? " ✓" : ""}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function WitchPanel({
  state, myRole, allPlayers, playerId, onSave, onKill, voteSubmitted,
}: {
  state: LGState; myRole: MyRole;
  allPlayers: PlayerSummary[]; playerId: string;
  onSave: (targetId: string) => void;
  onKill: (targetId: string) => void;
  voteSubmitted: boolean;
}) {
  const victim = allPlayers.find((p) => p.id === state.wolvesVictimId);
  return (
    <Panel title="🧙‍♀️ Sorcière">
      <p className="mb-3 text-sm">
        Les loups ont attaqué : {victim ? <span className="font-bold text-red-300">{victim.pseudo}</span> : <span className="italic text-white/50">personne</span>}
      </p>
      <div className="space-y-3">
        {/* Sauver */}
        {!myRole.witch_life_potion_used && victim && (
          <button onClick={() => onSave(victim.id)} className="w-full rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-200">
            💚 Sauver {victim.pseudo} (potion vie)
          </button>
        )}
        {/* Tuer */}
        {!myRole.witch_death_potion_used && (
          <div>
            <p className="text-xs text-white/50">💀 Tuer quelqu&apos;un (potion mort)</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {allPlayers.filter((p) => p.alive && p.id !== playerId).map((p) => (
                <button key={p.id} onClick={() => onKill(p.id)} className="rounded-xl border border-red-400/40 bg-red-500/10 p-2 text-xs text-white">
                  {p.pseudo}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {voteSubmitted && (
        <p className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-center text-emerald-300">
          ✓ Choix envoyé
        </p>
      )}
    </Panel>
  );
}
