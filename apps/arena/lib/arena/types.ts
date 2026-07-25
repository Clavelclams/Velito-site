/**
 * Types des tables ARENA (miroir de sql/001_arena_schema_v1.sql).
 * En V2 on pourra les générer automatiquement (supabase gen types),
 * pour l'instant des interfaces manuelles suffisent et restent lisibles.
 */

export type StatutTournoi =
  | "BROUILLON"
  | "OUVERT"
  | "EN_COURS"
  | "TERMINE"
  | "ANNULE";

export type StatutMatch =
  | "A_JOUER"
  | "EN_COURS"
  | "TERMINE"
  | "LITIGIEUX"
  | "VALIDE";

export interface Organisation {
  id: string;
  nom: string;
  slug: string;
  logo_url: string | null;
}

export interface MembreOrga {
  id: string;
  organisation_id: string;
  user_id: string;
  role: "ADMIN" | "STAFF";
}

export interface Joueur {
  id: string;
  user_id: string | null;
  pseudo: string;
  age_confirme: boolean;
  anonymise: boolean;
}

export interface Tournoi {
  id: string;
  organisation_id: string;
  titre: string;
  jeu: string;
  format: "ELIMINATION_SIMPLE";
  statut: StatutTournoi;
  date_debut: string;
  lieu: string | null;
  description: string | null;
  max_joueurs: number | null;
  qr_token: string;
  created_at: string;
}

export interface Participation {
  id: string;
  tournoi_id: string;
  joueur_id: string;
  check_in: boolean;
  check_in_at: string | null;
  joueur?: Joueur; // jointure
}

export interface MatchRow {
  id: string;
  tournoi_id: string;
  round: number;
  position: number;
  joueur1_id: string | null;
  joueur2_id: string | null;
  score_j1: number | null;
  score_j2: number | null;
  is_bye: boolean;
  gagnant_id: string | null;
  statut: StatutMatch;
}
