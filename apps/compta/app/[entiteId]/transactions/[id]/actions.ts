/**
 * Server actions des JUSTIFICATIFS d'une transaction.
 *
 * Le fichier est uploadé côté NAVIGATEUR (la RLS Storage cloisonne déjà). Ces
 * actions font le reste côté serveur, en autorité :
 *  - enregistrer : revalider type/taille + vérifier que le chemin appartient
 *    bien à l'entité, puis insérer les métadonnées ;
 *  - urlSignee : générer une URL de lecture à durée COURTE (bucket privé) ;
 *  - supprimer : retirer le fichier de Storage PUIS sa ligne de métadonnées.
 *
 * Toutes reposent sur le client serveur porteur de la session : la RLS Storage
 * et la RLS table s'appliquent, aucune clé service_role n'est utilisée.
 */
"use server";

import { revalidatePath } from "next/cache";
import {
  creerJustificatif,
  getJustificatif,
  supprimerJustificatif,
} from "@/lib/repositories/justificatifs";
import { validerFichier } from "@/lib/services/justificatifs";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "justificatifs";

interface ResultatAction {
  success: boolean;
  error?: string;
}

/**
 * Enregistre les métadonnées d'un fichier DÉJÀ uploadé dans Storage.
 * Garde-fous serveur : type/taille revalidés, et le chemin DOIT commencer par
 * `{entiteId}/{transactionId}/` (un client malveillant ne peut pas rattacher
 * un fichier d'une autre entité/transaction).
 */
export async function enregistrerJustificatifAction(
  entiteId: string,
  transactionId: string,
  meta: { chemin: string; nom: string; type: string; taille: number },
): Promise<ResultatAction> {
  const validation = validerFichier({ type: meta.type, taille: meta.taille });
  if (!validation.ok) {
    return { success: false, error: validation.erreurs[0] };
  }

  const prefixeAttendu = `${entiteId}/${transactionId}/`;
  if (!meta.chemin.startsWith(prefixeAttendu)) {
    return { success: false, error: "Chemin de fichier incohérent." };
  }

  try {
    const supabase = await createClient();
    await creerJustificatif(supabase, {
      transaction_id: transactionId,
      chemin_stockage: meta.chemin,
      nom_fichier: meta.nom,
      type_mime: meta.type,
      taille_octets: meta.taille,
    });
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath(`/${entiteId}/transactions/${transactionId}`);
  return { success: true };
}

/** Génère une URL signée (60 s) pour consulter un justificatif privé. */
export async function urlSigneeJustificatifAction(
  id: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const justificatif = await getJustificatif(supabase, id);
    if (!justificatif) return { error: "Justificatif introuvable." };

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(justificatif.chemin_stockage, 60);

    if (error || !data) return { error: "Lien de consultation indisponible." };
    return { url: data.signedUrl };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Supprime le fichier (Storage) puis ses métadonnées (table). */
export async function supprimerJustificatifAction(
  entiteId: string,
  transactionId: string,
  id: string,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const justificatif = await getJustificatif(supabase, id);
    if (!justificatif) return { success: false, error: "Justificatif introuvable." };

    // 1. Storage d'abord : si ça échoue, la métadonnée reste (on peut réessayer).
    const { error: erreurStorage } = await supabase.storage
      .from(BUCKET)
      .remove([justificatif.chemin_stockage]);
    if (erreurStorage) {
      return { success: false, error: "Suppression du fichier impossible." };
    }

    // 2. Puis la ligne de métadonnées.
    await supprimerJustificatif(supabase, id);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath(`/${entiteId}/transactions/${transactionId}`);
  return { success: true };
}
