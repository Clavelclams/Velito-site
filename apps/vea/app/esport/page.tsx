/**
 * Page Esport VEA
 * Rosters par jeu (EA FC, Clash Royale) + CTA rejoindre une équipe
 */
import Link from "next/link";

interface Player {
  pseudo: string;
  name: string;
  role: string;
}

interface GameRoster {
  game: string;
  players: Player[];
}

const ROSTERS: GameRoster[] = [
  {
    game: "EA FC 25",
    players: [
      { pseudo: "Player1", name: "À confirmer", role: "Attaquant" },
      { pseudo: "Player2", name: "À confirmer", role: "Milieu" },
      { pseudo: "Player3", name: "À confirmer", role: "Défenseur" },
      { pseudo: "Player4", name: "À confirmer", role: "Gardien" },
      { pseudo: "Player5", name: "À confirmer", role: "Remplaçant" },
    ],
  },
  {
    game: "Clash Royale",
    players: [
      { pseudo: "Clasher1", name: "À confirmer", role: "Capitaine" },
      { pseudo: "Clasher2", name: "À confirmer", role: "Joueur" },
      { pseudo: "Clasher3", name: "À confirmer", role: "Joueur" },
      { pseudo: "Clasher4", name: "À confirmer", role: "Joueur" },
      { pseudo: "Clasher5", name: "À confirmer", role: "Remplaçant" },
    ],
  },
];

export default function EsportPage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="pt-20 pb-12 px-4 bg-gradient-to-b from-vea-dark to-vea-navy">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black text-vea-white mb-4">
            Esport &amp; Compétition
          </h1>
          <p className="text-lg text-vea-text-muted max-w-2xl mx-auto">
            Retrouvez nos rosters officiels qui défendent les couleurs d&apos;Amiens.
          </p>
        </div>
      </section>

      {/* ===== ROSTERS ===== */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-16">
          {ROSTERS.map((roster) => (
            <div key={roster.game}>
              {/* Titre du jeu avec bordure gauche bleue */}
              <h2 className="text-xl font-bold text-vea-white mb-6 pl-4 border-l-4 border-vea-accent">
                {roster.game}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {roster.players.map((player, idx) => (
                  <div
                    key={`${roster.game}-${idx}`}
                    className="bg-vea-card border border-vea-border rounded-xl p-5 text-center hover:border-vea-accent/30 transition-colors"
                  >
                    {/* Avatar placeholder */}
                    <div className="w-14 h-14 bg-vea-navy rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-vea-text-dim text-lg font-bold">
                        {player.pseudo[0]}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-vea-white">
                      {player.pseudo}
                    </p>
                    <p className="text-xs text-vea-accent mt-0.5 font-medium">
                      {player.role}
                    </p>
                    <p className="text-[11px] text-vea-text-dim mt-1">
                      {player.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-vea-card border border-vea-border rounded-xl p-10">
            <h2 className="text-2xl font-bold text-vea-white mb-4">
              Rejoins une équipe
            </h2>
            <p className="text-vea-text-muted mb-8 max-w-lg mx-auto">
              Tu es compétitif et tu veux représenter Amiens ?
              Contacte-nous pour intégrer un roster VEA.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-vea-accent hover:bg-vea-accent-hover text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-sm"
            >
              Candidater
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
