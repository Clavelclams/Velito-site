/**
 * Liste des evenements VEA marquants — historique 2022 -> aujourd'hui.
 *
 * Source : page Notion "Suivi paperasse JEP & benevolat VEA" + bilans saisons.
 * V1 : hardcode dans le code (simple, rapide, suffisant pour /profil).
 * V2 : migration vers une table vea.evenements quand le Chantier 2.3 (admin events)
 *      sera implemente. La structure ci-dessous matche deja le futur schema BDD.
 *
 * Categorisation :
 *   - 'tournoi' : competition esport (TIQE, INTERCUP, FFJV, etc.)
 *   - 'animation' : session ponctuelle (Jeudis Corner, LJSDLP, etc.)
 *   - 'programme' : recurrence hebdo (Tour Marais, Vacances QPV, Mercredis Elbeuf)
 *   - 'gouvernance' : AG, CA, bureau
 *
 * Saisons sportives VEA :
 *   - "2022/23" : sept 2022 -> juillet 2023
 *   - "2023/24" : sept 2023 -> juillet 2024
 *   - "2024/25" : sept 2024 -> juillet 2025
 *   - "2025/26" : sept 2025 -> juillet 2026 (= "Old VEA" cote app, car derniere
 *      saison avant migration site)
 *   - "2026/27" : sept 2026 -> juillet 2027 (= saison en cours dans l'app)
 */

export type EventCategory = "tournoi" | "animation" | "programme" | "gouvernance";

export interface HistoriqueEvent {
  /** Identifiant unique pour key React + futurs href detail page */
  id: string;
  /** Nom court affiche dans la liste */
  name: string;
  /** Description courte (1 phrase max) */
  description: string;
  /** Categorie pour pastille couleur */
  category: EventCategory;
  /** Saison (cle = "2022/23", "2023/24", etc.) */
  saison: string;
  /** Date approximative ou periode (ex: "Mai 2025", "Vacances scolaires 2024") */
  periode: string;
  /** Lieu (optionnel) */
  lieu?: string;
}

/** Events marquants Old VEA (avant saison 2026/2027). Liste non-exhaustive. */
export const OLD_VEA_EVENTS: HistoriqueEvent[] = [
  // ===== Saison 2024/25 =====
  {
    id: "intercup-2026",
    name: "INTERCUP 2026",
    description: "Co-organisation avec OMNE Esport. Tournoi inter-asso Hauts-de-France.",
    category: "tournoi",
    saison: "2025/26",
    periode: "Printemps 2026",
    lieu: "Amiens",
  },
  {
    id: "enight-world-cup",
    name: "E-Night World Cup",
    description: "Co-organise avec B2G Amiens. Soiree esport competitive.",
    category: "tournoi",
    saison: "2025/26",
    periode: "2025/26",
    lieu: "Amiens",
  },
  {
    id: "ljsdlp-2025",
    name: "Les Jeunes Sont Dans La Place 2025",
    description: "Animation jeunesse VEA. 5h sur place avec encadrants.",
    category: "animation",
    saison: "2024/25",
    periode: "24 mai 2025",
    lieu: "Amiens",
  },
  {
    id: "ffjv-sf6-finale",
    name: "FFJV SF6 Finale",
    description: "Federation Francaise de Jeu Video — finale Street Fighter 6. 4 joueurs VEA.",
    category: "tournoi",
    saison: "2024/25",
    periode: "2024/25",
    lieu: "Paris (trajet train)",
  },
  {
    id: "tiqe-2024",
    name: "TIQE 2024 (Tournoi Inter-Quartiers Esport)",
    description: "5 tournois locaux (Nord, Sud, Est, Ouest, Final centre-ville). 92 personnes touchees.",
    category: "tournoi",
    saison: "2023/24",
    periode: "2024",
    lieu: "Amiens (5 quartiers)",
  },
  {
    id: "jeudis-corner-2024",
    name: "Jeudis du Corner",
    description: "5 jeudis x 2h. Sessions esport ouvertes. Plusieurs benevoles encadrants.",
    category: "animation",
    saison: "2023/24",
    periode: "2024",
    lieu: "Corner Amiens",
  },

  // ===== Programmes recurrents (compte 1 par saison) =====
  {
    id: "tour-marais-2024-25",
    name: "Tour du Marais 2024/25",
    description: "Programme hebdo mardis (hors vacances). Encadrement esport jeunes Etouvie.",
    category: "programme",
    saison: "2024/25",
    periode: "Mardis hors vacances",
    lieu: "Tour du Marais, Etouvie",
  },
  {
    id: "tour-marais-2023-24",
    name: "Tour du Marais 2023/24",
    description: "Programme hebdo mardis. ~22 seances dans la saison.",
    category: "programme",
    saison: "2023/24",
    periode: "Mardis hors vacances",
    lieu: "Tour du Marais, Etouvie",
  },
  {
    id: "tour-marais-2022-23",
    name: "Tour du Marais 2022/23",
    description: "Programme hebdo jeudis (1ere saison). Lancement structurant de VEA.",
    category: "programme",
    saison: "2022/23",
    periode: "Jeudis hors vacances",
    lieu: "Tour du Marais, Etouvie",
  },
  {
    id: "vacances-qpv-2024-25",
    name: "Vacances QPV 2024/25",
    description: "5 periodes (hiver/printemps/ete/toussaint/noel). Animations centres sociaux.",
    category: "programme",
    saison: "2024/25",
    periode: "Vacances scolaires",
    lieu: "Centres sociaux Amiens Nord/Sud/Est",
  },
  {
    id: "vacances-qpv-2023-24",
    name: "Vacances QPV 2023/24",
    description: "5 periodes. Centres sociaux + groupe benevoles regulier.",
    category: "programme",
    saison: "2023/24",
    periode: "Vacances scolaires",
    lieu: "Centres sociaux Amiens",
  },
  {
    id: "vacances-qpv-2022-23",
    name: "Vacances QPV 2022/23",
    description: "Premiere saison animations vacances. 5 periodes.",
    category: "programme",
    saison: "2022/23",
    periode: "Vacances scolaires",
    lieu: "Centres sociaux Amiens",
  },
  {
    id: "mercredis-elbeuf-2025-26",
    name: "Mercredis Elbeuf 2025/26",
    description: "Nouvelle recurrence — animations mercredis quartier Elbeuf.",
    category: "programme",
    saison: "2025/26",
    periode: "Mercredis",
    lieu: "Elbeuf (Amiens)",
  },

  // ===== Tournois en ligne (organise par VEA) =====
  {
    id: "tournois-en-ligne",
    name: "Tournois en ligne (50+)",
    description: "Cumul depuis 2022 : Battle Royal, Rocket League, R6, NBA 2K, FC, etc. 123+ joueurs inscrits.",
    category: "tournoi",
    saison: "Toutes",
    periode: "2022 -> 2026",
    lieu: "En ligne",
  },

  // ===== Gouvernance =====
  {
    id: "age-2026",
    name: "AGE 30/04/2026",
    description: "Assemblee Generale Extraordinaire. Election bureau actuel (11 dirigeants).",
    category: "gouvernance",
    saison: "2025/26",
    periode: "30 avril 2026",
    lieu: "Amiens",
  },
];

/** Events saison 2026/2027 (a remplir au fur et a mesure de la saison) */
export const EVENTS_2026_2027: HistoriqueEvent[] = [
  // Vide pour l'instant — sera peuple via /admin (Chantier 2.3)
];

/** Couleur pill par categorie pour le rendu UI */
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  tournoi: "bg-vea-accent text-white border-vea-accent",
  animation: "bg-blue-50 text-blue-700 border-blue-200",
  programme: "bg-purple-50 text-purple-700 border-purple-200",
  gouvernance: "bg-amber-50 text-amber-700 border-amber-200",
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  tournoi: "Tournoi",
  animation: "Animation",
  programme: "Programme",
  gouvernance: "Gouvernance",
};
