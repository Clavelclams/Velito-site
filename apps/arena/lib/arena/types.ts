/**
 * Types des tables ARENA (miroir de sql/001_arena_schema_v1.sql, schéma `arena.`)
 * + types du modèle de droits partagé (shared.organizations / user_permissions).
 * En V2 on pourra les générer automatiquement (supabase gen types).
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

/** Scope hiérarchique de shared.user_permissions (owner > editor > viewer). */
export type ScopePartage = "owner" | "editor" | "viewer";

/** Ligne de shared.organizations (colonnes utilisées par arena). */
export interface Organisation {
  id: string;
  slug: string;
  name: string;
}

/** Organisation + le rôle que l'utilisateur courant y détient. */
export interface OrganisationAvecRole extends Organisation {
  scope: ScopePartage;
}

export interface Joueur {
  id: string;
  user_id: string | null;
  pseudo: string;
  annee_naissance: number | null;
  est_mineur: boolean;
  profil_public: boolean;
  anonymise: boolean;
}

export type FormatTournoi =
  | "ELIMINATION_SIMPLE"
  | "DOUBLE_ELIMINATION"
  | "POULES_FINALE";

export interface Tournoi {
  id: string;
  organisation_id: string;
  titre: string;
  jeu: string;
  format: FormatTournoi;
  statut: StatutTournoi;
  date_debut: string;
  lieu: string | null;
  description: string | null;
  max_joueurs: number | null;
  qr_token: string;
  created_at: string;
  /** Config POULES_FINALE (null pour les autres formats). */
  nb_poules?: number | null;
  nb_qualifies_par_poule?: number | null;
  phase_finale_generee?: boolean;
  /** Verticale : esport ou sport physique (migration 004). */
  discipline?: Discipline;
  /** 1 = individuel, 2 = padel en double, 5 = five… (migration 004). */
  taille_equipe?: number;
}

/** Les deux verticales d'ARENA. */
export type Discipline = "ESPORT" | "SPORT";

/**
 * Équipe ÉPHÉMÈRE : elle n'existe que dans le cadre d'un tournoi.
 * Décision actée le 12/08/2026 — au padel comme au five, les paires se
 * recomposent à chaque session ; un roster persistant serait de la
 * sur-ingénierie pour l'échelle visée.
 */
export interface Equipe {
  id: string;
  tournoi_id: string;
  nom: string;
  created_at?: string;
  membres?: EquipeMembre[]; // jointure
}

export interface EquipeMembre {
  tournoi_id: string;
  equipe_id: string;
  joueur_id: string;
  joueur?: Joueur; // jointure
}

/**
 * Note ELO d'un joueur, par discipline. JAMAIS exposée publiquement :
 * la table est serveur-seule (RLS sans policy), l'ELO ne sert qu'à équilibrer
 * les poules et les têtes de série côté staff.
 */
export interface EloJoueur {
  joueur_id: string;
  discipline: Discipline;
  note: number;
  nb_matchs: number;
}

export interface Participation {
  id: string;
  tournoi_id: string;
  joueur_id: string;
  check_in: boolean;
  check_in_at: string | null;
  /** Ordre de placement manuel (migration 005). null = ordre d'arrivée. */
  ordre?: number | null;
  joueur?: Joueur; // jointure
}

export interface MatchRow {
  id: string;
  tournoi_id: string;
  /** W = tableau principal, L = rattrapage, GF = grande finale, P = poules.
   *  Absent (undefined) sur les lignes d'avant la migration 002 = 'W'. */
  bracket?: "W" | "L" | "GF" | "P";
  /** Numéro de poule (1..G) pour bracket = 'P', null sinon. */
  poule?: number | null;
  /** Pour une poule, `round` est le numéro de JOURNÉE. */
  round: number;
  position: number;
  joueur1_id: string | null;
  joueur2_id: string | null;
  score_j1: number | null;
  score_j2: number | null;
  is_bye: boolean;
  gagnant_id: string | null;
  statut: StatutMatch;
  /**
   * Camps par ÉQUIPE (migration 004, module sport). Un match a soit des
   * joueurs, soit des équipes, jamais les deux — la contrainte
   * `matchs_camps_homogenes` l'impose en base.
   */
  equipe1_id?: string | null;
  equipe2_id?: string | null;
  equipe_gagnante_id?: string | null;
}
