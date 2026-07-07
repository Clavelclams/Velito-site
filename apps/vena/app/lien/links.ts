/**
 * Configuration centralisée des liens de la page /lien (linktree perso/pro
 * de Clavel, hébergée sur velito.fr).
 *
 * C'est LE seul endroit à éditer pour ajouter / retirer / réordonner un lien,
 * ou changer la "bulle" (médaillon affiché dans l'effet marquee au survol).
 *
 * Ordre voulu : VEA, VENA, réseaux, puis le Hub EN DERNIER.
 *
 * Bulles (cf. FlowingMenu) :
 *  - kind "image" : un logo. `bg:"#fff"` = pastille blanche derrière le logo.
 *  - kind "text"  : un texte stylé (couleur / fond / police).
 *
 * URLs de l'écosystème via variables d'env (NEXT_PUBLIC_*) pour basculer
 * local <-> prod sans toucher au code.
 */
import type { FlowingMenuItem } from "@/components/FlowingMenu";

// En prod, URLs forcées en dur (insensibles à une var Vercel restée en localhost).
// Les vars d'env ne sont lues qu'en dev local.
const HUB_URL =
  process.env.NODE_ENV === "production"
    ? "https://hub.velito.fr"
    : process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.velito.fr";
const VEA_URL =
  process.env.NODE_ENV === "production"
    ? "https://vea.velito.fr"
    : process.env.NEXT_PUBLIC_VEA_URL ?? "https://vea.velito.fr";

const KAKI = "#414C35";
const SERIF = "'Georgia', 'Times New Roman', serif";
const MONO = "'JetBrains Mono', ui-monospace, 'Courier New', monospace";

export const LIEN_ITEMS: FlowingMenuItem[] = [
  // 1. VEA — logo VEA (rouge) sur pastille blanche
  {
    text: "VEA · Esport",
    link: VEA_URL,
    external: true,
    bubble: { kind: "image", src: "/images/lien-vea.svg", bg: "#ffffff" },
  },

  // 2. VENA — symbole VENA recoloré beige (matche le kaki du bandeau)
  {
    text: "VENA · Agence",
    link: "/", // on est déjà sur velito.fr (VENA) -> retour accueil agence
    external: false,
    bubble: { kind: "image", src: "/images/vena-symbole-beige.svg" },
  },

  // 3. LinkedIn — "Clavel" en kaki sur blanc, typo serif (différente)
  {
    text: "LinkedIn",
    link: "https://www.linkedin.com/in/ndema-moussa/",
    external: true,
    bubble: { kind: "text", value: "Clavel", color: KAKI, bg: "#ffffff", font: SERIF },
  },

  // 4. Twitch — l'arobase, en mono sur blanc
  {
    text: "Twitch",
    link: "https://www.twitch.tv/claveliito",
    external: true,
    bubble: { kind: "text", value: "@claveliito", color: KAKI, bg: "#ffffff", font: MONO },
  },

  // 5. YouTube — pareil
  {
    text: "YouTube",
    link: "https://www.youtube.com/@Otiil3v4lc",
    external: true,
    bubble: { kind: "text", value: "@Otiil3v4lc", color: KAKI, bg: "#ffffff", font: MONO },
  },

  // 6. TikTok — pareil
  {
    text: "TikTok",
    link: "https://www.tiktok.com/@otiil3v4lc",
    external: true,
    bubble: { kind: "text", value: "@otiil3v4lc", color: KAKI, bg: "#ffffff", font: MONO },
  },

  // 7. MABB — logo MABB sur pastille blanche
  {
    text: "MABB",
    link: "https://www.mabb.fr/clavel",
    external: true,
    bubble: { kind: "image", src: "/images/lien-mabb.png", bg: "#ffffff" },
  },

  // 8. Hub Velito (EN DERNIER) — symbole VENA kaki sur pastille blanche
  {
    text: "Hub Velito",
    link: HUB_URL,
    external: true,
    bubble: { kind: "image", src: "/images/vena-symbole-kaki.svg", bg: "#ffffff" },
  },
];
