/**
 * SERVICE DROITS (07/11/2026) : ce qu'un rôle a le droit d'AFFICHER.
 *
 * Fonctions PURES (pas d'accès Supabase) : testables unitairement
 * (voir droits.test.ts). Elles ne servent qu'à l'affichage (masquer les
 * formulaires et boutons d'écriture) : la vraie barrière reste la base,
 * dont les règles d'accès refusent toute écriture au lecteur (sql/09).
 */
import type { RoleEntite } from "@/lib/repositories/membres";

/** Vrai pour le propriétaire et le trésorier ; faux pour le lecteur ou un rôle inconnu. */
export function peutEcrireRole(role: RoleEntite | null | undefined): boolean {
  return role === "proprietaire" || role === "tresorier";
}

/** Vrai seulement pour le propriétaire (gestion des membres). */
export function estProprietaireRole(role: RoleEntite | null | undefined): boolean {
  return role === "proprietaire";
}

/** Message affiché à la place d'un formulaire de pure saisie. */
export const MESSAGE_LECTURE_SEULE = "Lecture seule : tu ne peux pas modifier cette structure.";
