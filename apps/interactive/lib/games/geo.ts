/**
 * Géo — Place le pin au plus proche de la cible.
 *
 * Mécanique :
 *  - 5 cibles par partie (ville, monument, événement)
 *  - 25s par cible : le joueur clique/drag un pin sur la carte (Leaflet)
 *  - Au reveal : on calcule la distance (Haversine) entre le pin et la cible
 *  - Scoring basé sur la distance + bonus rang
 *
 * Banque V1 : focus France (Amiens, grandes villes), Europe, quelques monuments
 * mondiaux. À étoffer + packs thématiques en V2.
 */

export interface GeoTarget {
  id: string;
  /** Ce qu'on demande de pointer ("Trouve Marseille"). */
  label: string;
  /** Vraie coordonnée WGS84. */
  lat: number;
  lng: number;
  /** Sous-titre / contexte affiché en petit ("Préfecture des Bouches-du-Rhône"). */
  hint?: string;
  /** Niveau de zoom initial pour la carte joueur (1=monde, 5=Europe, 10=ville). */
  initialZoom?: number;
  /** Position initiale (centre carte joueur). Par défaut : centre France. */
  initialCenter?: [number, number];
  /** Thème. */
  theme?: string;
}

/**
 * Banque V1 — équilibre France / Europe / Monde + un focus Amiens
 * (puisque le produit est commercialisé chez les bars amiénois).
 */
export const GEO_TARGETS: GeoTarget[] = [
  // ─── Amiens / Hauts-de-France ───
  {
    id: "amiens",
    label: "Amiens",
    lat: 49.8941,
    lng: 2.2958,
    hint: "Préfecture de la Somme · Cathédrale gothique",
    theme: "Amiens",
    initialZoom: 5,
    initialCenter: [46.7, 2.5], // centre France
  },
  {
    id: "lille",
    label: "Lille",
    lat: 50.6292,
    lng: 3.0573,
    hint: "Préfecture du Nord · Capitale des Hauts-de-France",
    theme: "France Nord",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },
  // ─── Grandes villes France ───
  {
    id: "marseille",
    label: "Marseille",
    lat: 43.2965,
    lng: 5.3698,
    hint: "Préfecture des Bouches-du-Rhône",
    theme: "France",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },
  {
    id: "lyon",
    label: "Lyon",
    lat: 45.764,
    lng: 4.8357,
    hint: "Préfecture du Rhône",
    theme: "France",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },
  {
    id: "bordeaux",
    label: "Bordeaux",
    lat: 44.8378,
    lng: -0.5792,
    hint: "Préfecture de la Gironde",
    theme: "France",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },
  {
    id: "strasbourg",
    label: "Strasbourg",
    lat: 48.5734,
    lng: 7.7521,
    hint: "Préfecture du Bas-Rhin · Parlement européen",
    theme: "France",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },
  // ─── Monuments France ───
  {
    id: "mont-saint-michel",
    label: "Le Mont-Saint-Michel",
    lat: 48.636,
    lng: -1.5114,
    hint: "Manche · Abbaye médiévale sur îlot rocheux",
    theme: "Monument FR",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },
  // ─── Europe ───
  {
    id: "rome",
    label: "Rome",
    lat: 41.9028,
    lng: 12.4964,
    hint: "Capitale de l'Italie",
    theme: "Europe",
    initialZoom: 4,
    initialCenter: [50, 10],
  },
  {
    id: "berlin",
    label: "Berlin",
    lat: 52.52,
    lng: 13.405,
    hint: "Capitale de l'Allemagne",
    theme: "Europe",
    initialZoom: 4,
    initialCenter: [50, 10],
  },
  {
    id: "madrid",
    label: "Madrid",
    lat: 40.4168,
    lng: -3.7038,
    hint: "Capitale de l'Espagne",
    theme: "Europe",
    initialZoom: 4,
    initialCenter: [50, 10],
  },
  {
    id: "athenes",
    label: "Athènes",
    lat: 37.9838,
    lng: 23.7275,
    hint: "Capitale de la Grèce",
    theme: "Europe",
    initialZoom: 4,
    initialCenter: [50, 10],
  },
  // ─── Monde ───
  {
    id: "tokyo",
    label: "Tokyo",
    lat: 35.6762,
    lng: 139.6503,
    hint: "Capitale du Japon",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "rio",
    label: "Rio de Janeiro",
    lat: -22.9068,
    lng: -43.1729,
    hint: "Brésil · Christ Rédempteur",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "le-cap",
    label: "Le Cap",
    lat: -33.9249,
    lng: 18.4241,
    hint: "Afrique du Sud · Pointe sud de l'Afrique",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "new-york",
    label: "New York",
    lat: 40.7128,
    lng: -74.006,
    hint: "USA · Statue de la Liberté",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AJOUTS 07/2026 — +20 cibles (retour playtest "on fait vite le tour").
  // La banque passe de 15 à 35 : avec 7 rounds/partie, il faut 5 parties
  // pour tout voir. Coordonnées WGS84 des centres-villes.
  // ═══════════════════════════════════════════════════════════════════════

  // ─── France (zoom 5, centré France — même réglage que les existantes) ───
  {
    id: "paris",
    label: "Paris",
    lat: 48.8566,
    lng: 2.3522,
    hint: "Capitale · Tour Eiffel",
    theme: "France",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },
  {
    id: "toulouse",
    label: "Toulouse",
    lat: 43.6047,
    lng: 1.4442,
    hint: "La Ville rose · Airbus",
    theme: "France",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },
  {
    id: "nice",
    label: "Nice",
    lat: 43.7102,
    lng: 7.262,
    hint: "Côte d'Azur · Promenade des Anglais",
    theme: "France",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },
  {
    id: "nantes",
    label: "Nantes",
    lat: 47.2184,
    lng: -1.5536,
    hint: "Loire-Atlantique · Le Grand Éléphant",
    theme: "France",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },
  {
    id: "brest",
    label: "Brest",
    lat: 48.3904,
    lng: -4.4861,
    hint: "Finistère · Port militaire",
    theme: "France",
    initialZoom: 5,
    initialCenter: [46.7, 2.5],
  },

  // ─── Europe (zoom 4, centré Europe) ───
  {
    id: "londres",
    label: "Londres",
    lat: 51.5074,
    lng: -0.1278,
    hint: "Royaume-Uni · Big Ben",
    theme: "Europe",
    initialZoom: 4,
    initialCenter: [50, 10],
  },
  {
    id: "lisbonne",
    label: "Lisbonne",
    lat: 38.7223,
    lng: -9.1393,
    hint: "Portugal · Tramways jaunes",
    theme: "Europe",
    initialZoom: 4,
    initialCenter: [50, 10],
  },
  {
    id: "dublin",
    label: "Dublin",
    lat: 53.3498,
    lng: -6.2603,
    hint: "Irlande · Temple Bar",
    theme: "Europe",
    initialZoom: 4,
    initialCenter: [50, 10],
  },
  {
    id: "istanbul",
    label: "Istanbul",
    lat: 41.0082,
    lng: 28.9784,
    hint: "Turquie · À cheval sur deux continents",
    theme: "Europe",
    initialZoom: 4,
    initialCenter: [50, 10],
  },
  {
    id: "moscou",
    label: "Moscou",
    lat: 55.7558,
    lng: 37.6173,
    hint: "Russie · Place Rouge",
    theme: "Europe",
    initialZoom: 4,
    initialCenter: [50, 10],
  },

  // ─── Monde (zoom 2 — même réglage que les existantes) ───
  {
    id: "le-caire",
    label: "Le Caire",
    lat: 30.0444,
    lng: 31.2357,
    hint: "Égypte · Pyramides de Gizeh",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "marrakech",
    label: "Marrakech",
    lat: 31.6295,
    lng: -7.9811,
    hint: "Maroc · Place Jemaa el-Fna",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "dakar",
    label: "Dakar",
    lat: 14.6928,
    lng: -17.4467,
    hint: "Sénégal · Pointe ouest de l'Afrique",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "dubai",
    label: "Dubaï",
    lat: 25.2048,
    lng: 55.2708,
    hint: "Émirats · Burj Khalifa",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "pekin",
    label: "Pékin",
    lat: 39.9042,
    lng: 116.4074,
    hint: "Chine · Cité interdite",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "sydney",
    label: "Sydney",
    lat: -33.8688,
    lng: 151.2093,
    hint: "Australie · Opéra en forme de voiles",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "montreal",
    label: "Montréal",
    lat: 45.5017,
    lng: -73.5673,
    hint: "Canada · Ville francophone d'Amérique",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "mexico",
    label: "Mexico",
    lat: 19.4326,
    lng: -99.1332,
    hint: "Mexique · Une des plus grandes villes du monde",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "buenos-aires",
    label: "Buenos Aires",
    lat: -34.6037,
    lng: -58.3816,
    hint: "Argentine · Patrie du tango",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
  {
    id: "bangkok",
    label: "Bangkok",
    lat: 13.7563,
    lng: 100.5018,
    hint: "Thaïlande · Temples dorés",
    theme: "Monde",
    initialZoom: 2,
    initialCenter: [30, 30],
  },
];

/** Durée d'un round en secondes. */
export const GEO_ROUND_DURATION_SEC = 25;
/** Durée du reveal avant question suivante — 20s pour bien voir distance + hint + classement. */
export const GEO_REVEAL_DURATION_SEC = 20;
/** Nombre de rounds par partie. */
export const GEO_TOTAL_ROUNDS = 7;

/**
 * Calcule la distance en km entre 2 points (lat/lng) avec Haversine.
 * Précision : ~0.5% sur courtes distances.
 *
 * @returns distance en km arrondie à 1 décimale
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // rayon Terre en km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Points selon la distance. Tarif équilibré : la précision compte beaucoup
 * pour les villes proches (10km) mais reste indulgent sur les grands cas.
 */
export function geoPointsForDistance(distanceKm: number): number {
  if (distanceKm <= 5) return 100;     // pile dessus
  if (distanceKm <= 25) return 80;
  if (distanceKm <= 100) return 60;
  if (distanceKm <= 300) return 40;
  if (distanceKm <= 700) return 25;
  if (distanceKm <= 1500) return 15;
  return 5;
}

/** État Géo' stocké dans sessions.current_state. */
export interface GeoState {
  phase: "round" | "reveal" | "final";
  round: number;
  totalRounds: number;
  /** ID de la cible courante (référence GEO_TARGETS). */
  targetId: string;
  roundStartedAt?: string;
  roundDurationSec?: number;
  revealStartedAt?: string;
  revealDurationSec?: number;
  /** Cibles déjà jouées (anti-doublon). Conservé pour rétro-compat / debug. */
  playedTargetIds?: string[];
  /**
   * Séquence pré-shufflée des cibles pour la partie entière.
   * Ajouté 11/06/2026 pour garantir mathématiquement aucune ville doublon
   * sur la durée de la partie (bug remonté Moxy : mêmes villes 2× de suite).
   */
  shuffledTargetIds?: string[];
}
