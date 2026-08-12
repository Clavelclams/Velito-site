/**
 * Visuels des pastilles de discipline.
 *
 * POURQUOI ON DESSINE LES NÔTRES.
 * Toornament affiche les jaquettes officielles de League of Legends, Fortnite
 * ou EA FC. Il peut : Riot, Ubisoft et Microsoft sont ses clients, il a des
 * accords de licence. Nous n'en avons aucun. Reprendre ces images serait une
 * contrefaçon caractérisée, et pour une association qui dépose des dossiers de
 * subvention publique c'est un risque sans commune mesure avec le bénéfice.
 * Même chose pour les images « libres de droit » trouvées sur Google : la
 * mention est fausse neuf fois sur dix.
 *
 * Donc on dessine. Chaque motif est une illustration ORIGINALE au trait,
 * reconnaissable au premier coup d'œil (une manette, une raquette, un ballon),
 * posée en grand et en transparence sur un dégradé propre à la discipline.
 *
 * Trois avantages concrets, au-delà du juridique :
 *  - poids nul : ce sont des chemins SVG en ligne, pas des fichiers à charger,
 *    donc aucune image qui apparaît en retard sur une connexion de salle ;
 *  - net à toutes les tailles, y compris sur un écran de téléphone récent ;
 *  - la couleur suit le thème, donc rien à redessiner le jour où la palette
 *    change.
 *
 * Les motifs sont volontairement génériques par FAMILLE de jeu (combat, foot,
 * course, tir…) et non par titre : dessiner un personnage identifiable de
 * Street Fighter recréerait exactement le problème de droits qu'on évite.
 */

export type CleMotif =
  | "manette"
  | "combat"
  | "ballon"
  | "voiture"
  | "tir"
  | "epee"
  | "construction"
  | "raquette"
  | "panier"
  | "pingpong";

const traits = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Chaque motif est dessiné dans une grille de 120 × 120. */
const MOTIFS: Record<CleMotif, React.ReactNode> = {
  // Manette : jeu vidéo en général.
  manette: (
    <>
      <path d="M38 40h44a28 28 0 0 1 27.4 22.4l3.9 23.4A14 14 0 0 1 89 96.6L78.4 84H41.6L31 96.6A14 14 0 0 1 6.7 85.8l3.9-23.4A28 28 0 0 1 38 40Z" />
      <path d="M34 56v14M27 63h14M84 58h.01M96 68h.01" />
    </>
  ),
  // Poing fermé : jeux de combat.
  combat: (
    <>
      <path d="M34 62V44a9 9 0 0 1 18 0v14" />
      <path d="M52 58V38a9 9 0 0 1 18 0v20" />
      <path d="M70 60V46a9 9 0 0 1 18 0v30a30 30 0 0 1-30 30H52a30 30 0 0 1-30-30v-8a9 9 0 0 1 15.4-6.4L46 70" />
    </>
  ),
  // Ballon de football : five et jeux de foot.
  ballon: (
    <>
      <circle cx="60" cy="62" r="42" />
      <path d="m60 34 22 16-8 26H46l-8-26 22-16Z" />
      <path d="M60 20v14M22 50l16 12M98 50 82 62M38 96l8-20M82 96l-8-20" />
    </>
  ),
  // Voiture vue de dessus : jeux de course et de kart.
  voiture: (
    <>
      <path d="M60 18c10 0 16 12 17 26l2 26c0 10-8 16-19 16s-19-6-19-16l2-26c1-14 7-26 17-26Z" />
      <path d="M28 44h13v22H28zM92 44H79v22h13z" />
      <path d="M50 96h20" />
    </>
  ),
  // Réticule de visée : jeux de tir.
  tir: (
    <>
      <circle cx="60" cy="60" r="38" />
      <circle cx="60" cy="60" r="14" />
      <path d="M60 8v24M60 88v24M8 60h24M88 60h24" />
    </>
  ),
  // Épée : jeux d'arène et de stratégie.
  epee: (
    <>
      <path d="M96 16 52 60l12 12 44-44V16H96Z" />
      <path d="m44 68 8 8M30 82l8 8" />
      <path d="M36 74 16 94a10 10 0 0 0 14 14l20-20" />
    </>
  ),
  // Pioche et bloc : jeux de construction et battle royale.
  construction: (
    <>
      <path d="M60 16 22 36v48l38 20 38-20V36L60 16Z" />
      <path d="M22 36l38 20 38-20M60 56v48" />
    </>
  ),
  // Raquette : padel et sports de raquette.
  raquette: (
    <>
      <path d="M60 12c20 0 34 15 34 34S80 82 60 82 26 66 26 46 40 12 60 12Z" />
      <path d="M60 82v20M50 108h20" />
      <path d="M46 32v30M60 26v40M74 32v30M40 46h40" />
    </>
  ),
  // Ballon de basket : basket 3x3.
  panier: (
    <>
      <circle cx="60" cy="60" r="44" />
      <path d="M60 16v88M16 60h88" />
      <path d="M28 28c18 18 18 46 0 64M92 28c-18 18-18 46 0 64" />
    </>
  ),
  // Raquette de ping-pong et balle.
  pingpong: (
    <>
      <path d="M44 14c18 0 32 14 32 32s-14 32-32 32S12 64 12 46 26 14 44 14Z" />
      <path d="M56 70l30 30M78 92l14 14" />
      <circle cx="92" cy="40" r="10" />
    </>
  ),
};

/**
 * Le visuel de fond d'une pastille. `aria-hidden` : c'est une décoration, le
 * nom de la discipline est déjà écrit en toutes lettres à côté. Le faire
 * annoncer par un lecteur d'écran ne ferait que doubler l'information.
 */
export default function MotifDiscipline({
  cle,
  className = "",
}: {
  cle: CleMotif;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
      {...traits}
    >
      {MOTIFS[cle]}
    </svg>
  );
}
