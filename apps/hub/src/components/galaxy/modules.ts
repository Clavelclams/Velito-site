/**
 * Configuration centralisée des 9 médaillons de l'écosystème Velito.
 *
 * Source unique de vérité utilisée par :
 *  - InfiniteMenu (textures + liens cliquables dans la sphère 3D)
 *  - ModulesList (liste HTML accessible pour lecteurs d'écran + clavier)
 *  - Fallback "reduced-motion" de GalaxyHero (grille statique)
 *  - Page /construction (titre, accent, image)
 *
 * Structure narrative en 3 niveaux :
 *  1. Modules historiques : VEA, ARENA, Interactive, Prévention
 *  2. Sous-marques VENA : Services (agence), Plateforme, Prod, Store
 *  3. Service transversal : Morse (messagerie unifiée — code morse comme
 *     langage universel de signaux dans l'écosystème)
 *
 * URLs : tous les modules pointent vers /construction?slug=xxx en attendant
 * que leurs sous-domaines respectifs soient prêts. Quand un module sort en
 * prod, on change l'url vers l'URL externe complète et InfiniteMenu ouvrira
 * l'externe dans un nouvel onglet automatiquement.
 */

export interface VelitoModule {
  /** Identifiant court, utilisé pour le nom du fichier placeholder PNG. */
  slug: string;
  /** Nom affiché du module (court, design). */
  name: string;
  /** URL cible. Si commence par "http" → ouvert en nouvel onglet ; sinon → navigation interne. */
  url: string;
  /** Couleur accent (placeholders + grille a11y + bordure liste + page construction). */
  accent: string;
  /** Description courte affichée à DROITE dans InfiniteMenu (~40 chars). */
  description: string;
  /** Chemin de la texture utilisée dans l'atlas WebGL (relatif à /public). */
  image: string;
  /** Phrase d'accroche (fallback reduced-motion + ModulesList + page construction). */
  tagline: string;
  /** Résumé "Explorez X..." affiché SOUS le titre dans InfiniteMenu (~120 chars). */
  summary: string;
}

export const modules: VelitoModule[] = [
  {
    slug: "vea",
    name: "VEA",
    url: process.env.NEXT_PUBLIC_VEA_URL ?? "/construction?slug=vea",
    accent: "#E63946",
    description: "Inclusion par l'esport, Amiens",
    image: "/modules/vea.png",
    tagline:
      "Velito Esport Amiens — association loi 1901 dédiée à l'inclusion des jeunes par l'esport.",
    summary:
      "Explorez Velito Esport Amiens, un club esport associatif qui utilise le jeu vidéo comme outil d'inclusion sociale pour les jeunes des quartiers.",
  },
  {
    slug: "services",
    name: "Services",
    url: "/construction?slug=services",
    accent: "#414C35",
    description: "Agence numérique amiénoise",
    image: "/modules/services.png",
    tagline:
      "VENA Services — agence numérique d'Amiens : développement web, vidéo, formation.",
    summary:
      "Explorez VENA Services, l'agence numérique d'Amiens : sites web, vidéos, formations pour entrepreneurs locaux.",
  },
  {
    slug: "arena",
    name: "ARENA",
    url: "/construction?slug=arena",
    accent: "#c026d3",
    description: "Plateforme tournois esport",
    image: "/modules/arena.png",
    tagline:
      "ARENA — gestion de tournois esport amateur : inscriptions, brackets, classements.",
    summary:
      "Explorez ARENA, la plateforme de gestion de tournois esport amateur : inscriptions, brackets, classements et diffusion.",
  },
  {
    slug: "interactive",
    name: "Interactive",
    url: "/construction?slug=interactive",
    accent: "#ffc3a0",
    description: "Animations gaming bars et MJC",
    image: "/modules/interactive.png",
    tagline:
      "Interactive — solutions clé en main d'animations esport pour bars, MJC et espaces jeunes.",
    summary:
      "Explorez Velito Interactive, des animations gaming clé en main pour bars, MJC et espaces jeunes : quiz, mini-jeux, soirées.",
  },
  {
    slug: "prevention",
    name: "Prévention",
    url: "/construction?slug=prevention",
    accent: "#b9e7cd",
    description: "Prévention numérique B2B",
    image: "/modules/prevention.png",
    tagline:
      "Velito Prévention — infrastructure SaaS pour la pratique compétitive numérique encadrée.",
    summary:
      "Explorez Velito Prévention, l'infrastructure SaaS pour encadrer la pratique numérique compétitive dans les structures jeunesse.",
  },
  {
    slug: "plateforme",
    name: "Plateforme",
    url: "/construction?slug=plateforme",
    accent: "#2d9cdb",
    description: "Marketplace freelances locaux",
    image: "/modules/plateforme.png",
    tagline:
      "Plateforme — marketplace des freelances et créatifs amiénois. Photographes, vidéastes, devs, CM.",
    summary:
      "Explorez la Plateforme Velito, la marketplace des freelances et créatifs amiénois : photographes, vidéastes, devs, community managers.",
  },
  {
    slug: "prod",
    name: "Prod",
    url: "/construction?slug=prod",
    accent: "#f59e0b",
    description: "Studio audiovisuel B2B",
    image: "/modules/prod.png",
    tagline:
      "Prod — studio audiovisuel B2B : production vidéo, branding, stratégie de communication.",
    summary:
      "Explorez Velito Prod, le studio audiovisuel B2B : production vidéo, branding, stratégie de communication pour les marques locales.",
  },
  {
    slug: "store",
    name: "Store",
    url: "/construction?slug=store",
    accent: "#ec4899",
    description: "Marketplace créateurs amiénois",
    image: "/modules/store.png",
    tagline:
      "Store — marketplace de créateurs et marques locales d'Amiens. Textile, créations, goodies.",
    summary:
      "Explorez Velito Store, la marketplace des créateurs et marques locales d'Amiens : textile, créations, goodies du territoire.",
  },
  {
    slug: "morse",
    name: "Morse",
    url: "/construction?slug=morse",
    accent: "#8b5cf6",
    description: "Messagerie unifiée Velito",
    image: "/modules/morse.png",
    tagline:
      "Morse — messagerie unifiée de l'écosystème Velito. Un compte, tous les messages.",
    summary:
      "Explorez Morse, la messagerie unifiée de l'écosystème Velito. Un seul compte pour communiquer entre tous les modules.",
  },
];
