/**
 * Configuration centralisée des liens de la page /lien.
 *
 * C'est LE seul endroit à éditer pour ajouter/retirer/réordonner un lien.
 * Ordre demandé : VEA, VENA, réseaux pro, puis le Hub en dernier.
 *
 * Les URLs des autres apps passent par variables d'environnement
 * (NEXT_PUBLIC_*) pour basculer entre local et prod sans toucher au code.
 */
import type { FlowingMenuItem } from "@/components/FlowingMenu";

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL ?? "https://hub.velito.fr";
const VEA_URL = process.env.NEXT_PUBLIC_VEA_URL ?? "https://vea.velito.fr";

// Image affichée dans le bandeau marquee (symbole VENA blanc sur fond kaki).
const MARQUEE_IMG = "/images/vena-symbole-blanc.svg";

export const LIEN_ITEMS: FlowingMenuItem[] = [
  {
    text: "VEA — Esport",
    link: VEA_URL,
    image: MARQUEE_IMG,
    external: true,
  },
  {
    text: "VENA — Agence",
    link: "/", // on est déjà sur velito.fr (VENA) → retour accueil agence
    image: MARQUEE_IMG,
    external: false,
  },
  {
    // TODO Clavel : remplacer par ton vrai compte une fois ta com lancée
    text: "Instagram",
    link: "https://instagram.com/", // ← mets ton @ ici
    image: MARQUEE_IMG,
    external: true,
  },
  {
    text: "LinkedIn",
    link: "https://linkedin.com/", // ← mets ton profil ici
    image: MARQUEE_IMG,
    external: true,
  },
  {
    text: "Hub Velito",
    link: HUB_URL,
    image: MARQUEE_IMG,
    external: true,
  },
];
