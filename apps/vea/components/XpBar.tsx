/**
 * XpBar — Barre de progression XP visuelle pour /profil.
 *
 * Server Component (pas d'interactivité, juste rendu). Pas besoin de "use client".
 *
 * Affiche :
 *   - Niveau actuel (gros chiffre rouge)
 *   - Barre horizontale avec gradient rouge VEA
 *   - Texte sous la barre : "X / Y XP" + "+ N XP avant le niveau suivant"
 *
 * Props : prend directement les valeurs calculées par getLevelInfo() de lib/gamification.
 */
import { getLevelInfo, getNextReward } from "@/lib/gamification";

interface XpBarProps {
  xpTotal: number;
  saisonNom: string; // ex "L'Éveil" pour afficher "Niveau 4 — L'Éveil"
}

export default function XpBar({ xpTotal, saisonNom }: XpBarProps) {
  const info = getLevelInfo(xpTotal);
  const nextReward = getNextReward(info.level);

  return (
    <div className="card-clean p-6">
      {/* En-tete : niveau + nom saison */}
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div>
          <p className="text-xs text-vea-text-dim uppercase tracking-widest font-medium mb-1">
            Niveau actuel
          </p>
          <p className="text-4xl font-black text-vea-accent leading-none">
            {info.level}{" "}
            <span className="text-sm text-vea-text-muted font-normal">
              — {saisonNom}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-vea-text-dim uppercase tracking-widest font-medium mb-1">
            XP total saison
          </p>
          <p className="text-xl font-bold text-vea-text">
            {info.xpTotal.toLocaleString("fr-FR")} XP
          </p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="relative w-full h-3 bg-vea-bg border border-vea-border rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-vea-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${info.progressPercent}%` }}
        />
      </div>

      {/* Info sous la barre */}
      <div className="flex items-baseline justify-between text-xs gap-3 flex-wrap">
        <span className="text-vea-text-muted font-mono">
          {info.xpInLevel} / {info.xpInLevel + info.xpToNextLevel} XP
        </span>
        {info.xpToNextLevel > 0 ? (
          <span className="text-vea-text-dim italic">
            + {info.xpToNextLevel} XP avant niveau {info.level + 1}
          </span>
        ) : (
          <span className="text-vea-accent font-semibold">Niveau max atteint</span>
        )}
      </div>

      {/* Prochaine recompense */}
      {nextReward && (
        <div className="mt-4 pt-4 border-t border-vea-border">
          <p className="text-[10px] uppercase tracking-widest font-bold text-vea-text-dim mb-1">
            Prochaine recompense — Niveau {nextReward.level}
          </p>
          <p className="text-sm text-vea-text">
            <span className="text-xl mr-2">{nextReward.emoji}</span>
            {nextReward.description}
          </p>
        </div>
      )}
    </div>
  );
}
