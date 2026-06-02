/**
 * <WinnerCelebration /> — Écran de victoire / fin de partie.
 *
 * UX cible : projeté sur la TV à la fin d'un jeu, montre le gagnant en énorme
 * avec son avatar, son pseudo et son score final.
 *
 * Composé de :
 *  - Avatar TV (320px) avec halo gradient violet/rose
 *  - Pulse animation lente pour rendre vivant
 *  - Pseudo en très grand (display 7xl) + bandeau "1er" doré
 *  - Score final avec animation de comptage (à brancher au context game state)
 *  - Confetti CSS basé sur des shapes flottantes (zéro lib)
 *
 * Variantes :
 *  - `subtle` : pas de confettis (preview, fin de saison)
 *  - `epic`   : confettis + glow max (defualt)
 */
import { Avatar } from "./avatar";
import type { AvatarConfig } from "./avatar-data";

export interface WinnerCelebrationProps {
  pseudo: string;
  avatar: AvatarConfig;
  score: number;
  /** Texte secondaire affiché sous le pseudo (ex: "Quiz culture G"). */
  subtitle?: string;
  /** "epic" (défaut) = confettis ; "subtle" = pas de confettis. */
  variant?: "epic" | "subtle";
}

/**
 * Décor de confettis CSS : 12 carrés colorés qui flottent dans des positions
 * aléatoires mais déterministes (seed-like via index).
 */
const CONFETTI_PIECES = [
  { left: "8%", top: "12%", color: "#8b5cf6", delay: "0s", size: 12 },
  { left: "92%", top: "18%", color: "#06b6d4", delay: "0.2s", size: 8 },
  { left: "15%", top: "75%", color: "#ec4899", delay: "0.4s", size: 14 },
  { left: "85%", top: "70%", color: "#a3e635", delay: "0.1s", size: 10 },
  { left: "50%", top: "8%", color: "#f59e0b", delay: "0.3s", size: 11 },
  { left: "30%", top: "30%", color: "#06b6d4", delay: "0.5s", size: 9 },
  { left: "70%", top: "35%", color: "#8b5cf6", delay: "0.15s", size: 13 },
  { left: "20%", top: "50%", color: "#a3e635", delay: "0.45s", size: 7 },
  { left: "80%", top: "55%", color: "#ec4899", delay: "0.25s", size: 12 },
  { left: "60%", top: "82%", color: "#f59e0b", delay: "0.35s", size: 8 },
  { left: "40%", top: "85%", color: "#8b5cf6", delay: "0.05s", size: 10 },
  { left: "10%", top: "40%", color: "#06b6d4", delay: "0.55s", size: 11 },
];

export function WinnerCelebration({
  pseudo,
  avatar,
  score,
  subtitle,
  variant = "epic",
}: WinnerCelebrationProps) {
  const isEpic = variant === "epic";

  return (
    <div className="relative grid min-h-[28rem] place-items-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0e0e1a] via-[#1a0e2a] to-[#0e0e1a] px-6 py-12">
      {/* Halos gradient en arrière-plan */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-fuchsia-500/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl"
      />

      {/* Confettis (uniquement variante epic) */}
      {isEpic && (
        <>
          <style>{`
            @keyframes velitoConfettiFloat {
              0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
              50%      { transform: translateY(-20px) rotate(180deg); opacity: 1; }
            }
          `}</style>
          {CONFETTI_PIECES.map((c, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute rounded-sm"
              style={{
                left: c.left,
                top: c.top,
                width: c.size,
                height: c.size,
                backgroundColor: c.color,
                animation: `velitoConfettiFloat 3s ease-in-out ${c.delay} infinite`,
                boxShadow: `0 0 12px ${c.color}80`,
              }}
            />
          ))}
        </>
      )}

      {/* Contenu central */}
      <div className="relative flex flex-col items-center text-center">
        {/* Avatar gagnant */}
        <Avatar config={avatar} size="tv" pulse className="ring-8 ring-yellow-300/50 shadow-[0_0_60px_rgba(253,224,71,0.5)]" />

        {/* Bandeau "1er" doré */}
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-300 to-amber-500 px-5 py-1.5 text-xs font-black uppercase tracking-[0.3em] text-amber-950 shadow-[0_4px_14px_rgba(253,224,71,0.4)]">
          1<sup>er</sup> · vainqueur
        </span>

        {/* Pseudo */}
        <h1 className="neon-title mt-4 text-5xl font-black tracking-tight sm:text-7xl">
          {pseudo}
        </h1>

        {/* Sous-titre */}
        {subtitle && (
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-white/50">
            {subtitle}
          </p>
        )}

        {/* Score */}
        <p className="mt-8 font-display text-6xl font-black tabular-nums text-tenant sm:text-8xl">
          {score.toLocaleString("fr-FR")}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/40">
          points
        </p>
      </div>
    </div>
  );
}
