/**
 * REPOSITORY SUBVENTIONS ET CONTRIBUTIONS (07/11/2026) — accès aux données.
 * Tables subvention et contribution_nature (sql/08), colonne
 * transaction.subvention_id. Client injecté, requêtes paramétrées ; la RLS
 * cloisonne par entité, le service a déjà validé.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContributionNature,
  NouvelleContribution,
  NouvelleSubvention,
  StatutContribution,
  Subvention,
} from "@/types/database";

export async function listerSubventions(supabase: SupabaseClient, entiteId: string): Promise<Subvention[]> {
  const { data, error } = await supabase
    .from("subvention")
    .select("*")
    .eq("entite_id", entiteId)
    .order("exercice", { ascending: false })
    .order("financeur");
  if (error) throw new Error(`Chargement des subventions impossible : ${error.message}`);
  return (data ?? []) as Subvention[];
}

export async function getSubvention(supabase: SupabaseClient, id: string): Promise<Subvention | null> {
  const { data, error } = await supabase.from("subvention").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement du dossier impossible : ${error.message}`);
  return (data as Subvention | null) ?? null;
}

export async function creerSubvention(supabase: SupabaseClient, s: NouvelleSubvention): Promise<Subvention> {
  const { data, error } = await supabase.from("subvention").insert(s).select().single();
  if (error) throw new Error(`Création du dossier impossible : ${error.message}`);
  return data as Subvention;
}

export async function modifierSubvention(
  supabase: SupabaseClient,
  id: string,
  s: Omit<NouvelleSubvention, "entite_id">,
): Promise<void> {
  const { error } = await supabase.from("subvention").update(s).eq("id", id);
  if (error) throw new Error(`Modification du dossier impossible : ${error.message}`);
}

export async function supprimerSubvention(supabase: SupabaseClient, id: string): Promise<void> {
  // Les opérations liées restent : seule leur colonne subvention_id repasse à NULL (sql/08).
  const { error } = await supabase.from("subvention").delete().eq("id", id);
  if (error) throw new Error(`Suppression du dossier impossible : ${error.message}`);
}

/** Lie (ou délie avec null) des opérations à un dossier. La FK composite refuse une autre entité. */
export async function lierOperations(
  supabase: SupabaseClient,
  entiteId: string,
  transactionIds: string[],
  subventionId: string | null,
): Promise<void> {
  if (transactionIds.length === 0) return;
  const { error } = await supabase
    .from("transaction")
    .update({ subvention_id: subventionId })
    .eq("entite_id", entiteId)
    .in("id", transactionIds);
  if (error) throw new Error(`Rattachement impossible : ${error.message}`);
}

export async function listerContributions(supabase: SupabaseClient, entiteId: string): Promise<ContributionNature[]> {
  const { data, error } = await supabase
    .from("contribution_nature")
    .select("*")
    .eq("entite_id", entiteId)
    .order("date_contribution", { ascending: false });
  if (error) throw new Error(`Chargement des contributions impossible : ${error.message}`);
  return (data ?? []) as ContributionNature[];
}

export async function getContribution(supabase: SupabaseClient, id: string): Promise<ContributionNature | null> {
  const { data, error } = await supabase.from("contribution_nature").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Chargement de la fiche impossible : ${error.message}`);
  return (data as ContributionNature | null) ?? null;
}

/** Insertion en lot ; une fiche dont la clé source existe déjà est ignorée (reprise relançable). */
export async function creerContributions(
  supabase: SupabaseClient,
  fiches: NouvelleContribution[],
): Promise<number> {
  if (fiches.length === 0) return 0;
  const { data, error } = await supabase
    .from("contribution_nature")
    .upsert(fiches, { onConflict: "entite_id,source_cle", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
  return (data ?? []).length;
}

export async function changerStatutContribution(
  supabase: SupabaseClient,
  id: string,
  statut: StatutContribution,
): Promise<void> {
  const { error } = await supabase.from("contribution_nature").update({ statut }).eq("id", id);
  if (error) throw new Error(`Changement de statut impossible : ${error.message}`);
}

export async function supprimerContribution(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("contribution_nature").delete().eq("id", id);
  if (error) throw new Error(`Suppression impossible : ${error.message}`);
}
