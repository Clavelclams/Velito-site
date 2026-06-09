/**
 * /play/[code] — la manette mobile.
 *
 * Server Component qui :
 *  - Lookup la session via le code de l'URL
 *  - Si non trouvée → écran d'erreur "Session introuvable"
 *  - Si trouvée → passe sessionId + code à PlayJoinForm (Client)
 *
 * Note : on utilise le client server (anon) qui peut SELECT sur sessions
 * grâce à la policy "sessions_select_all" (lecture publique pour join).
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PlayJoinForm from "./PlayJoinForm";

export const dynamic = "force-dynamic";

export default async function PlayController({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  // Lookup la session
  const supabase = await createClient();
  const { data: session, error } = await supabase
    .schema("interactive" as never)
    .from("sessions")
    .select("id, code, status, game_type")
    .eq("code", upperCode)
    .single();

  // ═══════════ Pas de session trouvée ═══════════
  if (error || !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Velito Interactive
          </p>
          <h1 className="neon-title mt-3 text-3xl">Session introuvable</h1>
          <p className="mt-4 text-sm text-white/60">
            Le code{" "}
            <span className="font-display font-black tracking-widest text-tenant">
              {upperCode}
            </span>{" "}
            ne correspond à aucune partie active.
          </p>
          <p className="mt-2 text-xs text-white/40">
            Vérifie le code affiché sur l&apos;écran TV.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/5"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    );
  }

  const sessionRow = session as {
    id: string;
    code: string;
    status: string;
    game_type: string | null;
  };

  // ═══════════ Session "ended" : aucune reconnexion possible ═══════════
  if (sessionRow.status === "ended") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Velito Interactive
          </p>
          <h1 className="neon-title mt-3 text-3xl">Session terminée</h1>
          <p className="mt-4 text-sm text-white/60">
            Cette session est close. Demande à l&apos;animateur d&apos;en ouvrir une
            nouvelle.
          </p>
        </div>
      </main>
    );
  }

  // ═══════════ OK — pour 'lobby' ET 'playing'. Le Client décidera ═══════════
  //   - 'lobby'   : nouveau joueur peut rejoindre OU reconnexion d'un joueur existant
  //   - 'playing' : seuls les joueurs déjà inscrits (localStorage) peuvent reconnecter.
  //                 Un nouveau joueur verra l'écran "trop tard" côté Client.
  const gameType = (
    sessionRow.game_type === "quiz" ||
    sessionRow.game_type === "petit_bac" ||
    sessionRow.game_type === "blind_test" ||
    sessionRow.game_type === "estim" ||
    sessionRow.game_type === "geo" ||
    sessionRow.game_type === "reflex" ||
    sessionRow.game_type === "loup_garou" ||
    sessionRow.game_type === "draw"
      ? sessionRow.game_type
      : null
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <PlayJoinForm
        sessionId={sessionRow.id}
        code={sessionRow.code}
        gameType={gameType}
        sessionStatus={sessionRow.status as "lobby" | "playing"}
      />
    </main>
  );
}
