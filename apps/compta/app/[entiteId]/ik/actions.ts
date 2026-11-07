/**
 * Server actions — Indemnités kilométriques (07/11/2026).
 *
 * Service ik (calcul, contrôles) → repository → RLS et triggers de sql/12.
 * Un doublon possible est SIGNALÉ dans la réponse, jamais bloquant. Le taux
 * vient toujours de la saisie : aucune valeur par défaut côté serveur.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listerCategories } from "@/lib/repositories/categories";
import {
  creerLignes,
  creerTrajet,
  getNote,
  getTrajet,
  listerLignesEntite,
  listerNotes,
  listerTrajets,
  modifierTrajet,
  supprimerLigne,
  supprimerTrajet,
} from "@/lib/repositories/notes-de-frais";
import { preparerTrajet, ressembleA, type SaisieTrajet } from "@/lib/services/ik";
import { categorieDeplacement, estModifiable, ligneDepuisTrajet } from "@/lib/services/notes-de-frais";

interface ResultatAction {
  success: boolean;
  error?: string;
  /** Avertissement non bloquant (doublon possible). */
  avertissement?: string;
}

function rafraichir(entiteId: string) {
  revalidatePath(`/${entiteId}/ik`);
  revalidatePath(`/${entiteId}/notes-de-frais`, "layout");
}

export async function enregistrerTrajetAction(
  entiteId: string,
  trajetId: string | null,
  saisie: Omit<SaisieTrajet, "entiteId">,
): Promise<ResultatAction> {
  const prepare = preparerTrajet({ ...saisie, entiteId });
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  let avertissement: string | undefined;
  try {
    const supabase = await createClient();
    if (trajetId) {
      const existant = await getTrajet(supabase, trajetId);
      if (!existant || existant.entite_id !== entiteId) return { success: false, error: "Trajet introuvable." };
      const { entite_id: _e, ...champs } = prepare.valeur;
      void _e;
      await modifierTrajet(supabase, trajetId, champs);
    } else {
      await creerTrajet(supabase, prepare.valeur);
    }
    const semblables = ressembleA(prepare.valeur, await listerTrajets(supabase, entiteId), trajetId ?? undefined);
    // Le trajet qu'on vient de créer est dans la liste : on cherche un AUTRE.
    if (semblables.length > (trajetId ? 0 : 1)) {
      avertissement = "Doublon possible : un trajet de cette personne existe déjà ce jour-là avec le même départ et la même arrivée. Vérifie qu'il ne s'agit pas du même.";
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true, avertissement };
}

/** Supprime un trajet ; s'il est rattaché à une note en cours, sa ligne part d'abord. */
export async function supprimerTrajetAction(entiteId: string, trajetId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const trajet = await getTrajet(supabase, trajetId);
    if (!trajet || trajet.entite_id !== entiteId) return { success: false, error: "Trajet introuvable." };
    await detacher(supabase, entiteId, trajetId);
    await supprimerTrajet(supabase, trajetId);
  } catch (e) {
    const message = (e as Error).message;
    // FK de sql/12 : une ligne d'une note refusée pointe encore ce trajet.
    if (message.includes("ligne_trajet_meme_entite")) {
      return { success: false, error: "Ce trajet figure dans une note refusée : il reste pour l'historique." };
    }
    return { success: false, error: message };
  }
  rafraichir(entiteId);
  return { success: true };
}

/** Rattache un trajet à une note : il en devient une ligne IK (catégorie « Frais de déplacement » si elle existe). */
export async function rattacherTrajetAction(entiteId: string, trajetId: string, noteId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const [trajet, note] = await Promise.all([getTrajet(supabase, trajetId), getNote(supabase, noteId)]);
    if (!trajet || trajet.entite_id !== entiteId) return { success: false, error: "Trajet introuvable." };
    if (!note || note.entite_id !== entiteId) return { success: false, error: "Note introuvable." };
    if (!estModifiable(note)) return { success: false, error: "Cette note ne se modifie plus." };
    const categorieId = categorieDeplacement(await listerCategories(supabase, entiteId));
    const prepare = ligneDepuisTrajet(trajet, note, categorieId);
    if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
    await creerLignes(supabase, [prepare.valeur]);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function detacherTrajetAction(entiteId: string, trajetId: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const trajet = await getTrajet(supabase, trajetId);
    if (!trajet || trajet.entite_id !== entiteId) return { success: false, error: "Trajet introuvable." };
    await detacher(supabase, entiteId, trajetId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

/**
 * Retire les lignes IK de ce trajet dans les notes en cours. Une note
 * validée ou réglée garde sa ligne : le trigger refuse, le message remonte.
 */
async function detacher(supabase: Awaited<ReturnType<typeof createClient>>, entiteId: string, trajetId: string) {
  const [lignes, notes] = await Promise.all([listerLignesEntite(supabase, entiteId), listerNotes(supabase, entiteId)]);
  const statuts = new Map(notes.map((n) => [n.id, n]));
  for (const l of lignes.filter((x) => x.trajet_id === trajetId)) {
    const n = statuts.get(l.note_id);
    if (n && n.statut === "refusee") continue; // historique d'une note refusée : laissé tel quel
    if (n && !estModifiable(n)) throw new Error(`Ce trajet figure dans la note ${n.numero}, qui ne se modifie plus.`);
    await supprimerLigne(supabase, l.id);
  }
}
