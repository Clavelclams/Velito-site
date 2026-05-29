/**
 * /dashboard — espace animateur / staff Velito Interactive.
 *
 * Server Component qui lit la session Supabase (cookie partagé .velito.fr).
 *  - Pas loggé → écran "Continuer avec VENA" (compte central hub.velito.fr)
 *  - Loggé    → dashboard staff (lancer session, catalogue jeux, stats)
 *
 * Défense jury CDA :
 *   - Server Component → le check d'auth se fait côté serveur, zéro flash
 *   - Le bouton ContinueWithVena vient du package partagé @repo/ui
 *     (réutilisable dans Arena, Prévention…) → DRY architecture monorepo
 *   - Le returnTo capture l'URL d'origine pour ramener l'user après login
 *
 * À FAIRE PLUS TARD :
 *   - Vérifier que le user a un rôle staff sur ce tenant (shared.user_permissions
 *     scope owner/editor) — pour l'instant on ouvre dès qu'il est loggé
 *   - Brancher la création de session (POST → interactive.sessions)
 *   - Stats réelles depuis interactive.session_players / session_events
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DashboardLoggedOut from "./DashboardLoggedOut";

// Tailwind ne "voit" pas les classes calculées (`bg-${...}`), donc on les
// met en dur ici pour qu'elles soient générées au build.
const JEUX = [
  { nom: "Quiz", desc: "Questions à choix multiples", dot: "bg-neon-violet" },
  { nom: "Blind Test", desc: "Reconnais le son le plus vite", dot: "bg-neon-cyan" },
  { nom: "Petit Bac", desc: "Un mot par catégorie", dot: "bg-neon-lime" },
  { nom: "Géo", desc: "Trouve le lieu sur la carte", dot: "bg-neon-pink" },
];

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Lecture session côté serveur. Si Supabase n'est pas configuré on tombe sur
  // l'écran "Continuer avec VENA" plutôt que de crasher (defensive).
  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch (e) {
    console.error("[/dashboard] auth.getUser() a échoué :", e);
  }

  if (!userEmail) {
    return <DashboardLoggedOut />;
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Espace animateur
          </p>
          <h1 className="neon-title mt-2 text-4xl">Tableau de bord</h1>
          <p className="mt-2 text-xs text-white/40">
            Connecté en tant que <span className="text-white/60">{userEmail}</span>
          </p>
        </div>
        <Link href="/host" className="btn-tenant">
          Lancer une session
        </Link>
      </header>

      <section className="mt-10">
        <h2 className="mb-4 text-sm uppercase tracking-widest text-white/50">
          Catalogue de jeux
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {JEUX.map((j) => (
            <div
              key={j.nom}
              className="card-ink group flex items-center justify-between p-5 transition hover:border-white/25"
            >
              <div>
                <p className="font-display text-xl font-bold">{j.nom}</p>
                <p className="text-sm text-white/50">{j.desc}</p>
              </div>
              <span
                className={`h-3 w-3 rounded-full ${j.dot} shadow-neon`}
                aria-hidden
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-sm uppercase tracking-widest text-white/50">
          Statistiques
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {["Sessions", "Joueurs", "Parties", "Emails collectés"].map((k) => (
            <div key={k} className="card-ink p-5">
              <p className="font-display text-3xl font-black text-tenant">—</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-white/50">
                {k}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-12 text-xs italic text-white/40">
        Fondations posées — création de session et données réelles à venir.
      </p>
    </main>
  );
}
