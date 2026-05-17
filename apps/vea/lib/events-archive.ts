/**
 * Archive des evenements VEA — historique documente (statique).
 *
 * Sources :
 *   - Rapport reseaux sociaux Instagram @velitoesport (24 mars 2026)
 *   - Debrief strategique 12 mai 2026 (saison 2025/2026)
 *   - Base Notion "VEA Bilan Activites" (23 fiches, 3 saisons)
 *   - Tournois Toornament confirmes par Clavel (17 mai 2026)
 *
 * Cette liste est utilisee par /agenda en COMPLEMENT du fetch Prisma.
 * Schema aligne sur le modele Prisma `Evenement`. Les events archive ont
 * `actif: false` car ce sont des passes.
 *
 * Types autorises : TOURNOI | ATELIER | ANIMATION | COMPETITION
 */

export interface EventArchive {
  id: string;
  titre: string;
  description: string;
  date: string;
  lieu: string;
  type: "TOURNOI" | "ATELIER" | "ANIMATION" | "COMPETITION";
  actif: boolean;
  /** Lien externe optionnel (Toornament, article presse, etc.) */
  lien?: string;
  /** Slug pour filtrer la galerie /medias?event=<slug> et afficher les photos de cet event */
  gallerySlug?: string;
}

export const EVENTS_ARCHIVE: EventArchive[] = [
  // ===== 2026 =====
  {
    id: "archive-2026-intercup",
    titre: "INTERCUP 2026 — Top 8 national",
    description:
      "Plus grande delegation VEA jamais envoyee en competition nationale : 12 jeunes amienois dont 4 jeunes filles. Quart de finale, organise par OMNE Esport.",
    date: "2026-02-28",
    lieu: "Courbevoie (region parisienne)",
    type: "COMPETITION",
    actif: false,
  },
  {
    id: "archive-2026-tour-marais-fev",
    titre: "Intervention Tour du Marais — fevrier",
    description: "Animation esport reguliere au centre social Tour du Marais.",
    date: "2026-02-13",
    lieu: "Centre social Tour du Marais, Etouvie",
    type: "ANIMATION",
    actif: false,
  },
  {
    id: "archive-2026-journee-sport",
    titre: "Journee du Sport",
    description: "Participation a la Journee du Sport — carnet d'adresses.",
    date: "2026-03-07",
    lieu: "Amiens",
    type: "ANIMATION",
    actif: false,
  },
  {
    id: "archive-2026-parcours-coeur",
    titre: "Parcours du Coeur — Saint-Just",
    description: "Animation pour environ 150 eleves dans le cadre du Parcours du Coeur.",
    date: "2026-05-04",
    lieu: "Saint-Just, Amiens",
    type: "ANIMATION",
    actif: false,
  },

  // ===== 2025 =====
  {
    id: "archive-2025-pleiade",
    titre: "Intervention La Pleiade — sensibilisation numerique",
    description:
      "Animation esport melant competition amicale, cohesion et sensibilisation au numerique. 33 jeunes dont 7 filles. Partenaires : FFJV, UFOLEP Somme.",
    date: "2025-10-26",
    lieu: "La Pleiade, Amiens Nord",
    type: "ANIMATION",
    actif: false,
  },
  {
    id: "archive-2025-vea-x-basket",
    titre: "VEA x Comite Somme Basket-Ball",
    description:
      "Premiere collaboration sport traditionnel / esport documentee. 28 personnes — parite parfaite (14 garcons / 14 filles).",
    date: "2025-10-23",
    lieu: "Amiens",
    type: "ANIMATION",
    actif: false,
  },
  {
    id: "archive-2025-l-albatros",
    titre: "Intervention L'Albatros",
    description: "Animation esport au centre social L'Albatros.",
    date: "2025-10-21",
    lieu: "Centre social L'Albatros, Amiens",
    type: "ANIMATION",
    actif: false,
  },
  {
    id: "archive-2025-moxy",
    titre: "Intervention Moxy",
    description: "Animation esport au centre social Moxy.",
    date: "2025-10-28",
    lieu: "Centre social Moxy, Saint-Acheul",
    type: "ANIMATION",
    actif: false,
  },
  {
    id: "archive-2025-rentree-s4",
    titre: "Rentree VEA Saison 4 + Jeu Concours",
    description:
      "Annonce reprise des activites, systeme de licences, jeu concours (gagner un jeu video). Lancement saison 2025-2026.",
    date: "2025-09-01",
    lieu: "Amiens",
    type: "ANIMATION",
    actif: false,
  },
  {
    id: "archive-2025-eid",
    titre: "Fete de l'Eid avec Jeunesse en Or",
    description:
      "Stand jeux video lors de la fete de fin du Ramadan. Premiere presence dans un evenement communautaire majeur.",
    date: "2025-04-03",
    lieu: "Stade Jean-Bouin, Amiens",
    type: "ANIMATION",
    actif: false,
  },

  // ===== 2024 =====
  {
    id: "archive-2024-e-night-world-cup",
    titre: "E-Night World Cup — 1ere edition (FC25)",
    description:
      "Grande soiree esport co-organisee par VEA avec B2Gang Amiens et l'IUT (projet tutore). Tournoi EA FC 25 format coupe du monde, 32 places ouvertes sur HelloAsso, 26 inscrits. 3 lots a gagner (manettes PS5), repas fournis sur place. Salle des Provinces, secteur ouest d'Amiens. Theme : unite, competition, fair-play.",
    date: "2024-12-05",
    lieu: "Salle des Provinces, Etouvie (secteur ouest), Amiens",
    type: "TOURNOI",
    actif: false,
    lien: "https://play.toornament.com/fr/tournaments/8347780447279767552/",
    gallerySlug: "e-night-world-cup",
  },
  {
    id: "archive-2024-sparking-arena",
    titre: "Sparking Arena VEA — Dragon Ball Sparking Zero",
    description:
      "Grand tournoi en ligne organise par VEA sur Dragon Ball Sparking Zero (PS5). 64 joueurs. Premier tournoi online de la saison 3.",
    date: "2024-11-01",
    lieu: "En ligne (PS5)",
    type: "TOURNOI",
    actif: false,
    lien: "https://play.toornament.com/fr/tournaments/8188599186640420864/",
  },
  {
    id: "archive-2024-parc-st-pierre",
    titre: "Activites ete — Parc Saint-Pierre",
    description:
      "Animation estivale gratuite en plein air, environ 20 jeunes par jour. Du 16 au 31 juillet 2024. Couverture Courrier Picard.",
    date: "2024-07-16",
    lieu: "Parc Saint-Pierre, Amiens centre",
    type: "ANIMATION",
    actif: false,
    gallerySlug: "parc-saint-pierre",
  },
  {
    id: "archive-2024-tiqe-final",
    titre: "TIQE 2024 — Grande Finale",
    description:
      "Finale du Tournoi Inter Quartier Esport sur EA FC 24. Vainqueur : Stephan, 2e : Mathias.",
    date: "2024-06-28",
    lieu: "Le Corner, Amiens",
    type: "TOURNOI",
    actif: false,
    gallerySlug: "tiqe-final-corner",
  },
  {
    id: "archive-2024-sf6-fed",
    titre: "Championnat Federal SF6 — FFJV",
    description:
      "Joueurs VEA : Mamba, Chewing Gum, NoyzBoy, Pinh (Tony Tagoe). Resultat : 3e place de France en Street Fighter 6 (Pinh). Couverture Gazette Sports.",
    date: "2024-06-14",
    lieu: "Vitry Gaming, Paris",
    type: "COMPETITION",
    actif: false,
    gallerySlug: "sf6-fed-vitry",
  },
  {
    id: "archive-2024-tiqe-est",
    titre: "TIQE 2024 — Secteur Est",
    description: "Phase de secteur Est sur EA FC 24. Vainqueur : Hassan (bon d'achat GameCash).",
    date: "2024-04-26",
    lieu: "Gymnase Elbeuf, Saint-Just, Amiens",
    type: "TOURNOI",
    actif: false,
    gallerySlug: "tiqe-est-elbeuf",
  },
  {
    id: "archive-2024-sf6-warpzone",
    titre: "Street Fighter 6 FFJV Amiens — WarpZone",
    description:
      "Tournoi SF6 organise par VEA dans le cadre du championnat Street Fighter FFJV. Rassemble la communaute des jeux de combat. Evenement non officiel Capcom.",
    date: "2024-02-16",
    lieu: "WarpZone, 21 Pl. Vogel, Amiens",
    type: "TOURNOI",
    actif: false,
    lien: "https://play.toornament.com/fr/tournaments/7475119386799587328/",
  },

  // Programme reconditionnement PC pour la MABB (stages dans VEA)
  // Je recupere des vieux ordis, les remets en etat avec les stagiaires,
  // ils repartent avec leur PC refait par leurs soins + don a la MABB.
  // C'est un de mes ateliers signature : insertion + ecologie + transmission.
  {
    id: "archive-2024-stages-reconditionnement-pc",
    titre: "Atelier reconditionnement PC — Stages VEA 2024",
    description:
      "Programme d'ateliers reconditionnement PC : recuperation de vieux ordinateurs, remise en etat, formation. 4 stagiaires accompagnes (Berstelien, Cyprien, Leny, Oumayma) — chacun repart avec son PC refait par ses soins. PC offerts a la MABB qui les utilise pour le marquage des matchs.",
    date: "2024-03-15",
    lieu: "Amiens",
    type: "ATELIER",
    actif: false,
    gallerySlug: "sf6-warpzone",
  },
  {
    id: "archive-2022-stage-maya-pc",
    titre: "Atelier reconditionnement PC — Stage Maya (3eme)",
    description:
      "Premier atelier reconditionnement PC dans le cadre du stage 3eme de Maya Gombert (membre jeune VEA, decembre 2022). Recuperation, remise en etat, formation. PC offerts a la MABB pour le marquage des matchs.",
    date: "2022-12-15",
    lieu: "Amiens",
    type: "ATELIER",
    actif: false,
  },

  // ===== 2023 =====
  {
    id: "archive-2023-fifa-amiens",
    titre: "FIFA Amiens VEA — Tournoi de fin d'annee",
    description:
      "Petit tournoi FIFA de fin d'annee pour les amoureux du ballon rond. Operation de promotion de l'association VEA.",
    date: "2023-12-23",
    lieu: "Amiens",
    type: "TOURNOI",
    actif: false,
    lien: "https://play.toornament.com/fr/tournaments/6255023510309224448/",
    gallerySlug: "fifa-amiens-vea",
  },
  {
    id: "archive-2023-mabb-x-vea",
    titre: "MABB x VEA — Tournoi Rocket League",
    description:
      "Tournoi Rocket League co-organise avec la Metropole Amienoise Basketball (MABB). Offre une experience gaming aux membres de l'association MABB.",
    date: "2023-11-15",
    lieu: "Amiens",
    type: "TOURNOI",
    actif: false,
    lien: "https://play.toornament.com/fr/tournaments/6674578646973472768/",
  },
  {
    id: "archive-2023-tiqe-sud",
    titre: "TIQE — Secteur Sud",
    description:
      "Phase secteur Sud du TIQE sur EA FC 24. Premier TIQE avec inscription en ligne et multi-partenaires (MABB, EVA, Jeunesse en Or, Amiens Metropole).",
    date: "2023-12-26",
    lieu: "La Table du Marais, Amiens Sud",
    type: "TOURNOI",
    actif: false,
    gallerySlug: "tiqe-sud",
  },
  {
    id: "archive-2023-tiqe-etouvie",
    titre: "Premier TIQE — Secteur Etouvie",
    description:
      "Evenement fondateur du format TIQE. Initiation pour les 10 ans + tournoi 16/25 ans. Environ 30 jeunes. Couverture Courrier Picard.",
    date: "2023-11-02",
    lieu: "Salle des Provinces, Etouvie, Amiens",
    type: "TOURNOI",
    actif: false,
    gallerySlug: "tiqe-etouvie",
  },
  {
    id: "archive-2023-fete-science",
    titre: "Fete de la Science — Overwatch 2",
    description: "Premiere presence dans un evenement institutionnel non-gaming. Mise en avant d'Overwatch 2 (personnage Junker Queen).",
    date: "2023-10-13",
    lieu: "Amiens",
    type: "ANIMATION",
    actif: false,
  },
  {
    id: "archive-2023-pro-am-suaps",
    titre: "Pro-Am 3v3 SUAPS Basket — UPJV",
    description:
      "Tournoi 3v3 a l'initiative des joueurs UPJV participant au SUAPS. Participation d'une equipe VEA. Phases finales en BO3.",
    date: "2023-05-01",
    lieu: "UPJV, Amiens",
    type: "COMPETITION",
    actif: false,
    lien: "https://play.toornament.com/fr/tournaments/7110194778008780800/",
  },
  {
    id: "archive-2023-championnat-federal-rl",
    titre: "Championnat Federal Rocket League FFJV — Saison 2023",
    description:
      "Competition Rocket League 3v3 amateur FFJV. Equipe VEA engagee dans le championnat federal. Phase de poule par division (9 janvier - 22 mai 2023).",
    date: "2023-01-09",
    lieu: "En ligne (championnat national FFJV)",
    type: "COMPETITION",
    actif: false,
    lien: "https://play.toornament.com/fr/tournaments/6107099120713465856/",
  },
  {
    id: "archive-2023-battle-kart",
    titre: "Sortie Battle Kart — Recompense Mario Kart",
    description:
      "Les gagnants du tournoi Mario Kart VEA recompenses par une session de karting reel. Premiere initiative recompense IRL.",
    date: "2023-04-22",
    lieu: "Battle Kart, Amiens",
    type: "ANIMATION",
    actif: false,
  },
];
