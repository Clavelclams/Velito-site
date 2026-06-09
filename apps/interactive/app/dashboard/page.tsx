/**
 * /dashboard — galerie de jeux Velito Interactive.
 *
 * Server Component qui lit la session Supabase (cookie partagé .velito.fr).
 *  - Pas loggé → écran "Continuer avec VENA"
 *  - Loggé    → galerie de jeux : chaque card lance une session AVEC son game_type
 *
 * Design : inspiré d'Unboared (grandes cards avec accent couleur, durée, nb
 * joueurs). Les jeux pas encore prêts sont affichés en "Bientôt" mais visibles
 * pour donner l'envie + tracker l'intérêt (clic → toast "Bientôt dispo").
 *
 * Défense jury CDA :
 *   - Server Component : check auth zéro flash
 *   - Server Action via FormData : chaque card a son propre <form> avec
 *     un hidden game_type, c'est progressive enhancement (fonctionne sans JS)
 *   - DRY : la liste JEUX est la SEULE source de vérité (icône, couleur,
 *     disponibilité) — Tailwind classes en dur pour purge correcte
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DashboardLoggedOut from "./DashboardLoggedOut";
import DashboardAudio from "./DashboardAudio";
import { createSessionWithGameAction } from "../host/actions";

// Catalogue jeux — source unique de vérité.
// Tailwind doit "voir" les classes pour les générer au build, donc on les
// écrit en dur dans `accentClass` (pas de bg-${...}).
type GameType = "quiz" | "petit_bac" | "blind_test" | null;

interface GameCard {
  id: GameType;
  /** Titre affiché. */
  nom: string;
  /** Description courte. */
  desc: string;
  /** Emoji/icône principal. */
  emoji: string;
  /** Classes Tailwind pour les fonds/borders/text accent. */
  accentClass: {
    /** Fond de la card complète au hover. */
    bg: string;
    /** Bord. */
    border: string;
    /** Couleur texte/accent. */
    text: string;
    /** Halo de fond derrière l'emoji. */
    glow: string;
  };
  /** Plage de joueurs. */
  joueurs: string;
  /** Durée typique. */
  duree: string;
  /** Si false → "Bientôt" + non-cliquable. */
  available: boolean;
}

const JEUX: GameCard[] = [
  {
    id: "quiz",
    nom: "Quiz",
    desc: "15 questions à choix multiples · culture G, Amiens, gaming",
    emoji: "🧠",
    accentClass: {
      bg: "hover:bg-violet-500/10",
      border: "hover:border-violet-400/60",
      text: "text-violet-300",
      glow: "bg-violet-500/30",
    },
    joueurs: "2 – 100",
    duree: "8 min",
    available: true,
  },
  {
    id: "petit_bac",
    nom: "Petit Bac",
    desc: "Une lettre, 6 catégories, trouve les mots les plus rares",
    emoji: "✏️",
    accentClass: {
      bg: "hover:bg-amber-500/10",
      border: "hover:border-amber-400/60",
      text: "text-amber-300",
      glow: "bg-amber-500/30",
    },
    joueurs: "2 – 50",
    duree: "10 min",
    available: true,
  },
  {
    id: "blind_test",
    nom: "Blind Test",
    desc: "Reconnais le morceau le plus vite — extraits 30 s",
    emoji: "🎵",
    accentClass: {
      bg: "hover:bg-cyan-500/10",
      border: "hover:border-cyan-400/60",
      text: "text-cyan-300",
      glow: "bg-cyan-500/30",
    },
    joueurs: "2 – 100",
    duree: "10 min",
    available: false,
  },
  {
    id: null,
    nom: "Géo",
    desc: "Trouve la ville sur la carte le plus précisément possible",
    emoji: "🗺️",
    accentClass: {
      bg: "hover:bg-emerald-500/10",
      border: "hover:border-emerald-400/60",
      text: "text-emerald-300",
      glow: "bg-emerald-500/30",
    },
    joueurs: "2 – 100",
    duree: "12 min",
    available: false,
  },
  {
    id: null,
    nom: "Estim'",
    desc: "Le plus proche du chiffre exact gagne",
    emoji: "🎯",
    accentClass: {
      bg: "hover:bg-pink-500/10",
      border: "hover:border-pink-400/60",
      text: "text-pink-300",
      glow: "bg-pink-500/30",
    },
    joueurs: "2 – 100",
    duree: "5 min",
    available: false,
  },
  {
    id: null,
    nom: "Réflexe",
    desc: "Tape le bon bouton avant les autres — pur tempo",
    emoji: "⚡",
    accentClass: {
      bg: "hover:bg-red-500/10",
      border: "hover:border-red-400/60",
      text: "text-red-300",
      glow: "bg-red-500/30",
    },
    joueurs: "2 – 50",
    duree: "3 min",
    available: false,
  },
];

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  let userEmail: string | null = null;
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
    userId = user?.id ?? null;
  } catch (e) {
    console.error("[/dashboard] auth.getUser() a échoué :", e);
  }

  if (!userEmail || !userId) {
    return <DashboardLoggedOut />;
  }

  const availableCount = JEUX.filter((j) => j.available).length;

  // ─── Stats du host (sessions, joueurs, parties) ───
  // On le fait en best-effort : si une requête échoue on garde le placeholder.
  let stats = { sessions: 0, joueurs: 0, parties: 0, emails: 0 };
  try {
    const supabase = await createClient();

    // 1. Toutes mes sessions (id + status)
    const { data: mySessionsData } = await supabase
      .schema("interactive" as never)
      .from("sessions")
      .select("id, status")
      .eq("host_user_id", userId);

    const mySessions = (mySessionsData ?? []) as Array<{ id: string; status: string }>;
    const totalSessions = mySessions.length;
    const totalParties = mySessions.filter((s) => s.status === "ended").length;

    // 2. Joueurs uniques (count des session_players sur mes sessions)
    let joueursCount = 0;
    if (mySessions.length > 0) {
      const sessionIds = mySessions.map((s) => s.id);
      const { count } = await supabase
        .schema("interactive" as never)
        .from("session_players")
        .select("*", { count: "exact", head: true })
        .in("session_id", sessionIds);
      joueursCount = count ?? 0;
    }

    stats = {
      sessions: totalSessions,
      joueurs: joueursCount,
      parties: totalParties,
      emails: 0, // Pas de système email pour l'instant
    };
  } catch (e) {
    console.error("[/dashboard] stats fetch failed:", e);
  }

  return (
    <main className="relative mx-auto min-h-screen max-w-6xl px-6 py-10">
      {/* Halo de fond décoratif */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-gradient-to-b from-tenant/[0.06] via-transparent to-transparent" />

      {/* Musique de fond + bouton mute (Client Component) */}
      <DashboardAudio />

      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white/50 transition hover:text-white"
      >
        <span aria-hidden="true">←</span> Retour à l&apos;accueil
      </Link>

      <header className="border-b border-white/10 pb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Espace animateur
        </p>
        <h1 className="neon-title mt-2 text-5xl sm:text-6xl">Choisis ton jeu</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60">
          Clique sur une carte pour lancer une session. Les joueurs scannent le
          QR code affiché à l&apos;écran et rejoignent depuis leur téléphone.
        </p>
        <p className="mt-4 text-xs text-white/40">
          Connecté en tant que <span className="text-white/60">{userEmail}</span>
          {" · "}
          <span className="text-tenant">{availableCount}</span> jeu{availableCount > 1 ? "x" : ""}{" "}
          disponible{availableCount > 1 ? "s" : ""} sur {JEUX.length}
        </p>
      </header>

      <section className="mt-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {JEUX.map((jeu) => (
            <GameCardItem key={jeu.nom} jeu={jeu} />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="mb-4 text-sm uppercase tracking-widest text-white/50">
          Tes statistiques
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Sessions", value: stats.sessions },
            { label: "Joueurs", value: stats.joueurs },
            { label: "Parties terminées", value: stats.parties },
            { label: "Emails collectés", value: stats.emails },
          ].map((s) => (
            <div key={s.label} className="card-ink p-5">
              <p className="font-display text-3xl font-black tabular-nums text-tenant">
                {s.value.toLocaleString("fr-FR")}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-white/50">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-12 text-xs italic text-white/40">
        Stats branchées sur données réelles bientôt — la collecte est déjà
        active dans Postgres.
      </p>
    </main>
  );
}

function GameCardItem({ jeu }: { jeu: GameCard }) {
  const baseCard =
    "group relative flex h-full flex-col overflow-hidden rounded-2xl border transition";

  if (!jeu.available) {
    return (
      <div
        className={
          baseCard +
          " cursor-not-allowed border-white/[0.06] bg-white/[0.02] opacity-60"
        }
      >
        <CardInner jeu={jeu} comingSoon />
      </div>
    );
  }

  return (
    <form action={createSessionWithGameAction} className="contents">
      <input type="hidden" name="game_type" value={jeu.id ?? ""} />
      <button
        type="submit"
        className={
          baseCard +
          " cursor-pointer border-white/10 bg-white/[0.03] text-left " +
          jeu.accentClass.bg +
          " " +
          jeu.accentClass.border +
          " hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)]"
        }
      >
        <CardInner jeu={jeu} />
      </button>
    </form>
  );
}

function CardInner({
  jeu,
  comingSoon = false,
}: {
  jeu: GameCard;
  comingSoon?: boolean;
}) {
  return (
    <>
      <div className="relative h-32 overflow-hidden">
        <div
          className={
            "absolute inset-0 opacity-50 blur-3xl " + jeu.accentClass.glow
          }
        />
        <div className="relative flex h-full items-center justify-center text-7xl">
          <span aria-hidden="true">{jeu.emoji}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-2xl font-black text-white">
            {jeu.nom}
          </h3>
          {comingSoon && (
            <span className="rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/50">
              Bientôt
            </span>
          )}
        </div>
        <p className="mt-2 flex-1 text-sm text-white/60">{jeu.desc}</p>

        <div className="mt-4 flex items-center gap-4 text-xs text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">👥</span> {jeu.joueurs}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">⏱️</span> {jeu.duree}
          </span>
        </div>

        {!comingSoon && (
          <div
            className={
              "mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition group-hover:gap-2.5 " +
              jeu.accentClass.text
            }
          >
            Lancer une session
            <span aria-hidden="true">→</span>
          </div>
        )}
      </div>
    </>
  );
}
