/**
 * /host/preview/scoreboard — Maquette du scoreboard live (écran TV).
 *
 * Page de DEMO/preview pour valider visuellement le rendu avant d'avoir le
 * Realtime branché. Une fois la state machine de jeu opérationnelle, ce
 * composant sera réutilisé directement avec des données vivantes.
 *
 * Mise en scène :
 *  - 8 joueurs mock avec scores différents (podium clair)
 *  - Animation visuelle des 3 premiers (gold/silver/bronze halos)
 *  - "Tu" highlight pour démontrer la variante mobile (mais ici en TV)
 */
import { ScoreboardRow } from "@repo/ui/scoreboard-row";
import type { AvatarConfig } from "@repo/ui/avatar-data";

interface MockPlayer {
  pseudo: string;
  avatar: AvatarConfig;
  score: number;
}

const MOCK_PLAYERS: MockPlayer[] = [
  { pseudo: "Riza", avatar: { base: "thea", background: "violet", accessory: "round" }, score: 4280 },
  { pseudo: "K7", avatar: { base: "will", background: "cyan", accessory: "sunglasses" }, score: 3960 },
  { pseudo: "MamaTeam", avatar: { base: "lea", background: "pink", accessory: "none" }, score: 3540 },
  { pseudo: "ZeroCool", avatar: { base: "tony", background: "lime", accessory: "sunglasses" }, score: 2980 },
  { pseudo: "Bisou", avatar: { base: "maeva", background: "pink", accessory: "round" }, score: 2410 },
  { pseudo: "GG", avatar: { base: "leny", background: "cyan", accessory: "none" }, score: 1820 },
  { pseudo: "Capitaine", avatar: { base: "bakary", background: "violet", accessory: "sunglasses" }, score: 1450 },
  { pseudo: "Plouf", avatar: { base: "alizee", background: "lime", accessory: "none" }, score: 980 },
];

export default function ScoreboardPreview() {
  // Déjà triés par score décroissant — l'ordre détermine le rank
  const sorted = [...MOCK_PLAYERS].sort((a, b) => b.score - a.score);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid-ink [background-size:48px_48px] opacity-40" />
      <div className="pointer-events-none absolute -top-20 right-1/4 h-96 w-96 rounded-full bg-neon-violet/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-4xl">
        {/* Header de la manche en cours */}
        <header className="mb-8 flex items-end justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Velito Interactive · QUIZ
            </p>
            <h1 className="neon-title mt-2 text-4xl">Manche 7 / 10</h1>
            <p className="mt-1 text-sm text-white/50">Culture générale · 30 sec restantes</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-white/40">Joueurs</p>
            <p className="font-display text-3xl font-black text-tenant">
              {sorted.length}
            </p>
          </div>
        </header>

        {/* Liste des scores */}
        <section className="space-y-3">
          {sorted.map((p, i) => (
            <ScoreboardRow
              key={p.pseudo}
              rank={i + 1}
              pseudo={p.pseudo}
              avatar={p.avatar}
              score={p.score}
              avatarSize="md"
              variant="tv"
            />
          ))}
        </section>

        {/* Footer démo */}
        <p className="mt-10 text-center text-xs italic text-white/30">
          Maquette preview — les positions s&apos;animeront en temps réel quand
          le Realtime sera branché.
        </p>
      </div>
    </main>
  );
}
