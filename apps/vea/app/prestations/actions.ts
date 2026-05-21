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

// Échappe le HTML — le contenu vient du visiteur, on l'insère dans des emails.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

  const { error } = await supabase
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
    });

  if (error) {
    // Log côté serveur pour debug (ne pas exposer le détail au visiteur)
    console.error("[submitDemandeDevisAction] error:", error);
    return {
      success: false,
      error:
        "Impossible d'enregistrer ta demande. Réessaye dans quelques minutes ou écris-nous directement à contact@velito.fr.",
    };
  }

  // === Emails via Resend — best-effort : si ça échoue, la demande est déjà
  // enregistrée + la notif cloche est partie (trigger). On ne bloque pas le user.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const toBureau = process.env.VEA_CONTACT_TO ?? "contact@velito.fr";
    const fromEmail =
      process.env.VEA_CONTACT_FROM ?? "VEA <onboarding@resend.dev>";

    const prenom = escapeHtml(input.referent_prenom.trim());
    const structure = escapeHtml(input.structure_nom.trim());
    const clientEmail = input.email.trim().toLowerCase();
    const prestations = input.prestations_demandees.map(escapeHtml).join(", ");

    // 1) Alerte au bureau (avec reply_to = email du demandeur pour répondre direct)
    const htmlBureau = `
      <h2>Nouvelle demande de devis</h2>
      <p><strong>Structure :</strong> ${structure} (${escapeHtml(input.structure_type)})</p>
      <p><strong>Référent :</strong> ${prenom} ${escapeHtml(input.referent_nom.trim())}${
        input.referent_fonction
          ? " — " + escapeHtml(input.referent_fonction.trim())
          : ""
      }</p>
      <p><strong>Email :</strong> <a href="mailto:${escapeHtml(clientEmail)}">${escapeHtml(clientEmail)}</a><br/>
         <strong>Tel :</strong> ${escapeHtml(input.telephone.trim())}</p>
      <hr/>
      <p><strong>Prestations :</strong> ${prestations}</p>
      <p><strong>Pack :</strong> ${escapeHtml(input.pack_envisage)} &middot; <strong>Budget :</strong> ${escapeHtml(input.budget_envisage?.trim() || "—")}</p>
      <p><strong>Date souhaitée :</strong> ${escapeHtml(input.date_souhaitee)} &middot; <strong>Lieu :</strong> ${escapeHtml(input.lieu_ville.trim())}</p>
      <p><strong>Participants :</strong> ${Math.floor(input.nombre_participants)} &middot; <strong>Durée :</strong> ${Math.floor(input.duree_heures)}h</p>
      ${
        input.precisions
          ? `<p><strong>Précisions :</strong><br/>${escapeHtml(input.precisions.trim()).replace(/\n/g, "<br/>")}</p>`
          : ""
      }
    `;

    // 2) Accusé de réception au demandeur
    const htmlClient = `
      <p>Bonjour ${prenom},</p>
      <p>On a bien reçu ta demande concernant <strong>${structure}</strong>. Merci !</p>
      <p>L'équipe VEA revient vers toi sous 48 à 72h avec une proposition adaptée à ton besoin.</p>
      <p>À très vite,<br/>— L'équipe VEA · Velito Esport Amiens</p>
    `;

    try {
      await Promise.allSettled([
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [toBureau],
            reply_to: clientEmail,
            subject: `[VEA Devis] ${input.structure_nom.trim()}`,
            html: htmlBureau,
          }),
        }),
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [clientEmail],
            reply_to: toBureau,
            subject: "On a bien reçu ta demande — VEA",
            html: htmlClient,
          }),
        }),
      ]);
    } catch (e) {
      console.warn("[Resend] envoi emails devis échoué (non bloquant) :", e);
    }
  }

  return { success: true };
}
