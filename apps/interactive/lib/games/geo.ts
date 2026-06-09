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
];

/** Durée d'un round en secondes. */
export const GEO_ROUND_DURATION_SEC = 25;
/** Durée du reveal avant question suivante — 15s pour bien voir la distance + le classement. */
export const GEO_REVEAL_DURATION_SEC = 15;
/** Nombre de rounds par partie. */
export const GEO_TOTAL_ROUNDS = 5;

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
  /** Cibles déjà jouées (anti-doublon). */
  playedTargetIds?: string[];
}
