/**
 * actions.ts — Server Action pour /prestations
 *
 * submitDemandeDevisAction : valide les champs côté serveur (defense en
 * profondeur) puis INSERT dans vea.demandes_prestation. Le trigger SQL
 * AFTER INSERT crée automatiquement une notif cloche aux dirigeants.
 *
 * Accès : public (anon authorized via RLS). Pas de hasPermission requis ici.
 *
 * TODO V2 : envoyer email de confirmation au demandeur + email d'alerte
 * à velitoesport@gmail.com via Resend dès que la clé API est configurée.
 */
"use server";

import { createClient } from "@/lib/supabase/server";

export interface DemandeDevisInput {
  structure_nom: string;
  structure_type: string;
  referent_prenom: string;
  referent_nom: string;
  referent_fonction: string;
  email: string;
  telephone: string;
  prestations_demandees: string[];
  prestations_autre_precision: string;
  pack_envisage: string;
  date_souhaitee: string;
  lieu_ville: string;
  lieu_structure: string;
  public_tranche_age: string[];
  nombre_participants: number;
  duree_heures: number;
  budget_envisage: string;
  source_decouverte: string;
  precisions: string;
  rgpd_consent: boolean;
}

interface ActionResult {
  success: boolean;
  error?: string;
  demandeId?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitDemandeDevisAction(
  input: DemandeDevisInput
): Promise<ActionResult> {
  // === Validation côté serveur (défense en profondeur) ===
  if (!input.rgpd_consent) {
    return { success: false, error: "Consentement RGPD requis." };
  }
  if (!input.structure_nom?.trim()) {
    return { success: false, error: "Nom de la structure requis." };
  }
  if (!input.structure_type?.trim()) {
    return { success: false, error: "Type de structure requis." };
  }
  if (!input.referent_prenom?.trim() || !input.referent_nom?.trim()) {
    return { success: false, error: "Prénom et nom du référent requis." };
  }
  if (!input.email?.trim() || !EMAIL_RE.test(input.email)) {
    return { success: false, error: "Email invalide." };
  }
  if (!input.telephone?.trim()) {
    return { success: false, error: "Téléphone requis." };
  }
  if (!Array.isArray(input.prestations_demandees) || input.prestations_demandees.length === 0) {
    return { success: false, error: "Sélectionne au moins un type de prestation." };
  }
  if (!input.pack_envisage?.trim()) {
    return { success: false, error: "Choisis un pack." };
  }
  if (!input.date_souhaitee?.trim()) {
    return { success: false, error: "Date souhaitée requise." };
  }
  if (!input.lieu_ville?.trim()) {
    return { success: false, error: "Ville requise." };
  }
  if (!input.nombre_participants || input.nombre_participants <= 0) {
    return { success: false, error: "Nombre de participants invalide." };
  }
  if (!input.duree_heures || input.duree_heures <= 0) {
    return { success: false, error: "Durée invalide." };
  }

  // === INSERT ===
  const supabase = await createClient();

  const { data, error } = await supabase
    .schema("vea")
    .from("demandes_prestation")
    .insert({
      structure_nom: input.structure_nom.trim().slice(0, 200),
      structure_type: input.structure_type,
      referent_prenom: input.referent_prenom.trim().slice(0, 100),
      referent_nom: input.referent_nom.trim().slice(0, 100),
      referent_fonction: input.referent_fonction?.trim().slice(0, 100) || null,
      email: input.email.trim().toLowerCase().slice(0, 200),
      telephone: input.telephone.trim().slice(0, 30),
      prestations_demandees: input.prestations_demandees,
      prestations_autre_precision:
        input.prestations_autre_precision?.trim().slice(0, 500) || null,
      pack_envisage: input.pack_envisage,
      date_souhaitee: input.date_souhaitee,
      lieu_ville: input.lieu_ville.trim().slice(0, 100),
      lieu_structure: input.lieu_structure?.trim().slice(0, 200) || null,
      public_tranche_age:
        input.public_tranche_age && input.public_tranche_age.length > 0
          ? input.public_tranche_age
          : null,
      nombre_participants: Math.floor(input.nombre_participants),
      duree_heures: Math.floor(input.duree_heures),
      budget_envisage: input.budget_envisage?.trim().slice(0, 200) || null,
      source_decouverte: input.source_decouverte?.trim() || null,
      precisions: input.precisions?.trim().slice(0, 2000) || null,
      rgpd_consent: input.rgpd_consent,
      statut: "nouveau",
    })
    .select("id")
    .single();

  if (error) {
    // Log côté serveur pour debug (ne pas exposer le détail au visiteur)
    console.error("[submitDemandeDevisAction] error:", error);
    return {
      success: false,
      error:
        "Impossible d'enregistrer ta demande. Réessaye dans quelques minutes ou écris-nous directement à contact@velito.fr.",
    };
  }

  // TODO V2 : envoyer email de confirmation au demandeur via Resend
  // try {
  //   await fetch("https://api.resend.com/emails", { ... });
  // } catch (e) { console.warn("[Resend] confirmation email failed", e); }

  // TODO V2 : envoyer email d'alerte à velitoesport@gmail.com via Resend
  // try {
  //   await fetch("https://api.resend.com/emails", { ... });
  // } catch (e) { console.warn("[Resend] alert email failed", e); }

  return { success: true, demandeId: data.id };
}
