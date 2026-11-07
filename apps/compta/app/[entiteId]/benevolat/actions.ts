/**
 * Server actions — Contributions volontaires en nature (07/11/2026).
 *
 * La reprise depuis vea.velito.fr lit les présences « aider » et les
 * événements du schéma vea (même projet Supabase). La RLS de vea ne les montre
 * qu'à un éditeur de VEA : un autre compte ne lit rien. On ne récupère que le
 * slug d'événement, l'identifiant technique du participant (pour compter les
 * personnes distinctes) et les heures ; aucun nom ne quitte vea.
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEntite } from "@/lib/repositories/entites";
import {
  changerStatutContribution,
  creerContributions,
  getContribution,
  supprimerContribution,
} from "@/lib/repositories/subventions";
import {
  changementStatutRefuse,
  contributionsDepuisVea,
  preparerContribution,
  type EvenementVea,
  type PresenceAide,
  type SaisieContribution,
} from "@/lib/services/benevolat";
import { eurosVersCentimes } from "@/lib/services/montants";
import type { StatutContribution } from "@/types/database";

interface ResultatAction {
  success: boolean;
  error?: string;
  message?: string;
}

function rafraichir(entiteId: string) {
  revalidatePath(`/${entiteId}/benevolat`);
}

export async function ajouterContributionAction(
  entiteId: string,
  saisie: Omit<SaisieContribution, "entiteId">,
): Promise<ResultatAction> {
  const prepare = preparerContribution({ ...saisie, entiteId });
  if (!prepare.ok) return { success: false, error: prepare.erreurs[0] };
  try {
    const supabase = await createClient();
    await creerContributions(supabase, [prepare.valeur]);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function changerStatutContributionAction(
  entiteId: string,
  id: string,
  statut: StatutContribution,
): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const fiche = await getContribution(supabase, id);
    if (!fiche || fiche.entite_id !== entiteId) return { success: false, error: "Fiche introuvable." };
    const refus = changementStatutRefuse(fiche, statut);
    if (refus) return { success: false, error: refus };
    await changerStatutContribution(supabase, id, statut);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function supprimerContributionAction(entiteId: string, id: string): Promise<ResultatAction> {
  try {
    const supabase = await createClient();
    const fiche = await getContribution(supabase, id);
    if (!fiche || fiche.entite_id !== entiteId) return { success: false, error: "Fiche introuvable." };
    await supprimerContribution(supabase, id);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  rafraichir(entiteId);
  return { success: true };
}

export async function reprendreHeuresVeaAction(
  entiteId: string,
  exercice: string,
  tauxHoraire: string,
): Promise<ResultatAction> {
  const annee = Number(exercice);
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) return { success: false, error: "Exercice invalide." };
  const taux = eurosVersCentimes(tauxHoraire);
  if (taux === null || taux <= 0) {
    return { success: false, error: "Indique le taux horaire retenu par l'association (en euros), il n'y a pas de valeur par défaut." };
  }
  try {
    const supabase = await createClient();
    const entite = await getEntite(supabase, entiteId);
    if (!entite) return { success: false, error: "Structure introuvable." };
    if (entite.type_juridique !== "association") {
      return { success: false, error: "La reprise des heures de vea.velito.fr ne concerne que l'association." };
    }

    // Événements de l'exercice d'abord, puis seulement leurs présences « aider ».
    const evts = await supabase
      .schema("vea")
      .from("evenements")
      .select("event_slug, nom, date")
      .gte("date", `${annee}-01-01`)
      .lte("date", `${annee}-12-31`);
    const slugs = (evts.data ?? []).map((e) => e.event_slug as string);
    const pres = slugs.length
      ? await supabase
          .schema("vea")
          .from("presences")
          .select("event_slug, participant_id, heures_aide")
          .eq("motif", "aider")
          .gt("heures_aide", 0)
          .in("event_slug", slugs)
      : { data: [], error: null };
    if (evts.error || pres.error) {
      return { success: false, error: "Lecture des présences de vea.velito.fr impossible avec ce compte." };
    }
    const fiches = contributionsDepuisVea(
      (pres.data ?? []) as PresenceAide[],
      (evts.data ?? []) as EvenementVea[],
      { entiteId, exercice: annee, tauxHoraireCentimes: taux },
    );
    if (fiches.length === 0) {
      return {
        success: true,
        message: `Aucune heure d'aide pointée en ${annee} sur vea.velito.fr (ou ce compte n'a pas accès aux présences).`,
      };
    }
    const ajoutees = await creerContributions(supabase, fiches);
    rafraichir(entiteId);
    return {
      success: true,
      message: `${ajoutees} événement(s) ajouté(s) en « À vérifier »${fiches.length - ajoutees > 0 ? `, ${fiches.length - ajoutees} déjà repris` : ""}.`,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
