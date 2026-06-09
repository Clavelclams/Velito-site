/**
 * <HostLoupGarouGame /> — Écran TV / narrateur Loup-Garou V1 COMPLET.
 *
 * Le HOST clique "Phase suivante" pour faire avancer le jeu, après que les
 * joueurs concernés aient agi sur leur tel. Pas de narration audio en V1.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@repo/ui/avatar";
import { parseAvatarConfig } from "@repo/ui/avatar-data";
import {
  ROLE_LABELS,
  ROLE_EMOJIS,
  type LGState,
} from "@/lib/games/loup-garou";
import { nextLGPhaseAction, endLGGameAction } from "./loupgarou-actions";
import MuteFooter from "./MuteFooter";

interface SessionPlayer {
  id: string;
  pseudo: string;
  avatar_config: ReturnType<typeof parseAvatarConfig>;
}
interface PlayerRoleRow {
  player_id: string;
  role: string;
  alive: boolean;
  is_mayor: boolean;
  death_reason: string | null;
}

interface HostLoupGarouGameProps {
  sessionId: string;
  initialState: LGState;
  status: string;
}

const PHASE_TITLES: Record<string, string> = {
  setup: "Distribution des rôles",
  cupid_link: "Nuit 0 — Cupidon désigne les amoureux",
  lovers_reveal: "Les amoureux se reconnaissent",
  mayor_election: "Élection du Maire du village",
  night_seer: "Nuit — La Voyante regarde",
  night_wolves: "Nuit — Les Loups choisissent une victime",
  night_white_wolf: "Nuit — Le Loup Blanc rôde",
  night_witch: "Nuit — La Sorcière décide",
  night_resolve: "Résolution de la nuit",
  day_reveal: "Le jour se lève…",
  day_debate: "Débat — accusez, défendez-vous !",
  day_vote: "Vote du village",
  day_resolve: "Verdict du village",
  hunter_shot: "Le Chasseur tire sa dernière balle",
  ended: "Fin de la partie",
};

export default function HostLoupGarouGame({
  sessionId,
  initialState,
  status: initialStatus,
}: HostLoupGarouGameProps) {
  const router = useRouter();
  const [state, setState] = useState<LGState>(initialState);
  const [status, setStatus] = useState(initialStatus);
  const [players, setPlayers] = useState<SessionPlayer[]>([]);
  const [roles, setRoles] = useState<PlayerRoleRow[]>([]);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [{ data: pData }, { data: rData }] = await Promise.all([
        supabase.schema("interactive" as never).from("session_players")
          .select("id, pseudo, avatar_config").eq("session_id", sessionId),
        supabase.schema("interactive" as never).from("lg_player_roles")
          .select("player_id, role, alive, is_mayor, death_reason").eq("session_id", sessionId),
      ]);
      setPlayers(((pData ?? []) as Array<{ id: string; pseudo: string; avatar_config: unknown }>)
        .map((r) => ({ id: r.id, pseudo: r.pseudo, avatar_config: parseAvatarConfig(r.avatar_config) })));
      setRoles((rData ?? []) as PlayerRoleRow[]);
    }
    load();

    const channel = supabase.channel(`lg-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "interactive", table: "lg_player_roles", filter: `session_id=eq.${sessionId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "interactive", table: "lg_votes", filter: `session_id=eq.${sessionId}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "interactive", table: "sessions", filter: `id=eq.${sessionId}` }, (payload) => {
        const r = payload.new as { status: string; current_state: LGState };
        setStatus(r.status);
        setState(r.current_state);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const sortedAlive = useMemo(() =>
    players.filter((p) => roles.find((r) => r.player_id === p.id)?.alive),
    [players, roles]);
  const sortedDead = useMemo(() =>
    players.filter((p) => !roles.find((r) => r.player_id === p.id)?.alive),
    [players, roles]);
  const mayorId = useMemo(() => roles.find((r) => r.is_mayor)?.player_id, [roles]);

  async function handleNext() {
    setActionPending(true);
    await nextLGPhaseAction(sessionId);
    setActionPending(false);
  }
  async function handleEnd() {
    if (!confirm("Terminer la partie ?")) return;
    setActionPending(true);
    await endLGGameAction(sessionId);
    setActionPending(false);
  }

  const isNight = state.phase.startsWith("night") || state.phase === "cupid_link" || state.phase === "lovers_reveal";
  const bgClass = isNight ? "bg-gradient-to-b from-indigo-950 via-ink to-ink"
    : state.phase === "ended" ? "bg-ink"
    : "bg-gradient-to-b from-amber-500/5 via-ink to-ink";

  // ─── FIN DE PARTIE ──────────────────────────────────────────────────────
  if (state.phase === "ended" || status === "ended") {
    const winnerLabel =
      state.winnerCamp === "wolves" ? "🐺 Les Loups l'emportent" :
      state.winnerCamp === "village" ? "🧑‍🌾 Le Village l'emporte" :
      state.winnerCamp === "white_wolf" ? "👹 Le Loup Blanc l'emporte SEUL" :
      state.winnerCamp === "lovers" ? "💘 Les Amoureux gagnent" :
      "Partie terminée";
    return (
      <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-10">
        <div className="relative mx-auto w-full max-w-7xl">
          <header className="mb-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Velito Interactive · LOUP-GAROU</p>
            <h2 className="neon-title mt-2 text-3xl">{winnerLabel}</h2>
          </header>

          <p className="mb-3 text-center text-xs uppercase tracking-[0.3em] text-white/40">Les rôles révélés</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {players.map((p) => {
              const r = roles.find((x) => x.player_id === p.id);
              return (
                <div key={p.id} className={"flex items-center gap-3 rounded-2xl border p-3 " + (r?.alive ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10 bg-white/[0.03] opacity-60")}>
                  <Avatar config={p.avatar_config} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{p.pseudo}</p>
                    <p className="text-xs text-white/60">
                      {ROLE_EMOJIS[r?.role as keyof typeof ROLE_EMOJIS] ?? ""}{" "}
                      {ROLE_LABELS[r?.role as keyof typeof ROLE_LABELS] ?? "?"}
                      {r?.alive ? "" : " · 💀"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex justify-center">
            <button type="button" onClick={() => router.push("/dashboard")} className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#04040e] hover:bg-white/90">
              Retour au dashboard
            </button>
          </div>
        </div>
        <MuteFooter />
      </main>
    );
  }

  return (
    <main className={`relative flex min-h-screen flex-col items-center px-6 py-10 transition-colors duration-500 ${bgClass}`}>
      <div className="relative w-full max-w-6xl">
        <header className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Velito Interactive · LOUP-GAROU · Cycle {state.cycleNumber}
          </p>
          <h1 className="neon-title mt-2 text-3xl sm:text-5xl">
            {PHASE_TITLES[state.phase] ?? state.phase}
          </h1>
        </header>

        {/* Narration contextuelle */}
        <NarrationPanel phase={state.phase} state={state} players={players} />

        {/* Joueurs vivants vs morts */}
        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-center text-xs uppercase tracking-[0.3em] text-emerald-300">
              Vivants ({sortedAlive.length})
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {sortedAlive.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-2">
                  <Avatar config={p.avatar_config} size="xs" />
                  <p className="text-[10px] font-medium text-white">{p.pseudo}</p>
                  {p.id === mayorId && <p className="text-[10px]">👑</p>}
                </div>
              ))}
            </div>
          </div>

          {sortedDead.length > 0 && (
            <div>
              <p className="mb-3 text-center text-xs uppercase tracking-[0.3em] text-red-300">
                Morts ({sortedDead.length})
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {sortedDead.map((p) => {
                  const r = roles.find((x) => x.player_id === p.id);
                  return (
                    <div key={p.id} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-2 opacity-60">
                      <Avatar config={p.avatar_config} size="xs" />
                      <p className="text-[10px] font-medium text-white line-through">{p.pseudo}</p>
                      <p className="text-[10px] text-white/60">
                        {ROLE_EMOJIS[r?.role as keyof typeof ROLE_EMOJIS] ?? ""}{" "}
                        {ROLE_LABELS[r?.role as keyof typeof ROLE_LABELS] ?? "?"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Boutons host */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={handleNext} disabled={actionPending} className="btn-tenant">
            {actionPending ? "…" : "Phase suivante →"}
          </button>
          <button type="button" onClick={handleEnd} disabled={actionPending} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white/70 hover:bg-white/[0.05]">
            Terminer la partie
          </button>
        </div>
      </div>
      <MuteFooter />
    </main>
  );
}

function NarrationPanel({ phase, state, players }: { phase: string; state: LGState; players: SessionPlayer[] }) {
  const findPlayer = (id?: string) => players.find((p) => p.id === id)?.pseudo ?? "?";

  let body: React.ReactNode = null;
  switch (phase) {
    case "cupid_link":
      body = <p>Cupidon, désigne discrètement 2 amoureux sur ton tel. Ils peuvent se voir entre eux mais ne révèlent rien aux autres.</p>;
      break;
    case "lovers_reveal":
      body = <p>Les amoureux ont reçu le nom de l&apos;autre sur leur tel. Ils gagnent ensemble même de camps opposés.</p>;
      break;
    case "mayor_election":
      body = <p>Tout le village vote pour le Maire sur son tel. Le Maire aura un vote double et tranchera les égalités.</p>;
      break;
    case "night_seer":
      body = <p>🌙 La Voyante (et elle seule) regarde son tel. Elle choisit un joueur et découvre son rôle.</p>;
      break;
    case "night_wolves":
      body = <p>🐺 Les Loups se réveillent et votent ensemble pour une victime sur leur tel.</p>;
      break;
    case "night_white_wolf":
      body = <p>👹 Le Loup Blanc se réveille seul. Il peut dévorer un loup (ou passer).</p>;
      break;
    case "night_witch":
      body = <p>🧙‍♀️ La Sorcière regarde son tel. Elle voit qui les loups ont attaqué. Elle peut sauver, et/ou éliminer un joueur.</p>;
      break;
    case "day_reveal":
      body = (
        <div>
          {state.lastNightDeaths && state.lastNightDeaths.length > 0 ? (
            <>
              <p>Cette nuit, le village pleure :</p>
              <ul className="mt-2 space-y-1">
                {state.lastNightDeaths.map((id) => (
                  <li key={id} className="font-bold text-red-300">• {findPlayer(id)}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>Cette nuit, personne n&apos;est mort. Quel calme étrange…</p>
          )}
        </div>
      );
      break;
    case "day_debate":
      body = <p>Discutez à voix haute. Accusez, défendez-vous. Quand vous êtes prêts, passez au vote.</p>;
      break;
    case "day_vote":
      body = <p>Chacun vote sur son tel le joueur à éliminer. Le Maire compte double.</p>;
      break;
    case "day_resolve":
      body = state.lastDayVictimId
        ? <p>Le village a éliminé : <span className="font-bold text-red-300">{findPlayer(state.lastDayVictimId)}</span></p>
        : <p>Le village n&apos;a pas réussi à se mettre d&apos;accord. Personne n&apos;est éliminé.</p>;
      break;
    case "hunter_shot":
      body = <p>🏹 <span className="font-bold">{findPlayer(state.hunterToShootId)}</span> était Chasseur. Sur son tel, il choisit un joueur à emporter avec lui.</p>;
      break;
    default:
      body = <p>{phase}</p>;
  }
  return (
    <div className="card-ink mx-auto max-w-3xl p-6 text-center text-white/80">
      {body}
    </div>
  );
}
