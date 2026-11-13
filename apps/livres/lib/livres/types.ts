/** Types partagés des boîtes à livres (13/11/2026). */
import type { EtatBoite, TypeSignalement } from "./regles";

export interface BoitePublique {
  id: string;
  slug: string;
  nom: string;
  adresse: string | null;
  quartier: string | null;
  description: string | null;
  lat: number;
  lng: number;
  photo_url: string | null;
  etat: EtatBoite;
  etat_maj_le: string | null;
  depots_total: number;
  referent: string | null;
}

export interface Boite extends BoitePublique {
  origine: "existante" | "velito" | "ville" | "budget_participatif";
  active: boolean;
  created_at: string;
}

export interface Signalement {
  id: string;
  boite_id: string;
  type: TypeSignalement;
  message: string | null;
  created_at: string;
  traite_le: string | null;
}

/** Colonnes lues par les pages publiques : jamais plus que nécessaire. */
export const COLONNES_PUBLIQUES =
  "id, slug, nom, adresse, quartier, description, lat, lng, photo_url, etat, etat_maj_le, depots_total, referent";
