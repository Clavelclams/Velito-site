/**
 * BadgeCard — Affichage d'un badge unique (avec etat locked/unlocked).
 *
 * Server Component. Affiche :
 *   - Si unlocked : badge en couleur (emoji + nom + description), hover effet
 *   - Si locked : grisé (opacity 0.4) + icone cadenas + condition pour débloquer
 *   - Si rare : bordure dorée animée (Avant-Garde, Légende)
 *
 * Cliquable optionnellement (pour vitrine selection).
 */
import type { ReactNode } from "react";

export interface BadgeData {
  id: string;
  slug: string;
  nom: string;
  description: string;
  emoji: string;
  type: "fondateur" | "saisonnier" | "special";
  saison: string | null;
  niveau_required: number | null;
  rare: boolean;
}

interface BadgeCardProps {
  badge: BadgeData;
  unlocked: boolean;
  inShowcase?: boolean; // si true, encadre rouge (selectionne pour vitrine)
  size?: "sm" | "md" | "lg";
  /** Wrapping pour rendre cliquable (button ou label) — optionnel */
  wrapper?: (children: ReactNode) => ReactNode;
}

const SIZE_CLASSES = {
  sm: "p-3 text-3xl",
  md: "p-4 text-4xl",
  lg: "p-6 text-5xl",
};

export default function BadgeCard({
  badge,
  unlocked,
  inShowcase = false,
  size = "md",
  wrapper,
}: BadgeCardProps) {
  // Style classes selon etat
  const opacityClass = unlocked ? "" : "opacity-40 grayscale";
  const borderClass = inShowcase
    ? "border-2 border-vea-accent shadow-card-hover"
    : badge.rare && unlocked
      ? "border-2 border-amber-400 shadow-md"
      : "border border-vea-border";
  const rareGlow =
    badge.rare && unlocked
      ? "bg-gradient-to-br from-amber-50 via-white to-amber-50"
      : "bg-white";

  // Condition d'unlock pour les locked
  let unlockCondition: string;
  if (badge.type === "fondateur") {
    unlockCondition = "Reserve aux fondateurs (rétroactif)";
  } else if (badge.type === "saisonnier" && badge.niveau_required) {
    unlockCondition = `Atteindre niveau ${badge.niveau_required} en saison ${badge.saison}`;
  } else {
    unlockCondition = "Conditions speciales";
  }

  const content = (
    <div
      className={`relative rounded-lg ${SIZE_CLASSES[size]} ${borderClass} ${rareGlow} ${opacityClass} transition-all hover:-translate-y-0.5 hover:shadow-card-hover`}
    >
      {/* Cadenas si locked */}
      {!unlocked && (
        <span className="absolute top-1 right-1 text-xs" aria-label="Verrouille">
          🔒
        </span>
      )}

      {/* Marker rare si unlocked */}
      {badge.rare && unlocked && (
        <span
          className="absolute top-1 right-1 text-[9px] uppercase tracking-widest font-bold bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded animate-pulse"
          aria-label="Badge ultra-rare"
        >
          Rare
        </span>
      )}

      {/* Emoji central */}
      <div className="text-center mb-2 leading-none">
        <span aria-hidden="true">{badge.emoji}</span>
      </div>

      {/* Nom */}
      <h4 className="text-xs font-bold text-center text-vea-text mb-1 leading-tight">
        {badge.nom}
      </h4>

      {/* Description ou condition unlock */}
      <p className="text-[10px] text-center text-vea-text-muted leading-snug">
        {unlocked ? badge.description : unlockCondition}
      </p>
    </div>
  );

  return wrapper ? wrapper(content) : content;
}
