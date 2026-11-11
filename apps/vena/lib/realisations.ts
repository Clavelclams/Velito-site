/**
 * Données de la page /realisations (portfolio VENA).
 *
 * [11/11/2026] Données dans le code, pas en base : la liste change rarement
 * et un fichier se relit dans un diff. Pour ajouter un projet ou une
 * personne, on ajoute un objet ici, la page suit toute seule.
 *
 * Règle sur les personnes : uniquement ce qu'elles ont accepté de voir
 * publié (nom, rôle, lien). Jamais de date de naissance, d'adresse ni de
 * numéro d'entreprise, même s'ils sont publics ailleurs.
 */

export interface Projet {
  slug: string;
  nom: string;
  /** Une phrase : ce que c'est. */
  accroche: string;
  /** Ce que le projet fait, en 2 ou 3 phrases. */
  description: string;
  /** Ce que VENA / Clavel a fait dessus. */
  role: string;
  stack: string[];
  statut: string;
  liens: { label: string; url: string }[];
  /** Classe de fond (palette VENA). */
  fond: string;
}

export interface Collaborateur {
  nom: string;
  /** Ce que la personne a fait avec nous. */
  contribution: string;
  /** Parcours en une phrase (facultatif). */
  parcours?: string;
  /** Site ou LinkedIn, seulement si la personne l'a donné. */
  lien?: { label: string; url: string };
}

export const PROJETS: Projet[] = [
  {
    slug: "venaball",
    nom: "Venaball",
    accroche: "La plateforme basket pour les joueuses et les staffs de club.",
    description:
      "Deux applications mobiles : Venaball pour les joueuses (entraînement, progression, défis) et Venaball Club pour le staff (effectif, convocations, matchs, stats en direct). Un seul serveur, plusieurs clubs, chacun ne voit que ses données.",
    role:
      "Conception, développement des deux apps et de l'API, mise en production, publication sur les stores.",
    stack: ["Expo / React Native", "TypeScript", "Symfony", "PHP", "MySQL"],
    statut: "En production",
    liens: [{ label: "venaball.fr", url: "https://venaball.fr" }],
    fond: "bg-vena-peche",
  },
  {
    slug: "interactive",
    nom: "Velito Interactive",
    accroche: "Des jeux de soirée pour les bars, joués sur la télé et les téléphones.",
    description:
      "L'écran du bar affiche le jeu, chaque client joue depuis son téléphone sans rien installer : quiz, blind test, Pin'Point (placer un lieu sur la carte du monde), dessin, réflexes. Scores en direct.",
    role: "Conception des jeux, développement, temps réel, tests en conditions réelles.",
    stack: ["Next.js", "React", "TypeScript", "Supabase (temps réel)", "Leaflet"],
    statut: "En production",
    liens: [{ label: "interactive.velito.fr", url: "https://interactive.velito.fr" }],
    fond: "bg-vena-tilleul",
  },
  {
    slug: "ecosysteme-velito",
    nom: "Sites VEA, Hub et Arena",
    accroche: "Les outils en ligne de l'écosystème Velito.",
    description:
      "Le site de Velito Esport Amiens (agenda, inscriptions, actus), le Hub Velito (connexion unique et suivi des projets) et Arena (tournois esport et profils joueurs). Un seul compte pour tout.",
    role: "Conception, design, développement, hébergement, maintenance.",
    stack: ["Next.js", "React", "TypeScript", "Tailwind", "Supabase", "Turborepo"],
    statut: "En production",
    liens: [
      { label: "vea.velito.fr", url: "https://vea.velito.fr" },
      { label: "hub.velito.fr", url: "https://hub.velito.fr" },
      { label: "arena.velito.fr", url: "https://arena.velito.fr" },
    ],
    fond: "bg-vena-lavande",
  },
];

export const COLLABORATEURS: Collaborateur[] = [
  {
    // TODO Clavel : nom complet et lien si Loubna est d'accord.
    nom: "Loubna",
    contribution: "Création du logo VENA.",
  },
  {
    // TODO Clavel : lien (site VEYLO ou LinkedIn) une fois son accord obtenu.
    nom: "Berstelien MILAPIE",
    contribution: "Communication et contenus de Velito Esport Amiens.",
    parcours:
      "Stagiaire chez VEA, puis prestataire, aujourd'hui cofondateur de VEYLO, sa société de développement.",
  },
];
