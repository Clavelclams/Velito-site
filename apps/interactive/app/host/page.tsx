/**
 * /host — Écran TV / animateur Velito Interactive.
 *
 * Server Component qui :
 *  - Vérifie l'auth (sinon redirect vers hub login)
 *  - Lit ?code=XXX dans l'URL et lookup la session correspondante
 *  - Si pas de code → affiche un placeholder "Crée une session depuis /dashboard"
 *  - Si code → passe sessionId + code à HostLobby (Client) qui gère le reste
 *
 * À venir : machine à états du jeu (lobby → playing → ended), reveal des
 * réponses, animations de podium, etc.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HostLobby from "./HostLobby";
import HostQuizGame from "./HostQuizGame";

export const dynamic = "force-dynamic";

interface HostPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function HostScreen({ searchParams }: HostPageProps) {
  const { code } = await searchParams;
  const supabase = await createClient();

  // 1. Vérif auth — seuls les animateurs loggés peuvent ouvrir /host
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Pas loggé → renvoie vers login hub avec returnTo
    const hubUrl =
      process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.velito.fr";
    const returnTo = `${process.env.NEXT_PUBLIC_INTERACTIVE_URL ?? "https://interactive.velito.fr"}/host${code ? `?code=${code}` : ""}`;
    redirect(`${hubUrl}/login?return=${encodeURIComponent(returnTo)}`);
  }

  // 2. Si pas de code dans l'URL, on affiche un message "crée une session"
  if (!code) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-8 py-12">
        <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-50" />
        <div className="relative max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Velito Interactive
          </p>
          <h1 className="neon-title mt-3 text-5xl">Écran TV vide</h1>
          <p className="mt-4 text-white/60">
            Pour lancer une session, retourne à ton tableau de bord et clique
            sur « Lancer une session ».
          </p>
          <Link
            href="/dashboard"
            className="btn-tenant mt-8 inline-block"
          >
            Mon tableau de bord
          </Link>
        </div>
      </main>
    );
  }

  // 3. Lookup la session via le code
  const { data: session, error: sessionError } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("id, code, status, host_user_id, game_type, current_state, created_at")
    .eq("code", code)
    .single();

  if (sessionError || !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-8 py-12 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">
          Velito Interactive
        </p>
        <h1 className="neon-title mt-3 text-4xl">Session introuvable</h1>
        <p className="mt-4 max-w-md text-white/60">
          Le code <span className="font-display font-black text-tenant">{code.toUpperCase()}</span>{" "}
          ne correspond à aucune session active. Elle a peut-être été fermée.
        </p>
        <Link href="/dashboard" className="btn-tenant mt-8">
          Retour au dashboard
        </Link>
      </main>
    );
  }

  // 4. Vérif que c'est BIEN sa session (sécurité défense en profondeur — RLS déjà)
  const sessionRow = session as {
    id: string;
    code: string;
    status: string;
    host_user_id: string;
    game_type: string | null;
    current_state: {
      phase: "choose_game" | "question" | "reveal" | "final";
      questionIndex: number;
      questionStartedAt?: string;
      timeLimitSec?: number;
    } | null;
    created_at: string;
  };
  if (sessionRow.host_user_id !== user.id) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-8 py-12 text-center">
        <h1 className="neon-title text-3xl">Pas ta session</h1>
        <p className="mt-4 max-w-md text-white/60">
          Cette session a été créée par un autre animateur. Seul lui peut la
          piloter depuis cet écran.
        </p>
        <Link href="/dashboard" className="btn-tenant mt-8">
          Retour au dashboard
        </Link>
      </main>
    );
  }

  // 5. Routage selon le status :
  //    - lobby   → HostLobby (QR + joueurs qui arrivent)
  //    - playing → HostQuizGame (question + scoreboard)
  //    - ended   → HostQuizGame (montre l'écran final/victoire)
  const playBaseUrl =
    process.env.NEXT_PUBLIC_INTERACTIVE_URL ?? "https://interactive.velito.fr";

  if (sessionRow.status === "lobby") {
    return (
      <HostLobby
        sessionId={sessionRow.id}
        code={sessionRow.code}
        status={sessionRow.status}
        playBaseUrl={playBaseUrl}
      />
    );
  }

  // playing ou ended → on rend le composant Quiz qui gère phase question/reveal/final
  const initialState = sessionRow.current_state ?? {
    phase: "choose_game" as const,
    questionIndex: 0,
  };
  return (
    <HostQuizGame
      sessionId={sessionRow.id}
      initialState={initialState}
      status={sessionRow.status}
    />
  );
}
