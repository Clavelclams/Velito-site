/**
 * REPOSITORY CATÉGORIES — couche accès aux données.
 *
 * Toutes les requêtes vers la table `categorie` vivent ICI. Mêmes principes
 * que le repository entités :
 *  - client Supabase injecté en paramètre (testable, serveur/navigateur) ;
 *  - AUCUN filtre de propriété en dur : la RLS (sql/02) cloisonne par entité
 *    via est_proprietaire_entite(entite_id). On filtre seulement sur ce qui
 *    est FONCTIONNEL (l'entité affichée, l'état actif), jamais sur la sécurité.
 *  - requêtes paramétrées par conception (supabase-js) : zéro concaténation SQL.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Categorie, NouvelleCategorie } from "@/types/database";

/**
 * Liste les catégories d'une entité.
 * @param seulementActives  true (défaut) pour les formulaires de saisie ;
 *   false pour l'écran de gestion, qui montre aussi les catégories archivées.
 *
 * Le filtre `entite_id` ici n'est PAS de la sécurité (la RLS s'en charge) :
 * c'est un filtre d'affichage — sans lui, on chargerait les catégories de
 * TOUTES mes entités mélangées. La sécurité et l'affichage sont deux besoins
 * distincts qui se trouvent porter sur la même colonne.
 */
export async function listerCategories(
  supabase: SupabaseClient,
  entiteId: string,
  seulementActives = true,
): Promise<Categorie[]> {
  let requete = supabase
    .from("categorie")
    .select("*")
    .eq("entite_id", entiteId)
    .order("type", { ascending: true })
    .order("nom", { ascending: true });

  if (seulementActives) {
    requete = requete.eq("active", true);
  }

  const { data, error } = await requete;

  if (error) {
    throw new Error(`Chargement des catégories impossible : ${error.message}`);
  }

  return (data ?? []) as Categorie[];
}

/**
 * Crée une catégorie. Reçoit un DTO DÉJÀ VALIDÉ par le service
 * (preparerNouvelleCategorie) : le repository ne re-valide pas la logique
 * métier, il exécute. Il traduit en revanche l'erreur d'unicité Postgres
 * (code 23505) en message métier lisible — c'est le seul cas d'erreur
 * "attendu" côté base qu'on veut présenter proprement.
 */
export async function getCategorie(
  supabase: SupabaseClient,
  id: string,
): Promise<Categorie | null> {
  const { data, error } = await supabase
    .from("categorie")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Chargement de la catégorie impossible : ${error.message}`);
  return (data as Categorie | null) ?? null;
}

export async function creerCategorie(
  supabase: SupabaseClient,
  nouvelle: NouvelleCategorie,
): Promise<Categorie> {
  const { data, error } = await supabase
    .from("categorie")
    .insert(nouvelle)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `Une catégorie « ${nouvelle.nom} » (${nouvelle.type}) existe déjà pour cette structure.`,
      );
    }
    throw new Error(`Création de la catégorie impossible : ${error.message}`);
  }

  return data as Categorie;
}

/**
 * Renomme une catégorie (le `type` n'est volontairement PAS modifiable —
 * voir le service : changer recette↔dépense fausserait l'historique).
 * On ne passe PAS entite_id : la RLS garantit qu'on ne peut renommer qu'une
 * catégorie de ses propres entités.
 */
export async function renommerCategorie(
  supabase: SupabaseClient,
  id: string,
  nom: string,
): Promise<Categorie> {
  const { data, error } = await supabase
    .from("categorie")
    .update({ nom })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`Une catégorie « ${nom} » existe déjà pour cette structure.`);
    }
    throw new Error(`Renommage impossible : ${error.message}`);
  }

  return data as Categorie;
}

/**
 * Active ou désactive une catégorie (archivage doux).
 * On ne SUPPRIME jamais une catégorie : les transactions déjà classées
 * dessous garderaient une référence cassée, et l'historique comptable serait
 * incohérent. Désactiver la retire des formulaires de saisie sans toucher au
 * passé. (Décision documentée dans le CDC de finalisation, Bloc 1.1.)
 */
export async function definirActivite(
  supabase: SupabaseClient,
  id: string,
  active: boolean,
): Promise<Categorie> {
  const { data, error } = await supabase
    .from("categorie")
    .update({ active })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Mise à jour de la catégorie impossible : ${error.message}`);
  }

  return data as Categorie;
}
