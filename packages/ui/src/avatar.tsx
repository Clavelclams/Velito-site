/**
 * <Avatar /> — composant universel d'affichage d'un avatar joueur.
 *
 * Utilisé partout dans l'écosystème Velito où on a besoin de représenter
 * visuellement un joueur :
 *  - Manette mobile (/play/[code]) — avatar XL au début, sm dans le HUD
 *  - Écran TV/animateur (/host) — lobby et scoreboard, taille md
 *  - Écran de victoire — taille xl + animation gagnant
 *  - Plus tard : profil utilisateur Velito, leaderboards, etc.
 *
 * Sécurité / perf :
 *  - Le SVG vient de DiceBear (CDN public). On charge à distance, on ne stocke
 *    aucune image sur notre serveur. Si DiceBear tombe, on a un fallback CSS
 *    avec les initiales (visible jusqu'au load de l'image).
 *  - L'attribut alt="" est volontaire : l'avatar est purement décoratif, le
 *    nom du joueur est annoncé séparément aux lecteurs d'écran.
 *
 * Tailles disponibles :
 *  - xs : 32×32   (dans une liste serrée, badge)
 *  - sm : 48×48   (avatar dans un row scoreboard)
 *  - md : 80×80   (carte joueur dans le lobby)
 *  - lg : 128×128 (page profil)
 *  - xl : 200×200 (preview picker, écran victoire mobile)
 *  - tv : 320×320 (écran TV — gagnant)
 */
import { buildAvatarUrl, type AvatarConfig } from "./avatar-data";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "tv";

const SIZE_PX: Record<AvatarSize, number> = {
  xs: 32,
  sm: 48,
  md: 80,
  lg: 128,
  xl: 200,
  tv: 320,
};

export interface AvatarProps {
  /** Configuration de l'avatar (base / fond / accessoire). */
  config: AvatarConfig;
  /** Taille en preset. Par défaut "md". */
  size?: AvatarSize;
  /** Classes Tailwind additionnelles pour l'élément racine. */
  className?: string;
  /** Animation au mount — pour le gagnant. */
  pulse?: boolean;
}

export function Avatar({
  config,
  size = "md",
  className = "",
  pulse = false,
}: AvatarProps) {
  const px = SIZE_PX[size];
  // On demande à DiceBear la taille x2 pour le rendu retina, mais on contraint
  // l'affichage à la taille demandée via width/height inline.
  const url = buildAvatarUrl(config, { size: px * 2 });

  return (
    <span
      className={
        "relative inline-block overflow-hidden rounded-2xl " +
        (pulse ? "animate-pulse ring-4 ring-white/40 " : "") +
        className
      }
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        width={px}
        height={px}
        className="block h-full w-full"
        loading="lazy"
      />
    </span>
  );
}
