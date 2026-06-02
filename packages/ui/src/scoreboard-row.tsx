/**
 * <ScoreboardRow /> — ligne d'un joueur dans le scoreboard d'une partie.
 *
 * Pensé pour 2 contextes :
 *  - Écran TV/animateur (taille md/lg, gros chiffres pour vu de loin)
 *  - Téléphone joueur (mini-version dans son HUD, taille sm)
 *
 * Variantes visuelles selon le rank :
 *  - rank 1 : podium gold (border + halo doré)
 *  - rank 2 : podium silver
 *  - rank 3 : podium bronze
 *  - rank 4+: row neutre
 *
 * Animation prévue (à venir) : si le score change, on flash le delta en vert/rouge.
 */
import { Avatar, type AvatarSize } from "./avatar";
import type { AvatarConfig } from "./avatar-data";

export interface ScoreboardRowProps {
  rank: number;
  pseudo: string;
  avatar: AvatarConfig;
  score: number;
  /** Si vrai, met en avant cette ligne (utile pour "ton score" sur mobile). */
  highlight?: boolean;
  /** Taille des avatars. Défaut md. */
  avatarSize?: AvatarSize;
  /** Variante visuelle (TV plus gros, mobile compact). */
  variant?: "tv" | "mobile";
}

function getRankStyle(rank: number) {
  if (rank === 1) {
    return {
      border: "border-yellow-300/70",
      glow: "shadow-[0_0_24px_rgba(253,224,71,0.35)]",
      badge: "bg-gradient-to-br from-yellow-300 to-amber-500 text-yellow-950",
      label: "1",
    };
  }
  if (rank === 2) {
    return {
      border: "border-slate-300/40",
      glow: "shadow-[0_0_18px_rgba(203,213,225,0.25)]",
      badge: "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900",
      label: "2",
    };
  }
  if (rank === 3) {
    return {
      border: "border-amber-600/50",
      glow: "shadow-[0_0_16px_rgba(217,119,6,0.25)]",
      badge: "bg-gradient-to-br from-amber-500 to-amber-700 text-amber-50",
      label: "3",
    };
  }
  return {
    border: "border-white/10",
    glow: "",
    badge: "bg-white/10 text-white/70",
    label: String(rank),
  };
}

export function ScoreboardRow({
  rank,
  pseudo,
  avatar,
  score,
  highlight = false,
  avatarSize = "md",
  variant = "tv",
}: ScoreboardRowProps) {
  const style = getRankStyle(rank);
  const isTv = variant === "tv";

  return (
    <div
      className={
        "flex items-center gap-4 rounded-2xl border bg-ink-700/40 px-4 transition " +
        style.border +
        " " +
        style.glow +
        " " +
        (isTv ? "py-3 sm:py-4" : "py-2") +
        " " +
        (highlight ? "ring-2 ring-tenant" : "")
      }
    >
      {/* Badge de rang */}
      <span
        className={
          "grid shrink-0 place-items-center rounded-xl font-display font-black " +
          style.badge +
          " " +
          (isTv ? "h-12 w-12 text-2xl sm:h-14 sm:w-14 sm:text-3xl" : "h-8 w-8 text-base")
        }
        aria-label={`Rang ${rank}`}
      >
        {style.label}
      </span>

      {/* Avatar */}
      <Avatar config={avatar} size={avatarSize} />

      {/* Pseudo */}
      <p
        className={
          "min-w-0 flex-1 truncate font-display font-bold tracking-wide text-white " +
          (isTv ? "text-2xl sm:text-3xl" : "text-base")
        }
      >
        {pseudo}
      </p>

      {/* Score */}
      <p
        className={
          "shrink-0 font-display font-black tabular-nums text-tenant " +
          (isTv ? "text-3xl sm:text-4xl" : "text-lg")
        }
      >
        {score.toLocaleString("fr-FR")}
      </p>
    </div>
  );
}
