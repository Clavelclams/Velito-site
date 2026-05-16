/**
 * Configuration centralisée des 5 modules de l'écosystème Velito.
 *
 * Source unique de vérité utilisée par :
 *  - InfiniteMenu (textures + liens cliquables dans la sphère 3D)
 *  - ModulesList (liste HTML accessible pour lecteurs d'écran + clavier)
 *  - Fallback "reduced-motion" de GalaxyHero (grille statique)
 *
 * Si tu ajoutes un module : ajoute une entrée ici, un placeholder dans
 * public/modules/, et la sphère + la liste a11y se mettent à jour seules.
 */

export interface VelitoModule {
  /** Identifiant court, utilisé pour le nom du fichier placeholder PNG. */
  slug: string;
  /** Nom affiché du module. */
  name: string;
  /** URL complète vers le sous-domaine de production. */
  url: string;
  /** Couleur accent du module (utilisée pour les placeholders et la grille a11y). */
  accent: string;
  /** Description courte affichée sous le titre dans InfiniteMenu (max ~80 chars). */
  description: string;
  /** Chemin de la texture utilisée dans l'atlas WebGL (relatif à /public). */
  image: string;
  /** Phrase d'accroche utilisée dans le fallback reduced-motion + ModulesList. */
  tagline: string;
}

export const modules: VelitoModule[] = [
  {
    slug: "vea",
    name: "VEA",
    url: "https://vea.velito.com",
    accent: "#E63946",
    description: "Inclusion par l'esport, Amiens",
    image: "/modules/vea.png",
    tagline:
      "Velito Esport Amiens — association loi 1901 dédiée à l'inclusion des jeunes par l'esport.",
  },
  {
    slug: "vena",
    name: "VENA",
    url: "https://vena.velito.com",
    accent: "#414C35",
    description: "Agence numérique amiénoise",
    image: "/modules/vena.png",
    tagline:
      "Velito Expertise Numérique Amiens — SASU spécialisée dans le web, la vidéo et la formation.",
  },
  {
    slug: "arena",
    name: "ARENA",
    url: "https://arena.velito.com",
    accent: "#c026d3",
    description: "Plateforme de tournois esport",
    image: "/modules/arena.png",
    tagline:
      "ARENA — gestion de tournois esport : inscriptions, brackets, classements, streaming.",
  },
  {
    slug: "interactive",
    name: "Interactive",
    url: "https://interactive.velito.com",
    accent: "#ffc3a0",
    description: "Animations gaming bars et MJC",
    image: "/modules/interactive.png",
    tagline:
      "Interactive — solutions clé en main d'animations esport pour bars, MJC et espaces jeunes.",
  },
  {
    slug: "prevention",
    name: "Prévention",
    url: "https://prevention.velito.com",
    accent: "#b9e7cd",
    description: "Prévention numérique B2B",
    image: "/modules/prevention.png",
    tagline:
      "Prévention Numérique — infrastructure SaaS pour la pratique compétitive encadrée.",
  },
];
