/**
 * REPOSITORY ENTITÉS — couche accès aux données.
 *
 * Toutes les requêtes vers la table `entite` vivent ICI et nulle part
 * ailleurs. Une page qui veut les entités appelle listerEntites(), elle
 * n'écrit jamais de .from("entite") elle-même.
 *
 * Deux points à défendre au jury :
 *
 * 1. Le client Supabase est reçu EN PARAMÈTRE (injection de dépendance)
 *    au lieu d'être créé ici. Le repository ne sait pas s'il est appelé
 *    depuis le serveur ou le navigateur — il fonctionne avec les deux
 *    clients, et un test peut lui passer un faux client.
 *
 * 2. AUCUN filtre "where proprietaire_id = moi" dans la requête. Ce n'est
 *    pas un oubli : c'est la Row Level Security qui filtre, côté Postgres
 *    (sql/02_rls_noyau.sql). Le `select *` le plus naïf du monde ne peut
 *    renvoyer QUE les entités de l'utilisateur connecté. Si ce code était
 *    bogué ou malveillant, la base ne donnerait rien de plus.
 *
 * Requêtes paramétrées : le client Supabase construit des requêtes
 * paramétrées par conception — aucune concaténation de chaîne SQL n'existe
 * dans cette application (parade injection SQL, CDC §7).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entite } from "@/types/database";

export async function listerEntites(supabase: SupabaseClient): Promise<Entite[]> {
  const { data, error } = await supabase
    .from("entite")
    .select("*")
    .order("nom", { ascending: true });

  if (error) {
    // On enrichit l'erreur avec le contexte métier avant de la propager :
    // la page décidera quoi afficher, le repository ne fait pas d'UI.
    throw new Error(`Chargement des entités impossible : ${error.message}`);
  }

  return (data ?? []) as Entite[];
}

/**
 * Récupère UNE entité par son id — support du routing /[entiteId]/…
 *
 * Renvoie null si l'entité n'existe pas OU ne m'appartient pas : du point de
 * vue de la RLS, les deux cas sont identiques (aucune ligne remontée). C'est
 * volontaire — on ne révèle jamais qu'un id "existe mais chez un autre".
 * La page appelante traduira ce null en notFound() (404).
 *
 * .maybeSingle() : renvoie l'unique ligne OU null, sans lever d'erreur quand
 * il n'y en a aucune (contrairement à .single() qui exigerait exactement
 * 1 ligne et jetterait). Ici "0 ligne" est un cas métier normal.
 */
export async function getEntite(
  supabase: SupabaseClient,
  entiteId: string,
): Promise<Entite | null> {
  const { data, error } = await supabase
    .from("entite")
    .select("*")
    .eq("id", entiteId)
    .maybeSingle();

  if (error) {
    throw new Error(`Chargement de l'entité impossible : ${error.message}`);
  }

  return (data as Entite | null) ?? null;
}
