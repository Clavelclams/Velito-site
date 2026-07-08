/**
 * Server actions de l'écran Catégories.
 *
 * Une server action orchestre les couches, elle ne contient pas la logique :
 *   1. valide/normalise via le SERVICE (preparerNouvelleCategorie…) ;
 *   2. écrit via le REPOSITORY (creerCategorie…) ;
 *   3. rafraîchit l'affichage (revalidatePath).
 * Tout s'exécute côté serveur : la logique et les messages détaillés ne
 * partent jamais dans le bundle navigateur.
 *
 * `entiteId` est passé explicitement (il vient de l'URL, contexte de la
 * page) et sert à la fois au DTO et au revalidatePath — jamais un champ que
 * l'utilisateur pourrait bricoler dans le formulaire.
 */
"use server";

import { revalidatePath } from "next/cache";
import {
  creerCategorie,
  renommerCategorie,
  definirActivite,
} from "@/lib/repositories/categories";
import {
  preparerNouvelleCategorie,
  preparerRenommage,
} from "@/lib/services/categories";
import { createClient } from "@/lib/supabase/server";

interface ResultatAction {
  success: boolean;
  error?: string;
}

export async function creerCategorieAction(
  entiteId: string,
  nom: string,
  type: string,
  compteId?: string | null,
): Promise<ResultatAction> {
  // 1. Validation métier (service). Si KO, on renvoie le 1er message : c'est
  //    suffisant pour un formulaire simple à deux champs.
  const prepare = preparerNouvelleCategorie({ entiteId, nom, type, compteId });
  if (!prepare.ok) {
    return { success: false, error: prepare.erreurs[0] };
  }

  try {
    // 2. Écriture (repository). La RLS vérifie en base que l'entité m'appartient.
    const supabase = await createClient();
    await creerCategorie(supabase, prepare.valeur);
  } catch (e) {
    // Le repository a déjà traduit l'unicité (23505) en message lisible.
    return { success: false, error: (e as Error).message };
  }

  // 3. Rafraîchit la liste affichée sans rechargement complet de page.
  revalidatePath(`/${entiteId}/categories`);
  return { success: true };
}

export async function renommerCategorieAction(
  entiteId: string,
  id: string,
  nom: string,
): Promise<ResultatAction> {
  const prepare = preparerRenommage(nom);
  if (!prepare.ok) {
    return { success: false, error: prepare.erreurs[0] };
  }

  try {
    const supabase = await createClient();
    await renommerCategorie(supabase, id, prepare.valeur.nom);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath(`/${entiteId}/categories`);
  return { success: true };
}

export async function basculerActiviteAction(
  entiteId: string,
  id: string,
  active: boolean,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    await definirActivite(supabase, id, active);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  revalidatePath(`/${entiteId}/categories`);
  return { success: true };
}
