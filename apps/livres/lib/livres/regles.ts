/**
 * Règles des boîtes à livres (13/11/2026). Module PUR : aucune base, aucune
 * horloge implicite (la date « maintenant » est toujours passée en
 * paramètre). Testé par regles.test.ts.
 *
 * Les pages et les actions serveur appellent ces fonctions ; la base ne
 * fait que stocker. Une seule source pour chaque règle.
 */

export type EtatBoite = "bon" | "a_remplir" | "abimee" | "inconnu";
export type TypeSignalement = "depot" | "prise" | "vide" | "abimee";

export const ETATS: EtatBoite[] = ["bon", "a_remplir", "abimee", "inconnu"];
export const TYPES_SIGNALEMENT: TypeSignalement[] = ["depot", "prise", "vide", "abimee"];

export const LIBELLE_ETAT: Record<EtatBoite, string> = {
  bon: "Bien remplie",
  a_remplir: "À remplir",
  abimee: "Abîmée",
  inconnu: "État inconnu",
};

/** Ce que voit l'habitant sur les boutons de la fiche. */
export const LIBELLE_SIGNALEMENT: Record<TypeSignalement, string> = {
  depot: "J'ai déposé un livre",
  prise: "J'ai pris un livre",
  vide: "Elle est vide",
  abimee: "Elle est abîmée",
};

export function estTypeSignalement(v: unknown): v is TypeSignalement {
  return typeof v === "string" && (TYPES_SIGNALEMENT as string[]).includes(v);
}
export function estEtat(v: unknown): v is EtatBoite {
  return typeof v === "string" && (ETATS as string[]).includes(v);
}

/**
 * Nouvel état d'une boîte après un signalement d'habitant.
 *  - « abîmée » l'emporte sur tout : seul un bénévole la remet en état
 *    (depuis l'administration), un dépôt de livre ne répare pas une porte.
 *  - « vide » la passe à remplir ; un dépôt la repasse en bon état.
 *  - « j'ai pris un livre » ne change rien : une prise ne vide pas une boîte.
 */
export function etatApresSignalement(actuel: EtatBoite, type: TypeSignalement): EtatBoite {
  if (actuel === "abimee" || type === "abimee") return "abimee";
  if (type === "vide") return "a_remplir";
  if (type === "depot") return "bon";
  return actuel;
}

/** Message facultatif : 300 caractères, sans caractères de contrôle. Vide → null. */
export const MESSAGE_MAX = 300;
export function nettoyerMessage(saisie: string | null | undefined): string | null {
  const t = (saisie ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, MESSAGE_MAX);
  return t.length > 0 ? t : null;
}

/** Slug d'URL lisible : « Parc Saint-Pierre » → « parc-saint-pierre ». */
export function slugifier(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Distance à vol d'oiseau en mètres (formule de haversine). */
export function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formaterDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

/** « aujourd'hui », « hier », « il y a 5 jours », « il y a 3 mois ». */
export function depuis(iso: string | null, maintenant: Date): string {
  if (!iso) return "jamais";
  const jours = Math.floor((maintenant.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 31) return `il y a ${jours} jours`;
  const mois = Math.floor(jours / 30);
  return mois < 12 ? `il y a ${mois} mois` : "il y a plus d'un an";
}

/** Coordonnées dans la zone d'Amiens et alentours (garde-fou de saisie admin). */
export function coordonneesPlausibles(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat > 49.7 && lat < 50.1 && lng > 2.0 && lng < 2.6;
}

/**
 * Limite d'abus sans rien stocker sur la personne (pas d'adresse IP, promesse
 * « zéro donnée » du cahier des charges) : au plus N signalements par boîte et
 * par heure. Au-delà, on remercie sans enregistrer.
 */
export const SIGNALEMENTS_MAX_PAR_HEURE = 20;
export function signalementAccepte(nbDerniereHeure: number): boolean {
  return nbDerniereHeure < SIGNALEMENTS_MAX_PAR_HEURE;
}
