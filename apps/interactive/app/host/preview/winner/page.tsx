/**
 * /host/preview/winner — Maquette de l'écran de victoire (écran TV).
 *
 * Affiché à la fin d'une session : le gagnant est mis en avant en énorme
 * (avatar TV size 320px, confettis CSS, halos gradient).
 *
 * Mise en scène pour démo / jury CDA :
 *  - Le gagnant (Riza) au centre, avatar gold halo + pulse
 *  - Bandeau "1er · vainqueur" doré
 *  - Score final en très grand
 *  - Mini-podium des 2-3 sous le focus
 */
import { WinnerCelebration } from "@repo/ui/winner-celebration";
import { Avatar } from "@repo/ui/avatar";
import type { AvatarConfig } from "@repo/ui/avatar-data";

interface PodiumPlayer {
  pseudo: string;
  avatar: AvatarConfig;
  score: number;
}

const WINNER: PodiumPlayer = {
  pseudo: "Riza",
  avatar: { base: "thea", background: "violet", accessory: "round" },
  score: 4280,
};

const RUNNERS_UP: PodiumPlayer[] = [
  {
    pseudo: "K7",
    avatar: { base: "will", background: "cyan", accessory: "sunglasses" },
    score: 3960,
  },
  {
    pseudo: "MamaTeam",
    avatar: { base: "lea", background: "pink", accessory: "none" },
    score: 3540,
  },
];

export default function WinnerPreview() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-30" />

      <div className="relative mx-auto w-full max-w-5xl">
        {/* Header session */}
        <header className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Velito Interactive · QUIZ
          </p>
          <h2 className="neon-title mt-2 text-3xl">Partie terminée</h2>
        </header>

        {/* Bloc principal : gagnant en énorme */}
        <WinnerCelebration
          pseudo={WINNER.pseudo}
          avatar={WINNER.avatar}
          score={WINNER.score}
          subtitle="Quiz Culture Générale · 10 manches"
        />

        {/* Mini-podium des 2e et 3e */}
        <section className="mt-10">
          <p className="mb-4 text-center text-xs uppercase tracking-[0.3em] text-white/40">
            Sur le podium
          </p>
          <div className="grid grid-cols-2 gap-4">
            {RUNNERS_UP.map((p, i) => (
              <div
                key={p.pseudo}
                className="card-ink flex items-center gap-4 p-5"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 font-display text-xl font-black text-white">
                  {i + 2}
                </div>
                <Avatar config={p.avatar} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-bold text-white">
                    {p.pseudo}
                  </p>
                  <p className="text-xs text-white/40">{p.score.toLocaleString("fr-FR")} points</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA rejouer */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#04040e] transition hover:bg-white/90"
          >
            Lancer une nouvelle partie
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.06]"
          >
            Voir tous les scores
          </button>
        </div>

        <p className="mt-8 text-center text-xs italic text-white/30">
          Maquette preview — la mécanique de fin de partie sera branchée au game state.
        </p>
      </div>
    </main>
  );
}
