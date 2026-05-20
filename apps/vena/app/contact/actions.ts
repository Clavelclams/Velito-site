/**
 * actions.ts — Server Action pour /contact VENA.
 *
 * submitContactAction : valide les champs côté serveur (défense en
 * profondeur) puis INSERT dans vena.demandes_contact.
 *
 * Public anon : la table a une policy RLS qui autorise INSERT avec rgpd_consent=true.
 *
 * TODO V2 : Resend pour confirmation au demandeur + alerte à clavelclams12@gmail.com.
 *           Sync Notion CRM VENA via MCP (cf vena-prospecting-agent skill).
 */
"use server";

import { createClient } from "@/lib/supabase/server";

export interface ContactInput {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  structure: string;
  fonction: string;
  service_demande: string;
  budget_envisage: string;
  delai: string;
  message: string;
  source_decouverte: string;
  rgpd_consent: boolean;
}

interface ActionResult {
  success: boolean;
  error?: string;
  demandeId?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContactAction(
  input: ContactInput
): Promise<ActionResult> {
  if (!input.rgpd_consent) {
    return { success: false, error: "Consentement RGPD requis." };
  }
  if (!input.prenom?.trim() || !input.nom?.trim()) {
    return { success: false, error: "Prénom et nom requis." };
  }
  if (!input.email?.trim() || !EMAIL_RE.test(input.email)) {
    return { success: false, error: "Email invalide." };
  }
  if (!input.service_demande?.trim()) {
    return { success: false, error: "Service requis." };
  }
  if (!input.message?.trim() || input.message.trim().length < 10) {
    return {
      success: false,
      error: "Message requis (au moins 10 caractères).",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .schema("vena")
    .from("demandes_contact")
    .insert({
      prenom: input.prenom.trim().slice(0, 100),
      nom: input.nom.trim().slice(0, 100),
      email: input.email.trim().toLowerCase().slice(0, 200),
      telephone: input.telephone?.trim().slice(0, 30) || null,
      structure: input.structure?.trim().slice(0, 200) || null,
      fonction: input.fonction?.trim().slice(0, 100) || null,
      service_demande: input.service_demande,
      budget_envisage: input.budget_envisage?.trim().slice(0, 200) || null,
      delai: input.delai?.trim().slice(0, 100) || null,
      message: input.message.trim().slice(0, 3000),
      source_decouverte: input.source_decouverte?.trim() || null,
      rgpd_consent: input.rgpd_consent,
      statut: "nouveau",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[submitContactAction] error:", error);
    return {
      success: false,
      error:
        "Impossible d'enregistrer ta demande. Réessaye dans quelques minutes ou écris-nous directement à contact@velito.fr.",
    };
  }

  // TODO V2 : Resend confirmation + alerte
  // TODO V2 : sync Notion CRM VENA

  return { success: true, demandeId: data.id };
}
